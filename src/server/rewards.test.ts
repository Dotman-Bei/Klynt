import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Db } from './db.ts';
import { balances, confirmClaim, prepareClaim, recordEarning, releaseExpired, saveClaim, type RewardPolicy } from './rewards.ts';
import { startSession, submitScore } from './store.ts';
import { freshDb } from './testDb.ts';

const A = '0x00000000000000000000000000000000000000aa' as const;
const TOKEN = '0x00000000000000000000000000000000000000ee' as const;
const T0 = 1_760_000_000_000;
const U = 10n ** 18n;

const policy: RewardPolicy = {
  enabled: true,
  minScore: { hextris: 500, 'tower-blocks': 10, astray: 1 },
  perRun: 1n * U,
  dailyCap: 3n * U,
  authTtlS: 86_400,
};

async function acceptedRun(db: Db, score: number, at: number, game = 'tower-blocks') {
  const s = await startSession(db, A, game, at);
  assert.ok(s.ok);
  const r = await submitScore(db, s.sessionId, A, score, at + 30_000);
  assert.equal(r.ok && r.status, 'accepted');
  return { sessionId: s.sessionId, wallet: A, seasonId: 1, gameId: game, score };
}

describe('earning', () => {
  it('earns nothing while rewards are off', async () => {
    const db = await freshDb();
    assert.equal(await recordEarning(db, { ...policy, enabled: false }, await acceptedRun(db, 20, T0), T0), 0n);
  });

  it('earns only at or above the game threshold', async () => {
    const db = await freshDb();
    assert.equal(await recordEarning(db, policy, await acceptedRun(db, 9, T0), T0), 0n);
    assert.equal(await recordEarning(db, policy, await acceptedRun(db, 10, T0 + 1), T0 + 1), U);
  });

  it('earns once per session', async () => {
    const db = await freshDb();
    const run = await acceptedRun(db, 20, T0);
    await recordEarning(db, policy, run, T0);
    await recordEarning(db, policy, run, T0 + 1);
    assert.equal((await balances(db, A, 1)).earned, U);
  });

  it('stops at the daily cap and resumes after 24 hours', async () => {
    const db = await freshDb();
    for (let i = 0; i < 5; i++) await recordEarning(db, policy, await acceptedRun(db, 20, T0 + i), T0 + i);
    assert.equal((await balances(db, A, 1)).earned, 3n * U);
    const later = T0 + 86_400_001;
    assert.equal(await recordEarning(db, policy, await acceptedRun(db, 20, later), later), U);
  });

  it('holds the daily cap when many runs finish at once', async () => {
    const db = await freshDb();
    const runs = [];
    for (let i = 0; i < 10; i++) runs.push(await acceptedRun(db, 20, T0 + i));
    const earned = await Promise.all(runs.map((r) => recordEarning(db, policy, r, T0 + 100)));
    assert.equal(earned.reduce((t, x) => t + x, 0n), 3n * U);
    assert.equal((await balances(db, A, 1)).earned, 3n * U);
  });
});

describe('claims', () => {
  async function withEarnings(n: number) {
    const db = await freshDb();
    for (let i = 0; i < n; i++) await recordEarning(db, policy, await acceptedRun(db, 20, T0 + i), T0 + i);
    return db;
  }

  it('bundles unclaimed earnings, capped by the room left on-chain', async () => {
    const db = await withEarnings(3);
    const p = (await prepareClaim(db, { wallet: A, seasonId: 1, token: TOKEN, walletRoom: 2n * U, poolRoom: 100n * U, ttlS: 3600 }, T0))!;
    assert.equal(p.claim.amount, 2n * U);
    assert.equal(p.earningIds.length, 2);
    assert.equal(p.claim.expiry, BigInt(Math.floor(T0 / 1000) + 3600));
  });

  it('signs nothing when the pool is empty or nothing is owed', async () => {
    const db = await withEarnings(1);
    assert.equal(await prepareClaim(db, { wallet: A, seasonId: 1, token: TOKEN, walletRoom: 5n * U, poolRoom: 0n, ttlS: 3600 }), null);
    const empty = await freshDb();
    assert.equal(await prepareClaim(empty, { wallet: A, seasonId: 1, token: TOKEN, walletRoom: 5n * U, poolRoom: 5n * U, ttlS: 3600 }), null);
  });

  it('reserves earnings so they cannot be put in two claims', async () => {
    const db = await withEarnings(2);
    const args = { wallet: A, seasonId: 1, token: TOKEN, walletRoom: 9n * U, poolRoom: 9n * U, ttlS: 3600 } as const;
    const first = (await prepareClaim(db, args, T0))!;
    const second = (await prepareClaim(db, args, T0))!; // prepared from the same rows before the first is saved
    await saveClaim(db, first, '0x01', T0);
    await assert.rejects(() => saveClaim(db, second, '0x02', T0));
    const b = await balances(db, A, 1);
    assert.deepEqual([b.claimable, b.pending], [0n, 2n * U]);
    const claims = (await db.query(`select count(*) as n from claims`)).rows[0];
    assert.equal(Number(claims.n), 1, 'the failed claim left nothing behind');
  });

  it('confirms a signed claim once', async () => {
    const db = await withEarnings(1);
    const p = (await prepareClaim(db, { wallet: A, seasonId: 1, token: TOKEN, walletRoom: 9n * U, poolRoom: 9n * U, ttlS: 3600 }, T0))!;
    await saveClaim(db, p, '0x01', T0);
    assert.equal(await confirmClaim(db, p.claim.nonce, '0xabc', T0 + 1), true);
    assert.equal(await confirmClaim(db, p.claim.nonce, '0xdef', T0 + 2), false);
    const b = await balances(db, A, 1);
    assert.deepEqual([b.claimed, b.pending, b.claimable], [U, 0n, 0n]);
  });

  it('releases an expired, unused claim and keeps a used one', async () => {
    const db = await withEarnings(2);
    const args = { wallet: A, seasonId: 1, token: TOKEN, walletRoom: U, poolRoom: 9n * U, ttlS: 60 } as const;
    const unused = (await prepareClaim(db, args, T0))!;
    await saveClaim(db, unused, '0x01', T0);
    const used = (await prepareClaim(db, args, T0))!;
    await saveClaim(db, used, '0x02', T0);
    await releaseExpired(db, async (n) => n === used.claim.nonce, T0 + 120_000);
    const b = await balances(db, A, 1);
    assert.equal(b.claimable, U, 'the unused claim went back to claimable');
    assert.equal(b.pending, U, 'the used one waits for confirmation');
    assert.equal(await confirmClaim(db, unused.claim.nonce, '0x9', T0 + 130_000), false, 'an expired claim is never confirmed');
  });
});
