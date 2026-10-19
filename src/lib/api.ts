'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useSignMessage } from 'wagmi';
import { useWallet } from '@/components/WalletButton';
import { service } from './chain';

// Client for the score service. Everything here is inert when NEXT_PUBLIC_KLYNT_API is unset.

export const live = !!service.api;

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function api<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  if (!service.api) throw new ApiError(0, 'The score service is not connected.');
  const res = await fetch(`${service.api}${path}`, {
    method: init?.method ?? 'GET',
    headers: init?.body ? { 'content-type': 'application/json' } : undefined,
    body: init?.body ? JSON.stringify(init.body) : undefined,
    credentials: 'same-origin',
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new ApiError(res.status, data.error ?? 'Something went wrong. Try again.');
  return data;
}

export type Season = { id: number; name: string; state: string; startsAt: string; endsAt: string | null; rewards: string };
export type BoardRow = { rank: number; wallet: string; best: number; runs: number; lastRun: number };
export type Board = { season: Season | null; total: number; rows: BoardRow[] };
export type Me = {
  wallet: string;
  season: Season | null;
  accepted: number;
  rejected: number;
  games: Record<string, { best: number; at: number; rank: number | null }>;
  recent: { gameId: string; score: number; status: string; reason: string | null; durationMs: number; at: number }[];
};
export type SubmitResult =
  | { ok: true; status: 'accepted'; score: number; durationMs: number; rank: number; best: number; earned?: string; symbol?: string | null }
  | { ok: true; status: 'rejected'; score: number; durationMs: number; code: string; reason: string };

/** Who the server knows this browser as, checked against the wallet that is connected now. */
export function useAuth() {
  const w = useWallet();
  const qc = useQueryClient();
  const { signMessageAsync } = useSignMessage();
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const me = useQuery({
    queryKey: ['auth-me'],
    queryFn: () => api<{ wallet: string | null }>('/auth/me'),
    enabled: live,
    staleTime: 60_000,
  });
  const serverWallet = me.data?.wallet ?? null;
  const signedIn = !!serverWallet && !!w.address && serverWallet === w.address.toLowerCase();

  async function signIn() {
    if (!w.address) return;
    setSigning(true);
    setError(null);
    try {
      const { message } = await api<{ message: string }>(`/auth/nonce?address=${w.address}`);
      const signature = await signMessageAsync({ message });
      await api('/auth/verify', { method: 'POST', body: { message, signature } });
      await qc.invalidateQueries();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(/reject|denied/i.test(msg) ? 'Signature cancelled. Nothing was sent.' : msg);
    } finally {
      setSigning(false);
    }
  }

  async function signOut() {
    await api('/auth/logout', { method: 'POST' }).catch(() => {});
    await qc.invalidateQueries();
  }

  return { live, signedIn, serverWallet, signIn, signOut, signing, error, loading: me.isLoading };
}

export function useBoard(gameId: string, limit = 25, offset = 0) {
  return useQuery({
    queryKey: ['board', gameId, limit, offset],
    queryFn: () => api<Board>(`/leaderboard?game=${encodeURIComponent(gameId)}&limit=${limit}&offset=${offset}`),
    enabled: live,
    refetchInterval: 30_000,
  });
}

export function useMe(enabled: boolean) {
  return useQuery({ queryKey: ['me'], queryFn: () => api<Me>('/me'), enabled: live && enabled });
}

export type RewardsStatus = {
  available: boolean;
  reason: string | null;
  season: {
    id: number; token: `0x${string}`; symbol: string; decimals: number; budget: string; funded: string;
    claimed: string; perWalletCap: string; claimsUntil: number; paused: boolean;
  } | null;
  policy: { perRun: string; dailyCap: string; minScore: Record<string, number> } | null;
  me: {
    earned: string; claimable: string; pending: string; claimed: string;
    history: { nonce: string; amount: string; status: string; txHash: string | null; createdAt: number; confirmedAt: number | null; expiry: number }[];
  } | null;
};

export function useRewards() {
  return useQuery({ queryKey: ['rewards'], queryFn: () => api<RewardsStatus>('/rewards'), enabled: live, refetchInterval: 30_000 });
}

/** The reward state in words, for every place that mentions rewards. Never claims rewards are on unless the vault says so. */
export function useRewardSummary() {
  const r = useRewards();
  const d = r.data;
  const s = d?.season;
  const on = !!d?.available && !!s && !!d.policy;
  const whole = (v?: string) => (v && s ? Number(BigInt(v) / 10n ** BigInt(Math.max(0, s.decimals - 4))) / 10_000 : 0);
  const symbol = s?.symbol ?? (live && r.isLoading ? '' : 'GGI');
  const isTest = symbol === 'KTP-TEST';
  return {
    on,
    loading: live && r.isLoading,
    symbol,
    isTest,
    perRun: whole(d?.policy?.perRun),
    dailyCap: whole(d?.policy?.dailyCap),
    minScore: d?.policy?.minScore ?? {},
    /** One line for a game: what a run earns, or that rewards are off. */
    forGame(gameId: string) {
      if (live && r.isLoading) return 'Checking…';
      const min = d?.policy?.minScore[gameId];
      if (!on || min === undefined) return 'Off this season';
      return `${whole(d!.policy!.perRun)} ${symbol} a run scoring ${min}+`;
    },
  };
}
