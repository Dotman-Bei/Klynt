import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { issueNonce, sessionToken, verifySignIn, walletFromToken } from './auth.ts';
import { openDb } from './db.ts';
import { checkRun } from './rules.ts';
import { createSubmission, leaderboard, playerSummary, rankOf, startSession, submitScore } from './store.ts';

const A = '0x00000000000000000000000000000000000000aa';
const B = '0x00000000000000000000000000000000000000bb';
const C = '0x00000000000000000000000000000000000000cc';
const T0 = 1_760_000_000_000;

function play(db: ReturnType<typeof openDb>, wallet: string, game: string, score: unknown, ms: number, at = T0) {
  const s = startSession(db, wallet, game, at);
  assert.ok(s.ok);
  return submitScore(db, s.sessionId, wallet, score, at + ms);
}

describe('checkRun', () => {
  it('accepts a plausible run', () => assert.deepEqual(checkRun('hextris', 1340, 216_000), { ok: true }));
  it('rejects runs faster than the minimum', () => assert.equal((checkRun('hextris', 10, 5_000) as { code: string }).code, 'too-fast'));
  it('rejects scores over the ceiling for the time played', () => assert.equal((checkRun('tower-blocks', 100, 6_000) as { code: string }).code, 'over-ceiling'));
  it('applies the absolute cap', () => {
    assert.equal((checkRun('astray', 201, 3_600_000) as { code: string }).code, 'over-ceiling');
    assert.deepEqual(checkRun('astray', 200, 3_600_000), { ok: true });
  });
  it('rejects negative, fractional and non-numeric scores', () => {
    for (const s of [-1, 1.5, '12', null, Number.NaN]) assert.equal((checkRun('hextris', s, 60_000) as { code: string }).code, 'bad-score');
  });
  it('rejects games with no ranked rules', () => assert.equal((checkRun('fruit-ninja', 1, 60_000) as { code: string }).code, 'unknown-game'));
  it('rejects runs submitted after two hours', () => assert.equal((checkRun('hextris', 10, 2 * 3600_000 + 1) as { code: string }).code, 'too-slow'));
});

describe('sessions', () => {
  it('accepts a valid run and ranks it', () => {
    const db = openDb(':memory:');
    const r = play(db, A, 'hextris', 1340, 216_000);
    assert.equal(r.ok && r.status, 'accepted');
    assert.equal(r.ok && r.status === 'accepted' && r.rank, 1);
  });

  it('measures duration on the server, not from the client', () => {
    const db = openDb(':memory:');
    const r = play(db, A, 'hextris', 500, 3_000);
    assert.equal(r.ok && r.status === 'rejected' && r.code, 'too-fast');
  });

  it('rejects a second submit of the same session', () => {
    const db = openDb(':memory:');
    const s = startSession(db, A, 'tower-blocks', T0);
    assert.ok(s.ok);
    assert.equal((submitScore(db, s.sessionId, A, 20, T0 + 30_000) as { status: string }).status, 'accepted');
    const again = submitScore(db, s.sessionId, A, 25, T0 + 31_000);
    assert.deepEqual([again.ok, !again.ok && again.status], [false, 409]);
  });

  it('rejects a submit from another wallet', () => {
    const db = openDb(':memory:');
    const s = startSession(db, A, 'tower-blocks', T0);
    assert.ok(s.ok);
    const r = submitScore(db, s.sessionId, B, 10, T0 + 30_000);
    assert.deepEqual([r.ok, !r.ok && r.status], [false, 403]);
  });

  it('rejects unknown sessions and games without rules', () => {
    const db = openDb(':memory:');
    assert.equal((submitScore(db, 'ses_nope', A, 1, T0) as { status: number }).status, 404);
    assert.equal(startSession(db, A, 'fruit-ninja').ok, false);
  });

  it('records the rejection reason', () => {
    const db = openDb(':memory:');
    play(db, A, 'tower-blocks', 999, 10_000);
    const row = db.prepare(`select status, reject_code from sessions`).get() as { status: string; reject_code: string };
    assert.deepEqual([row.status, row.reject_code], ['rejected', 'over-ceiling']);
  });
});

describe('leaderboard', () => {
  it('ranks best accepted score per wallet, ties to the earlier run, rejected runs excluded', () => {
    const db = openDb(':memory:');
    play(db, A, 'tower-blocks', 20, 30_000, T0);
    play(db, A, 'tower-blocks', 30, 30_000, T0 + 60_000); // A's best: 30
    play(db, B, 'tower-blocks', 30, 30_000, T0 + 120_000); // ties A, later
    play(db, C, 'tower-blocks', 40, 30_000, T0 + 180_000);
    play(db, C, 'tower-blocks', 900, 30_000, T0 + 240_000); // rejected: over ceiling
    const board = leaderboard(db, 'tower-blocks', 1);
    assert.equal(board.total, 3);
    assert.deepEqual(board.rows.map((r) => [r.rank, r.wallet, r.best, r.runs]), [
      [1, C, 40, 1],
      [2, A, 30, 2],
      [3, B, 30, 1],
    ]);
    assert.equal(rankOf(db, 'tower-blocks', 1, B), 3);
  });

  it('keeps games on separate boards', () => {
    const db = openDb(':memory:');
    play(db, A, 'hextris', 1000, 60_000);
    play(db, B, 'tower-blocks', 10, 30_000);
    assert.equal(leaderboard(db, 'hextris', 1).total, 1);
    assert.equal(leaderboard(db, 'astray', 1).total, 0);
  });

  it('pages with an offset and keeps ranks continuous', () => {
    const db = openDb(':memory:');
    for (let i = 0; i < 30; i++) play(db, `0x${String(i).padStart(40, '0')}`, 'tower-blocks', 10 + i, 30_000, T0 + i);
    const page2 = leaderboard(db, 'tower-blocks', 1, 25);
    assert.deepEqual([page2.total, page2.rows.length, page2.rows[0].rank], [30, 5, 26]);
  });

  it('summarises a player', () => {
    const db = openDb(':memory:');
    play(db, A, 'hextris', 1000, 60_000);
    play(db, A, 'hextris', 5, 1_000);
    const p = playerSummary(db, A);
    assert.deepEqual([p.accepted, p.rejected, p.games.hextris.best, p.games.hextris.rank], [1, 1, 1000, 1]);
  });

  it('stores game submissions as pending', () => {
    const db = openDb(':memory:');
    const s = createSubmission(db, { name: 'Orbit Drop' });
    assert.equal(s.status, 'pending');
    assert.equal((db.prepare(`select status from submissions where id = ?`).get(s.id) as { status: string }).status, 'pending');
  });
});

describe('sign-in', () => {
  const account = privateKeyToAccount(generatePrivateKey()); // throwaway test key

  it('accepts a correct signature once', async () => {
    const db = openDb(':memory:');
    const message = issueNonce(db, account.address, 968)!;
    const signature = await account.signMessage({ message });
    const first = await verifySignIn(db, message, signature, 968);
    assert.deepEqual(first, { ok: true, wallet: account.address.toLowerCase() });
    const replay = await verifySignIn(db, message, signature, 968);
    assert.equal(replay.ok, false);
  });

  it('rejects a signature from another wallet', async () => {
    const db = openDb(':memory:');
    const other = privateKeyToAccount(generatePrivateKey());
    const message = issueNonce(db, account.address, 968)!;
    const signature = await other.signMessage({ message });
    assert.equal((await verifySignIn(db, message, signature, 968)).ok, false);
  });

  it('rejects a message for another chain or an edited message', async () => {
    const db = openDb(':memory:');
    const message = issueNonce(db, account.address, 968)!;
    const signature = await account.signMessage({ message });
    assert.equal((await verifySignIn(db, message, signature, 677)).ok, false);
    const edited = message.replace('costs nothing', 'costs nothing!');
    assert.equal((await verifySignIn(db, edited, await account.signMessage({ message: edited }), 968)).ok, false);
  });

  it('rejects an expired nonce', async () => {
    const db = openDb(':memory:');
    const message = issueNonce(db, account.address, 968, T0)!;
    const signature = await account.signMessage({ message });
    assert.equal((await verifySignIn(db, message, signature, 968, T0 + 11 * 60_000)).ok, false);
  });

  it('round-trips the session cookie and rejects tampering and expiry', () => {
    const token = sessionToken(A, T0);
    assert.equal(walletFromToken(token, T0 + 1000), A);
    assert.equal(walletFromToken(token.slice(0, -2) + 'xx', T0), null);
    assert.equal(walletFromToken(token, T0 + 8 * 24 * 3600_000), null);
    const [, mac] = token.split('.');
    const forged = Buffer.from(JSON.stringify({ w: B, exp: 9e9 })).toString('base64url') + '.' + mac;
    assert.equal(walletFromToken(forged, T0), null);
  });
});
