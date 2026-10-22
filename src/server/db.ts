// Postgres everywhere. Production: Neon (DATABASE_URL), which works on serverless hosts such as Vercel.
// Local development and tests: PGlite, real Postgres compiled to WebAssembly, so the SQL is identical.
import type { PGlite } from '@electric-sql/pglite';
import { migrations as rewardMigrations } from './rewards.ts';

export type Row = Record<string, unknown>;
export interface Db {
  query<T extends Row = Row>(text: string, params?: unknown[]): Promise<{ rows: T[]; count: number }>;
  /** Runs fn in one transaction; any throw rolls everything back. */
  tx<T>(fn: (db: Db) => Promise<T>): Promise<T>;
}

const MIGRATIONS = [
  `create table if not exists seasons (
     id integer primary key,
     name text not null,
     state text not null check (state in ('scheduled', 'open', 'closed')),
     starts_at text not null,
     ends_at text,
     rewards text not null default 'off'
   )`,
  `create table if not exists auth_nonces (
     nonce text primary key,
     wallet text not null,
     created_at bigint not null,
     used boolean not null default false
   )`,
  `create table if not exists sessions (
     id text primary key,
     wallet text not null,
     game_id text not null,
     season_id integer not null references seasons(id),
     rules_version integer not null,
     started_at bigint not null,
     submitted_at bigint,
     score integer,
     status text not null default 'open' check (status in ('open', 'accepted', 'rejected')),
     reject_code text,
     reject_reason text
   )`,
  `create index if not exists sessions_board on sessions (game_id, season_id, status, score desc, submitted_at)`,
  `create index if not exists sessions_wallet on sessions (wallet, started_at)`,
  `create table if not exists submissions (
     id text primary key,
     created_at bigint not null,
     status text not null default 'pending' check (status in ('pending', 'changes', 'approved', 'rejected')),
     payload text not null,
     admin_notes text
   )`,
];

async function migrate(db: Db) {
  for (const m of [...MIGRATIONS, ...rewardMigrations]) await db.query(m);
  await db.query(
    `insert into seasons (id, name, state, starts_at, rewards) values (1, 'Season 1', 'open', $1, 'off') on conflict (id) do nothing`,
    [new Date().toISOString()],
  );
}

function fromPglite(pg: PGlite): Db {
  const wrap = (q: Pick<PGlite, 'query'>): Db => ({
    async query(text, params) {
      const r = await q.query<Row>(text, params);
      return { rows: r.rows as never[], count: r.affectedRows ?? r.rows.length };
    },
    tx: (fn) => pg.transaction((t) => fn(wrap(t))),
  });
  return wrap(pg);
}

async function fromNeon(url: string): Promise<Db> {
  const { Pool, neonConfig, types } = await import('@neondatabase/serverless');
  // Node 22 has a built-in WebSocket; Neon's pool uses it for transactions.
  if (globalThis.WebSocket) neonConfig.webSocketConstructor = globalThis.WebSocket as never;
  types.setTypeParser(20, (v: string) => Number(v)); // bigint columns hold millisecond times and counts
  const pool = new Pool({ connectionString: url });
  type Client = { query: (t: string, p?: unknown[]) => Promise<{ rows: Row[]; rowCount: number | null }> };
  const wrap = (c: Client): Db => ({
    async query(text, params) {
      const r = await c.query(text, params);
      return { rows: r.rows as never[], count: r.rowCount ?? r.rows.length };
    },
    async tx(fn) {
      const client = await pool.connect();
      try {
        await client.query('begin');
        const out = await fn(wrap(client));
        await client.query('commit');
        return out;
      } catch (e) {
        await client.query('rollback').catch(() => {});
        throw e;
      } finally {
        client.release();
      }
    },
  });
  return wrap(pool);
}

/** A fresh database. `memory` for tests; a directory path for a local PGlite; a postgres:// URL for Neon. */
export async function openDb(where: string): Promise<Db> {
  let db: Db;
  if (/^postgres(ql)?:\/\//.test(where)) {
    db = await fromNeon(where);
  } else {
    const { PGlite } = await import('@electric-sql/pglite');
    const pg = where === 'memory' ? new PGlite() : new PGlite(where);
    await pg.waitReady;
    db = fromPglite(pg);
  }
  await migrate(db);
  return db;
}

const g = globalThis as { __klyntDb?: Promise<Db> };

/**
 * The app's database: DATABASE_URL (Neon) when set, otherwise a local PGlite in KLYNT_DB_PATH
 * (default .data/pglite). Kept on globalThis because the dev server loads routes as separate modules.
 */
export function db(): Promise<Db> {
  g.__klyntDb ??= openDb(process.env.DATABASE_URL || process.env.KLYNT_DB_PATH || '.data/pglite').catch((e) => {
    g.__klyntDb = undefined;
    throw e;
  });
  return g.__klyntDb;
}
