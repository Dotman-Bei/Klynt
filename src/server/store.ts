// Score service data access. Every function takes the database so tests can use :memory:.
import { randomBytes } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import { RULES_VERSION, checkRun, rules, type RejectCode } from './rules.ts';

export const newId = (prefix: string) => `${prefix}_${randomBytes(9).toString('base64url')}`;

export type Season = { id: number; name: string; state: string; startsAt: string; endsAt: string | null; rewards: string };

export function currentSeason(db: DatabaseSync): Season | null {
  const row = db.prepare(`select * from seasons where state = 'open' order by id desc limit 1`).get() as Record<string, unknown> | undefined;
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

export function startSession(db: DatabaseSync, wallet: string, gameId: string, now = Date.now()): StartResult {
  if (!rules[gameId]) return { ok: false, status: 400, error: 'This game is not open for ranked play.' };
  const season = currentSeason(db);
  if (!season) return { ok: false, status: 409, error: 'No season is open.' };
  const id = newId('ses');
  db.prepare(
    `insert into sessions (id, wallet, game_id, season_id, rules_version, started_at) values (?, ?, ?, ?, ?, ?)`,
  ).run(id, wallet.toLowerCase(), gameId, season.id, RULES_VERSION, now);
  return { ok: true, sessionId: id, seasonId: season.id, rulesVersion: RULES_VERSION, startedAt: now };
}

export type SubmitResult =
  | { ok: true; status: 'accepted'; score: number; durationMs: number; rank: number; best: number }
  | { ok: true; status: 'rejected'; score: number; durationMs: number; code: RejectCode; reason: string }
  | { ok: false; status: number; error: string };

export function submitScore(db: DatabaseSync, sessionId: string, wallet: string, score: unknown, now = Date.now()): SubmitResult {
  const s = db.prepare(`select * from sessions where id = ?`).get(sessionId) as Record<string, unknown> | undefined;
  if (!s) return { ok: false, status: 404, error: 'No such session.' };
  if (String(s.wallet) !== wallet.toLowerCase()) return { ok: false, status: 403, error: 'This session belongs to another wallet.' };
  if (s.status !== 'open') return { ok: false, status: 409, error: 'This session has already been submitted.' };

  const durationMs = now - Number(s.started_at);
  const gameId = String(s.game_id);
  const verdict = checkRun(gameId, score, durationMs);
  const value = typeof score === 'number' && Number.isFinite(score) ? Math.trunc(score) : null;

  // Mark the session used in the same statement that checks it is still open, so two parallel
  // submits cannot both succeed.
  const update = db.prepare(
    `update sessions set submitted_at = ?, score = ?, status = ?, reject_code = ?, reject_reason = ? where id = ? and status = 'open'`,
  );
  const res = verdict.ok
    ? update.run(now, value, 'accepted', null, null, sessionId)
    : update.run(now, value, 'rejected', verdict.code, verdict.reason, sessionId);
  if (Number(res.changes) !== 1) return { ok: false, status: 409, error: 'This session has already been submitted.' };

  if (!verdict.ok) return { ok: true, status: 'rejected', score: value ?? 0, durationMs, code: verdict.code, reason: verdict.reason };
  const seasonId = Number(s.season_id);
  const best = bestFor(db, gameId, seasonId, wallet)!;
  return { ok: true, status: 'accepted', score: value!, durationMs, rank: rankOf(db, gameId, seasonId, wallet) ?? 0, best: best.score };
}

// Ranking: each wallet's best accepted score in the season; ties go to the earlier run.
const BEST_PER_WALLET = `
  select wallet, score, submitted_at, runs from (
    select wallet, score, submitted_at,
      count(*) over (partition by wallet) as runs,
      row_number() over (partition by wallet order by score desc, submitted_at asc) as n
    from sessions where game_id = ? and season_id = ? and status = 'accepted'
  ) where n = 1`;

export type BoardRow = { rank: number; wallet: string; best: number; runs: number; lastRun: number };

export function leaderboard(db: DatabaseSync, gameId: string, seasonId: number, offset = 0, limit = 25) {
  const lim = Math.min(Math.max(1, limit), 100);
  const total = Number((db.prepare(`select count(*) as n from (${BEST_PER_WALLET})`).get(gameId, seasonId) as { n: number }).n);
  const rows = db
    .prepare(
      `select b.wallet, b.score, b.submitted_at, b.runs,
         (select max(submitted_at) from sessions s where s.wallet = b.wallet and s.game_id = ? and s.season_id = ? and s.status = 'accepted') as last_run
       from (${BEST_PER_WALLET}) b
       order by b.score desc, b.submitted_at asc
       limit ? offset ?`,
    )
    .all(gameId, seasonId, gameId, seasonId, lim, Math.max(0, offset)) as Record<string, unknown>[];
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

export function bestFor(db: DatabaseSync, gameId: string, seasonId: number, wallet: string) {
  const r = db
    .prepare(`select score, submitted_at from sessions where game_id = ? and season_id = ? and wallet = ? and status = 'accepted' order by score desc, submitted_at asc limit 1`)
    .get(gameId, seasonId, wallet.toLowerCase()) as Record<string, unknown> | undefined;
  return r ? { score: Number(r.score), at: Number(r.submitted_at) } : null;
}

export function rankOf(db: DatabaseSync, gameId: string, seasonId: number, wallet: string): number | null {
  const mine = bestFor(db, gameId, seasonId, wallet);
  if (!mine) return null;
  const ahead = db
    .prepare(`select count(*) as n from (${BEST_PER_WALLET}) where score > ? or (score = ? and submitted_at < ?)`)
    .get(gameId, seasonId, mine.score, mine.score, mine.at) as { n: number };
  return Number(ahead.n) + 1;
}

export function playerSummary(db: DatabaseSync, wallet: string) {
  const w = wallet.toLowerCase();
  const season = currentSeason(db);
  const counts = db
    .prepare(`select status, count(*) as n from sessions where wallet = ? group by status`)
    .all(w) as { status: string; n: number }[];
  const by = Object.fromEntries(counts.map((c) => [c.status, Number(c.n)]));
  const games: Record<string, { best: number; at: number; rank: number | null }> = {};
  if (season) {
    for (const gameId of Object.keys(rules)) {
      const b = bestFor(db, gameId, season.id, w);
      if (b) games[gameId] = { best: b.score, at: b.at, rank: rankOf(db, gameId, season.id, w) };
    }
  }
  const recent = (db
    .prepare(`select game_id, score, status, reject_reason, started_at, submitted_at from sessions where wallet = ? and status != 'open' order by submitted_at desc limit 10`)
    .all(w) as Record<string, unknown>[]).map((r) => ({
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
export function recentSessionCount(db: DatabaseSync, wallet: string, windowMs: number, now = Date.now()) {
  const r = db.prepare(`select count(*) as n from sessions where wallet = ? and started_at > ?`).get(wallet.toLowerCase(), now - windowMs) as { n: number };
  return Number(r.n);
}

export function createSubmission(db: DatabaseSync, payload: Record<string, unknown>, now = Date.now()) {
  const id = newId('sub');
  db.prepare(`insert into submissions (id, created_at, payload) values (?, ?, ?)`).run(id, now, JSON.stringify(payload));
  return { id, status: 'pending' as const };
}
