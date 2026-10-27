// On-chain score records (contracts/src/KlyntScoreboard.sol). The server signs a record for one accepted
// run; the player sends it to the scoreboard and pays the gas. Uses the same attestor key as rewards.
import { createPublicClient, decodeEventLog, http, isAddressEqual, keccak256, toHex, type Address, type Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { botChain } from '../lib/chain.ts';
import { scoreboardAbi } from '../lib/scoreboardAbi.ts';
import type { Db } from './db.ts';

export type ScoreRecord = { wallet: Address; seasonId: bigint; gameId: Hex; score: bigint; runId: Hex; expiry: bigint };

export const recordTypes = {
  Record: [
    { name: 'wallet', type: 'address' },
    { name: 'seasonId', type: 'uint256' },
    { name: 'gameId', type: 'bytes32' },
    { name: 'score', type: 'uint64' },
    { name: 'runId', type: 'bytes32' },
    { name: 'expiry', type: 'uint64' },
  ],
} as const;

export const scoreboardDomain = (chainId: number, board: Address) =>
  ({ name: 'Klynt Scoreboard', version: '1', chainId, verifyingContract: board }) as const;

/** Public and stable: anyone can map a record back to its game and run. */
export const gameKey = (gameId: string) => keccak256(toHex(gameId));
export const runKey = (sessionId: string) => keccak256(toHex(`klynt:run:${sessionId}`));

export const RECORD_TTL_S = 60 * 60;

export type RunToRecord = { ok: true; record: ScoreRecord } | { ok: false; status: number; error: string };

/** The record for one of this wallet's accepted runs, or why it cannot be recorded. */
export async function recordForRun(db: Db, sessionId: string, wallet: string, now = Date.now()): Promise<RunToRecord> {
  const row = (
    await db.query(`select wallet, game_id, season_id, score, status, chain_tx from sessions where id = $1`, [sessionId])
  ).rows[0];
  if (!row || String(row.wallet) !== wallet.toLowerCase()) return { ok: false, status: 404, error: 'No such run for this wallet.' };
  if (row.status !== 'accepted') return { ok: false, status: 409, error: 'Only accepted runs can be recorded on BOT Chain.' };
  if (row.chain_tx) return { ok: false, status: 409, error: 'This run is already on BOT Chain.' };
  return {
    ok: true,
    record: {
      wallet: wallet as Address,
      seasonId: BigInt(Number(row.season_id)),
      gameId: gameKey(String(row.game_id)),
      score: BigInt(Number(row.score)),
      runId: runKey(sessionId),
      expiry: BigInt(Math.floor(now / 1000) + RECORD_TTL_S),
    },
  };
}

/** Saves the transaction once it has been checked on-chain. A run keeps its first transaction. */
export async function markRecorded(db: Db, sessionId: string, txHash: string) {
  const r = await db.query(`update sessions set chain_tx = $2 where id = $1 and chain_tx is null`, [sessionId, txHash]);
  return r.count === 1;
}

export type ScoreboardConfig = { board: Address; attestorKey: Hex; rpcUrl: string; chainId: number };

export function scoreboardConfig(): ScoreboardConfig | null {
  const board = process.env.NEXT_PUBLIC_SCOREBOARD as Address | undefined;
  const attestorKey = process.env.ATTESTOR_PRIVATE_KEY as Hex | undefined;
  if (!board || !attestorKey) return null;
  return { board, attestorKey, rpcUrl: process.env.REWARD_RPC_URL || botChain.rpcUrls.default.http[0], chainId: botChain.id };
}

export function scoreboardClient(cfg: ScoreboardConfig) {
  const client = createPublicClient({ transport: http(cfg.rpcUrl) });
  const attestor = privateKeyToAccount(cfg.attestorKey);

  return {
    attestorAddress: attestor.address,

    async attestorActive() {
      return client.readContract({ address: cfg.board, abi: scoreboardAbi, functionName: 'isSigner', args: [attestor.address] });
    },

    /** The contract's own digest; used to prove server and contract hash alike. */
    async hashOnChain(r: ScoreRecord) {
      return client.readContract({ address: cfg.board, abi: scoreboardAbi, functionName: 'hashRecord', args: [r] });
    },

    signRecord(r: ScoreRecord) {
      return attestor.signTypedData({ domain: scoreboardDomain(cfg.chainId, cfg.board), types: recordTypes, primaryType: 'Record', message: r });
    },

    /** True only for a successful transaction to the scoreboard that emitted ScoreRecorded for this run and wallet. */
    async recordTxMatches(txHash: Hex, runId: Hex, wallet: Address) {
      const receipt = await client.getTransactionReceipt({ hash: txHash }).catch(() => null);
      if (!receipt || receipt.status !== 'success' || !receipt.to || !isAddressEqual(receipt.to, cfg.board)) return false;
      for (const log of receipt.logs) {
        if (!isAddressEqual(log.address, cfg.board)) continue;
        try {
          const ev = decodeEventLog({ abi: scoreboardAbi, data: log.data, topics: log.topics });
          if (ev.eventName === 'ScoreRecorded' && ev.args.runId === runId && isAddressEqual(ev.args.wallet, wallet)) return true;
        } catch {
          // not a scoreboard event we know
        }
      }
      return false;
    },
  };
}
