// Reward policy and claim authorisation (PRD 6.6, 6.7, 7.3). Off unless REWARDS_ENABLED=true.
// Amounts are in the token's smallest unit, kept as decimal strings (no float maths).
import { randomBytes } from 'node:crypto';
import { keccak256, toHex, type Address, type Hex } from 'viem';
import type { Db } from './db.ts';

export const REWARD_POLICY_VERSION = 1;

export type RewardPolicy = {
  enabled: boolean;
  /** Smallest score that earns, per game. (confirm) */
  minScore: Record<string, number>;
  /** Earned per qualifying accepted run, in base units. (confirm) */
  perRun: bigint;
  /** Most one wallet can earn in a rolling 24 hours, in base units. (confirm) */
  dailyCap: bigint;
  /** How long a signed claim stays valid. */
  authTtlS: number;
};

export function policyFromEnv(decimals = 18): RewardPolicy {
  const unit = 10n ** BigInt(decimals);
  const whole = (v: string | undefined, d: number) => BigInt(Math.max(0, Math.floor(Number(v ?? d) || 0))) * unit;
  return {
    enabled: process.env.REWARDS_ENABLED === 'true',
    minScore: { hextris: 500, 'tower-blocks': 10, astray: 1 },
    perRun: whole(process.env.REWARD_PER_RUN, 1),
    dailyCap: whole(process.env.REWARD_DAILY_CAP, 10),
    authTtlS: 24 * 60 * 60,
  };
}

export const migrations = [
  `create table if not exists earnings (
     id serial primary key,
     session_id text not null unique references sessions(id),
     wallet text not null,
     season_id integer not null,
     game_id text not null,
     amount text not null,
     created_at bigint not null,
     claim_nonce text
   )`,
  `create index if not exists earnings_wallet on earnings (wallet, season_id, claim_nonce)`,
  `create table if not exists claims (
     nonce text primary key,
     wallet text not null,
     season_id integer not null,
     amount text not null,
     expiry bigint not null,
     signature text not null,
     status text not null default 'signed' check (status in ('signed', 'confirmed', 'expired')),
     tx_hash text,
     created_at bigint not null,
     confirmed_at bigint
   )`,
];

const sum = (rows: { amount?: unknown }[]) => rows.reduce((t, r) => t + BigInt(String(r.amount)), 0n);

/** Records what an accepted run earned, within the daily cap. Returns the amount (0n if nothing). */
export async function recordEarning(
  db: Db,
  policy: RewardPolicy,
  run: { sessionId: string; wallet: string; seasonId: number; gameId: string; score: number },
  now = Date.now(),
): Promise<bigint> {
  if (!policy.enabled) return 0n;
  const min = policy.minScore[run.gameId];
  if (min === undefined || run.score < min) return 0n;
  const wallet = run.wallet.toLowerCase();
  // One wallet at a time, so two runs finishing together cannot both slip under the daily cap.
  return db.tx(async (t) => {
    await t.query(`select pg_advisory_xact_lock(hashtext($1))`, [`earn:${wallet}`]);
    const today = sum((await t.query(`select amount from earnings where wallet = $1 and created_at > $2`, [wallet, now - 86_400_000])).rows);
    const room = policy.dailyCap - today;
    const amount = room < policy.perRun ? (room > 0n ? room : 0n) : policy.perRun;
    if (amount <= 0n) return 0n;
    const ins = await t.query(
      `insert into earnings (session_id, wallet, season_id, game_id, amount, created_at) values ($1, $2, $3, $4, $5, $6) on conflict (session_id) do nothing`,
      [run.sessionId, wallet, run.seasonId, run.gameId, amount.toString(), now],
    );
    return ins.count === 1 ? amount : 0n;
  });
}

/** Releases earnings tied to claims that expired without being used on-chain. */
export async function releaseExpired(db: Db, isNonceUsed: (nonce: string) => Promise<boolean>, now = Date.now()) {
  const stale = (await db.query(`select nonce from claims where status = 'signed' and expiry * 1000 < $1`, [now])).rows;
  for (const { nonce } of stale) {
    if (await isNonceUsed(String(nonce))) continue; // used after all: leave it for confirmation
    await db.tx(async (t) => {
      const r = await t.query(`update claims set status = 'expired' where nonce = $1 and status = 'signed'`, [nonce]);
      if (r.count === 1) await t.query(`update earnings set claim_nonce = null where claim_nonce = $1`, [nonce]);
    });
  }
}

export async function balances(db: Db, wallet: string, seasonId: number) {
  const w = wallet.toLowerCase();
  const earned = sum((await db.query(`select amount from earnings where wallet = $1 and season_id = $2`, [w, seasonId])).rows);
  const claimable = sum(
    (await db.query(`select amount from earnings where wallet = $1 and season_id = $2 and claim_nonce is null`, [w, seasonId])).rows,
  );
  const pending = sum((await db.query(`select amount from claims where wallet = $1 and season_id = $2 and status = 'signed'`, [w, seasonId])).rows);
  const claimed = sum((await db.query(`select amount from claims where wallet = $1 and season_id = $2 and status = 'confirmed'`, [w, seasonId])).rows);
  const history = (
    await db.query(
      `select nonce, amount, status, tx_hash, created_at, confirmed_at, expiry from claims where wallet = $1 order by created_at desc limit 20`,
      [w],
    )
  ).rows.map((r) => ({
    nonce: String(r.nonce),
    amount: String(r.amount),
    status: String(r.status),
    txHash: r.tx_hash ? String(r.tx_hash) : null,
    createdAt: Number(r.created_at),
    confirmedAt: r.confirmed_at ? Number(r.confirmed_at) : null,
    expiry: Number(r.expiry),
  }));
  return { earned, claimable, pending, claimed, history };
}

export type ClaimStruct = {
  wallet: Address;
  seasonId: bigint;
  gameId: Hex;
  token: Address;
  amount: bigint;
  nonce: Hex;
  expiry: bigint;
};

export const claimTypes = {
  Claim: [
    { name: 'wallet', type: 'address' },
    { name: 'seasonId', type: 'uint256' },
    { name: 'gameId', type: 'bytes32' },
    { name: 'token', type: 'address' },
    { name: 'amount', type: 'uint256' },
    { name: 'nonce', type: 'bytes32' },
    { name: 'expiry', type: 'uint64' },
  ],
} as const;

export const vaultDomain = (chainId: number, vault: Address) => ({ name: 'Klynt Reward Vault', version: '1', chainId, verifyingContract: vault }) as const;

/** One claim covers several runs, so it carries the season's aggregate source rather than one game. */
export const ALL_GAMES = keccak256(toHex('klynt:all-games'));

/**
 * Bundles a wallet's unclaimed earnings into one claim, capped by what the vault can still pay
 * this wallet. Earnings beyond the cap stay unclaimed. The caller signs the returned struct.
 */
export async function prepareClaim(
  db: Db,
  args: { wallet: Address; seasonId: number; token: Address; walletRoom: bigint; poolRoom: bigint; ttlS: number },
  now = Date.now(),
): Promise<{ claim: ClaimStruct; earningIds: number[] } | null> {
  const w = args.wallet.toLowerCase();
  const rows = (
    await db.query(`select id, amount from earnings where wallet = $1 and season_id = $2 and claim_nonce is null order by id`, [w, args.seasonId])
  ).rows;
  const limit = args.walletRoom < args.poolRoom ? args.walletRoom : args.poolRoom;
  let amount = 0n;
  const ids: number[] = [];
  for (const r of rows) {
    const a = BigInt(String(r.amount));
    if (amount + a > limit) break;
    amount += a;
    ids.push(Number(r.id));
  }
  if (amount === 0n) return null;
  return {
    earningIds: ids,
    claim: {
      wallet: args.wallet,
      seasonId: BigInt(args.seasonId),
      gameId: ALL_GAMES,
      token: args.token,
      amount,
      nonce: toHex(randomBytes(32)),
      expiry: BigInt(Math.floor(now / 1000) + args.ttlS),
    },
  };
}

/** Stores a signed claim and reserves its earnings, atomically. Throws if any earning was already taken. */
export async function saveClaim(db: Db, prepared: { claim: ClaimStruct; earningIds: number[] }, signature: Hex, now = Date.now()) {
  const { claim, earningIds } = prepared;
  await db.tx(async (t) => {
    await t.query(
      `insert into claims (nonce, wallet, season_id, amount, expiry, signature, created_at) values ($1, $2, $3, $4, $5, $6, $7)`,
      [claim.nonce, claim.wallet.toLowerCase(), Number(claim.seasonId), claim.amount.toString(), Number(claim.expiry), signature, now],
    );
    for (const id of earningIds) {
      const r = await t.query(`update earnings set claim_nonce = $1 where id = $2 and claim_nonce is null`, [claim.nonce, id]);
      if (r.count !== 1) throw new Error('earning already reserved');
    }
  });
}

export async function confirmClaim(db: Db, nonce: string, txHash: string, now = Date.now()) {
  const r = await db.query(`update claims set status = 'confirmed', tx_hash = $1, confirmed_at = $2 where nonce = $3 and status = 'signed'`, [
    txHash, now, nonce,
  ]);
  return r.count === 1;
}
