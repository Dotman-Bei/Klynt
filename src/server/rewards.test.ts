import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { openDb } from './db.ts';
import { balances, confirmClaim, prepareClaim, recordEarning, releaseExpired, saveClaim, type RewardPolicy } from './rewards.ts';
import { startSession, submitScore } from './store.ts';

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

function acceptedRun(db: ReturnType<typeof openDb>, score: number, at: number, game = 'tower-blocks') {
  const s = startSession(db, A, game, at);
  assert.ok(s.ok);
  const r = submitScore(db, s.sessionId, A, score, at + 30_000);
  assert.equal(r.ok && r.status, 'accepted');
  return { sessionId: s.sessionId, wallet: A, seasonId: 1, gameId: game, score };
}

describe('earning', () => {
  it('earns nothing while rewards are off', () => {
    const db = openDb(':memory:');
    assert.equal(recordEarning(db, { ...policy, enabled: false }, acceptedRun(db, 20, T0), T0), 0n);
  });

  it('earns only at or above the game threshold', () => {
    const db = openDb(':memory:');
    assert.equal(recordEarning(db, policy, acceptedRun(db, 9, T0), T0), 0n);
    assert.equal(recordEarning(db, policy, acceptedRun(db, 10, T0 + 1), T0 + 1), U);
  });

  it('earns once per session', () => {
    const db = openDb(':memory:');
    const run = acceptedRun(db, 20, T0);
    recordEarning(db, policy, run, T0);
    recordEarning(db, policy, run, T0 + 1);
    assert.equal(balances(db, A, 1).earned, U);
  });

  it('stops at the daily cap and resumes after 24 hours', () => {
    const db = openDb(':memory:');
    for (let i = 0; i < 5; i++) recordEarning(db, policy, acceptedRun(db, 20, T0 + i), T0 + i);
    assert.equal(balances(db, A, 1).earned, 3n * U);
    const later = T0 + 86_400_001;
    assert.equal(recordEarning(db, policy, acceptedRun(db, 20, later), later), U);
  });
});

describe('claims', () => {
  function withEarnings(n: number) {
    const db = openDb(':memory:');
    for (let i = 0; i < n; i++) recordEarning(db, policy, acceptedRun(db, 20, T0 + i), T0 + i);
    return db;
  }

  it('bundles unclaimed earnings, capped by the room left on-chain', () => {
    const db = withEarnings(3);
    const p = prepareClaim(db, { wallet: A, seasonId: 1, token: TOKEN, walletRoom: 2n * U, poolRoom: 100n * U, ttlS: 3600 }, T0)!;
    assert.equal(p.claim.amount, 2n * U);
    assert.equal(p.earningIds.length, 2);
    assert.equal(p.claim.expiry, BigInt(Math.floor(T0 / 1000) + 3600));
  });

  it('signs nothing when the pool is empty or nothing is owed', () => {
    const db = withEarnings(1);
    assert.equal(prepareClaim(db, { wallet: A, seasonId: 1, token: TOKEN, walletRoom: 5n * U, poolRoom: 0n, ttlS: 3600 }), null);
    assert.equal(prepareClaim(openDb(':memory:'), { wallet: A, seasonId: 1, token: TOKEN, walletRoom: 5n * U, poolRoom: 5n * U, ttlS: 3600 }), null);
  });

  it('reserves earnings so they cannot be put in two claims', () => {
    const db = withEarnings(2);
    const args = { wallet: A, seasonId: 1, token: TOKEN, walletRoom: 9n * U, poolRoom: 9n * U, ttlS: 3600 } as const;
    const first = prepareClaim(db, args, T0)!;
    const second = prepareClaim(db, args, T0)!; // prepared from the same rows before the first is saved
    saveClaim(db, first, '0x01', T0);
    assert.throws(() => saveClaim(db, second, '0x02', T0));
    const b = balances(db, A, 1);
    assert.deepEqual([b.claimable, b.pending], [0n, 2n * U]);
  });

  it('confirms a signed claim once', () => {
    const db = withEarnings(1);
    const p = prepareClaim(db, { wallet: A, seasonId: 1, token: TOKEN, walletRoom: 9n * U, poolRoom: 9n * U, ttlS: 3600 }, T0)!;
    saveClaim(db, p, '0x01', T0);
    assert.equal(confirmClaim(db, p.claim.nonce, '0xabc', T0 + 1), true);
    assert.equal(confirmClaim(db, p.claim.nonce, '0xdef', T0 + 2), false);
    const b = balances(db, A, 1);
    assert.deepEqual([b.claimed, b.pending, b.claimable], [U, 0n, 0n]);
  });

  it('releases an expired, unused claim and keeps a used one', async () => {
    const db = withEarnings(2);
    const args = { wallet: A, seasonId: 1, token: TOKEN, walletRoom: U, poolRoom: 9n * U, ttlS: 60 } as const;
    const unused = prepareClaim(db, args, T0)!;
    saveClaim(db, unused, '0x01', T0);
    const used = prepareClaim(db, args, T0)!;
    saveClaim(db, used, '0x02', T0);
    await releaseExpired(db, async (n) => n === used.claim.nonce, T0 + 120_000);
    const b = balances(db, A, 1);
    assert.equal(b.claimable, U, 'the unused claim went back to claimable');
    assert.equal(b.pending, U, 'the used one waits for confirmation');
    assert.equal(confirmClaim(db, unused.claim.nonce, '0x9', T0 + 130_000), false, 'an expired claim is never confirmed');
  });
});
