// SQLite storage through Node's built-in driver. One file, created on first use.
// For a hosted deployment, swap this module for Postgres; the store's SQL is plain.
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { migrations as rewardMigrations } from './rewards.ts';

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
     created_at integer not null,
     used integer not null default 0
   )`,
  `create table if not exists sessions (
     id text primary key,
     wallet text not null,
     game_id text not null,
     season_id integer not null references seasons(id),
     rules_version integer not null,
     started_at integer not null,
     submitted_at integer,
     score integer,
     status text not null default 'open' check (status in ('open', 'accepted', 'rejected')),
     reject_code text,
     reject_reason text
   )`,
  `create index if not exists sessions_board on sessions (game_id, season_id, status, score desc, submitted_at)`,
  `create index if not exists sessions_wallet on sessions (wallet, started_at)`,
  `create table if not exists submissions (
     id text primary key,
     created_at integer not null,
     status text not null default 'pending' check (status in ('pending', 'changes', 'approved', 'rejected')),
     payload text not null,
     admin_notes text
   )`,
];

export function openDb(file: string): DatabaseSync {
  if (file !== ':memory:') mkdirSync(dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec('pragma journal_mode = wal; pragma foreign_keys = on;');
  for (const m of [...MIGRATIONS, ...rewardMigrations]) db.exec(m);
  const season = db.prepare('select id from seasons where id = 1').get();
  if (!season) {
    db.prepare(`insert into seasons (id, name, state, starts_at, rewards) values (1, 'Season 1', 'open', ?, 'off')`).run(new Date().toISOString());
  }
  return db;
}

let shared: DatabaseSync | null = null;

/** The app's database. Path from KLYNT_DB_PATH, default .data/klynt.db. */
export function db(): DatabaseSync {
  if (!shared) shared = openDb(process.env.KLYNT_DB_PATH || '.data/klynt.db');
  return shared;
}
