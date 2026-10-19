// Reward policy and claim authorisation (PRD 6.6, 6.7, 7.3). Off unless REWARDS_ENABLED=true.
// Amounts are in the token's smallest unit, kept as decimal strings in SQLite (no float maths).
import { randomBytes } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import { keccak256, toHex, type Address, type Hex } from 'viem';

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
     id integer primary key autoincrement,
     session_id text not null unique references sessions(id),
     wallet text not null,
     season_id integer not null,
     game_id text not null,
     amount text not null,
     created_at integer not null,
     claim_nonce text
   )`,
  `create index if not exists earnings_wallet on earnings (wallet, season_id, claim_nonce)`,
  `create table if not exists claims (
     nonce text primary key,
     wallet text not null,
     season_id integer not null,
     amount text not null,
     expiry integer not null,
     signature text not null,
     status text not null default 'signed' check (status in ('signed', 'confirmed', 'expired')),
     tx_hash text,
     created_at integer not null,
     confirmed_at integer
   )`,
];

const sum = (rows: { amount: string }[]) => rows.reduce((t, r) => t + BigInt(r.amount), 0n);

/** Records what an accepted run earned, within the daily cap. Returns the amount (0n if nothing). */
export function recordEarning(
  db: DatabaseSync,
  policy: RewardPolicy,
  run: { sessionId: string; wallet: string; seasonId: number; gameId: string; score: number },
  now = Date.now(),
): bigint {
  if (!policy.enabled) return 0n;
  const min = policy.minScore[run.gameId];
  if (min === undefined || run.score < min) return 0n;
  const wallet = run.wallet.toLowerCase();
  const today = sum(
    db.prepare(`select amount from earnings where wallet = ? and created_at > ?`).all(wallet, now - 86_400_000) as { amount: string }[],
  );
  const room = policy.dailyCap - today;
  const amount = room < policy.perRun ? (room > 0n ? room : 0n) : policy.perRun;
  if (amount <= 0n) return 0n;
  db.prepare(`insert or ignore into earnings (session_id, wallet, season_id, game_id, amount, created_at) values (?, ?, ?, ?, ?, ?)`).run(
    run.sessionId, wallet, run.seasonId, run.gameId, amount.toString(), now,
  );
  return amount;
}

/** Releases earnings tied to claims that expired without being used on-chain. */
export function releaseExpired(db: DatabaseSync, isNonceUsed: (nonce: string) => Promise<boolean>, now = Date.now()) {
  const stale = db.prepare(`select nonce from claims where status = 'signed' and expiry * 1000 < ?`).all(now) as { nonce: string }[];
  return Promise.all(
    stale.map(async ({ nonce }) => {
      if (await isNonceUsed(nonce)) return; // used after all: leave it for confirmation
      db.prepare(`update claims set status = 'expired' where nonce = ? and status = 'signed'`).run(nonce);
      db.prepare(`update earnings set claim_nonce = null where claim_nonce = ?`).run(nonce);
    }),
  );
}

export function balances(db: DatabaseSync, wallet: string, seasonId: number) {
  const w = wallet.toLowerCase();
  const earned = sum(db.prepare(`select amount from earnings where wallet = ? and season_id = ?`).all(w, seasonId) as { amount: string }[]);
  const claimable = sum(
    db.prepare(`select amount from earnings where wallet = ? and season_id = ? and claim_nonce is null`).all(w, seasonId) as { amount: string }[],
  );
  const pending = sum(db.prepare(`select amount from claims where wallet = ? and season_id = ? and status = 'signed'`).all(w, seasonId) as { amount: string }[]);
  const claimed = sum(db.prepare(`select amount from claims where wallet = ? and season_id = ? and status = 'confirmed'`).all(w, seasonId) as { amount: string }[]);
  const history = (db
    .prepare(`select nonce, amount, status, tx_hash, created_at, confirmed_at, expiry from claims where wallet = ? order by created_at desc limit 20`)
    .all(w) as Record<string, unknown>[]).map((r) => ({
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
export function prepareClaim(
  db: DatabaseSync,
  args: { wallet: Address; seasonId: number; token: Address; walletRoom: bigint; poolRoom: bigint; ttlS: number },
  now = Date.now(),
): { claim: ClaimStruct; earningIds: number[] } | null {
  const w = args.wallet.toLowerCase();
  const rows = db
    .prepare(`select id, amount from earnings where wallet = ? and season_id = ? and claim_nonce is null order by id`)
    .all(w, args.seasonId) as { id: number; amount: string }[];
  const limit = args.walletRoom < args.poolRoom ? args.walletRoom : args.poolRoom;
  let amount = 0n;
  const ids: number[] = [];
  for (const r of rows) {
    const a = BigInt(r.amount);
    if (amount + a > limit) break;
    amount += a;
    ids.push(Number(r.id));
  }
  if (amount === 0n) return null;
  const nonce = toHex(randomBytes(32));
  return {
    earningIds: ids,
    claim: {
      wallet: args.wallet,
      seasonId: BigInt(args.seasonId),
      gameId: ALL_GAMES,
      token: args.token,
      amount,
      nonce,
      expiry: BigInt(Math.floor(now / 1000) + args.ttlS),
    },
  };
}

/** Stores a signed claim and reserves its earnings, atomically. */
export function saveClaim(db: DatabaseSync, prepared: { claim: ClaimStruct; earningIds: number[] }, signature: Hex, now = Date.now()) {
  const { claim, earningIds } = prepared;
  db.exec('begin');
  try {
    db.prepare(`insert into claims (nonce, wallet, season_id, amount, expiry, signature, created_at) values (?, ?, ?, ?, ?, ?, ?)`).run(
      claim.nonce, claim.wallet.toLowerCase(), Number(claim.seasonId), claim.amount.toString(), Number(claim.expiry), signature, now,
    );
    const mark = db.prepare(`update earnings set claim_nonce = ? where id = ? and claim_nonce is null`);
    for (const id of earningIds) {
      if (Number(mark.run(claim.nonce, id).changes) !== 1) throw new Error('earning already reserved');
    }
    db.exec('commit');
  } catch (e) {
    db.exec('rollback');
    throw e;
  }
}

export function confirmClaim(db: DatabaseSync, nonce: string, txHash: string, now = Date.now()) {
  return Number(
    db.prepare(`update claims set status = 'confirmed', tx_hash = ?, confirmed_at = ? where nonce = ? and status = 'signed'`).run(txHash, now, nonce)
      .changes,
  ) === 1;
}

