// Score service data access. Every function takes the database so tests can use an in-memory one.
import { randomBytes } from 'node:crypto';
import type { Db } from './db.ts';
import { RULES_VERSION, checkRun, rules, type RejectCode } from './rules.ts';

export const newId = (prefix: string) => `${prefix}_${randomBytes(9).toString('base64url')}`;

export type Season = { id: number; name: string; state: string; startsAt: string; endsAt: string | null; rewards: string };

export async function currentSeason(db: Db): Promise<Season | null> {
  const { rows } = await db.query(`select * from seasons where state = 'open' order by id desc limit 1`);
  const row = rows[0];
  if (!row) return null;
  return {
    id: Number(row.id),
    name: String(row.name),
    state: String(row.state),
    startsAt: String(row.starts_at),
    endsAt: row.ends_at ? String(row.ends_at) : null,
    rewards: String(row.rewards),
  };
}

export type StartResult =
  | { ok: true; sessionId: string; seasonId: number; rulesVersion: number; startedAt: number }
  | { ok: false; status: number; error: string };

export async function startSession(db: Db, wallet: string, gameId: string, now = Date.now()): Promise<StartResult> {
  if (!rules[gameId]) return { ok: false, status: 400, error: 'This game is not open for ranked play.' };
  const season = await currentSeason(db);
  if (!season) return { ok: false, status: 409, error: 'No season is open.' };
  const id = newId('ses');
  await db.query(
    `insert into sessions (id, wallet, game_id, season_id, rules_version, started_at) values ($1, $2, $3, $4, $5, $6)`,
    [id, wallet.toLowerCase(), gameId, season.id, RULES_VERSION, now],
  );
  return { ok: true, sessionId: id, seasonId: season.id, rulesVersion: RULES_VERSION, startedAt: now };
}

export type SubmitResult =
  | { ok: true; status: 'accepted'; score: number; durationMs: number; rank: number; best: number }
  | { ok: true; status: 'rejected'; score: number; durationMs: number; code: RejectCode; reason: string }
  | { ok: false; status: number; error: string };

export async function submitScore(db: Db, sessionId: string, wallet: string, score: unknown, now = Date.now()): Promise<SubmitResult> {
  const s = (await db.query(`select * from sessions where id = $1`, [sessionId])).rows[0];
  if (!s) return { ok: false, status: 404, error: 'No such session.' };
  if (String(s.wallet) !== wallet.toLowerCase()) return { ok: false, status: 403, error: 'This session belongs to another wallet.' };
  if (s.status !== 'open') return { ok: false, status: 409, error: 'This session has already been submitted.' };

  const durationMs = now - Number(s.started_at);
  const gameId = String(s.game_id);
  const verdict = checkRun(gameId, score, durationMs);
  const value = typeof score === 'number' && Number.isFinite(score) ? Math.trunc(score) : null;
  const stored = value === null ? null : Math.max(-2_147_483_648, Math.min(2_147_483_647, value));

  // Mark the session used in the same statement that checks it is still open, so two parallel
  // submits cannot both succeed.
  const res = await db.query(
    `update sessions set submitted_at = $1, score = $2, status = $3, reject_code = $4, reject_reason = $5 where id = $6 and status = 'open'`,
    verdict.ok
      ? [now, stored, 'accepted', null, null, sessionId]
      : [now, stored, 'rejected', verdict.code, verdict.reason, sessionId],
  );
  if (res.count !== 1) return { ok: false, status: 409, error: 'This session has already been submitted.' };

  if (!verdict.ok) return { ok: true, status: 'rejected', score: value ?? 0, durationMs, code: verdict.code, reason: verdict.reason };
  const seasonId = Number(s.season_id);
  const best = (await bestFor(db, gameId, seasonId, wallet))!;
  return { ok: true, status: 'accepted', score: value!, durationMs, rank: (await rankOf(db, gameId, seasonId, wallet)) ?? 0, best: best.score };
}

// Ranking: each wallet's best accepted score in the season; ties go to the earlier run.
const BEST_PER_WALLET = `
  select wallet, score, submitted_at, runs from (
    select wallet, score, submitted_at,
      count(*) over (partition by wallet) as runs,
      row_number() over (partition by wallet order by score desc, submitted_at asc) as n
    from sessions where game_id = $1 and season_id = $2 and status = 'accepted'
  ) ranked where n = 1`;

export type BoardRow = { rank: number; wallet: string; best: number; runs: number; lastRun: number };

export async function leaderboard(db: Db, gameId: string, seasonId: number, offset = 0, limit = 25) {
  const lim = Math.min(Math.max(1, limit), 100);
  const total = Number((await db.query(`select count(*) as n from (${BEST_PER_WALLET}) b`, [gameId, seasonId])).rows[0].n);
  const { rows } = await db.query(
    `select b.wallet, b.score, b.submitted_at, b.runs,
       (select max(submitted_at) from sessions s where s.wallet = b.wallet and s.game_id = $1 and s.season_id = $2 and s.status = 'accepted') as last_run
     from (${BEST_PER_WALLET}) b
     order by b.score desc, b.submitted_at asc
     limit $3 offset $4`,
    [gameId, seasonId, lim, Math.max(0, offset)],
  );
  return {
    total,
    rows: rows.map<BoardRow>((r, i) => ({
      rank: offset + i + 1,
      wallet: String(r.wallet),
      best: Number(r.score),
      runs: Number(r.runs),
      lastRun: Number(r.last_run),
    })),
  };
}

export async function bestFor(db: Db, gameId: string, seasonId: number, wallet: string) {
  const r = (
    await db.query(
      `select score, submitted_at from sessions where game_id = $1 and season_id = $2 and wallet = $3 and status = 'accepted' order by score desc, submitted_at asc limit 1`,
      [gameId, seasonId, wallet.toLowerCase()],
    )
  ).rows[0];
  return r ? { score: Number(r.score), at: Number(r.submitted_at) } : null;
}

export async function rankOf(db: Db, gameId: string, seasonId: number, wallet: string): Promise<number | null> {
  const mine = await bestFor(db, gameId, seasonId, wallet);
  if (!mine) return null;
  const ahead = (
    await db.query(`select count(*) as n from (${BEST_PER_WALLET}) b where score > $3 or (score = $3 and submitted_at < $4)`, [
      gameId, seasonId, mine.score, mine.at,
    ])
  ).rows[0];
  return Number(ahead.n) + 1;
}

export async function playerSummary(db: Db, wallet: string) {
  const w = wallet.toLowerCase();
  const season = await currentSeason(db);
  const counts = (await db.query(`select status, count(*) as n from sessions where wallet = $1 group by status`, [w])).rows;
  const by = Object.fromEntries(counts.map((c) => [String(c.status), Number(c.n)]));
  const games: Record<string, { best: number; at: number; rank: number | null }> = {};
  if (season) {
    for (const gameId of Object.keys(rules)) {
      const b = await bestFor(db, gameId, season.id, w);
      if (b) games[gameId] = { best: b.score, at: b.at, rank: await rankOf(db, gameId, season.id, w) };
    }
  }
  const recent = (
    await db.query(
      `select game_id, score, status, reject_reason, started_at, submitted_at from sessions where wallet = $1 and status != 'open' order by submitted_at desc limit 10`,
      [w],
    )
  ).rows.map((r) => ({
    gameId: String(r.game_id),
    score: Number(r.score ?? 0),
    status: String(r.status),
    reason: r.reject_reason ? String(r.reject_reason) : null,
    durationMs: Number(r.submitted_at) - Number(r.started_at),
    at: Number(r.submitted_at),
  }));
  return { wallet: w, season, accepted: by.accepted ?? 0, rejected: by.rejected ?? 0, games, recent };
}

/** Sessions started by this wallet in the last window, for rate limiting. */
export async function recentSessionCount(db: Db, wallet: string, windowMs: number, now = Date.now()) {
  const r = await db.query(`select count(*) as n from sessions where wallet = $1 and started_at > $2`, [wallet.toLowerCase(), now - windowMs]);
  return Number(r.rows[0].n);
}

export async function createSubmission(db: Db, payload: Record<string, unknown>, now = Date.now()) {
  const id = newId('sub');
  await db.query(`insert into submissions (id, created_at, payload) values ($1, $2, $3)`, [id, now, JSON.stringify(payload)]);
  return { id, status: 'pending' as const };
}
