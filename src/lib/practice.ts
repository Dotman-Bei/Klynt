'use client';

import { useSyncExternalStore } from 'react';

// Practice runs recorded by the score bridge. They live in this browser only and are never
// presented as ranked or validated (PRD 3.4: never fake sessions or scores).

export type PracticeRun = {
  id: string;
  gameId: string;
  score: number;
  durationMs: number;
  endedAt: string; // ISO
};

const KEY = 'klynt:practice-runs';
const EVENT = 'klynt:practice-change';
const EMPTY: PracticeRun[] = [];
let cache: { raw: string | null; runs: PracticeRun[] } = { raw: null, runs: EMPTY };

function read(): PracticeRun[] {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    return EMPTY;
  }
  if (raw === cache.raw) return cache.runs;
  let runs: PracticeRun[] = EMPTY;
  try {
    const parsed = raw ? JSON.parse(raw) : [];
    if (Array.isArray(parsed)) runs = parsed.filter((r) => r && typeof r.score === 'number' && typeof r.gameId === 'string');
  } catch {
    runs = EMPTY;
  }
  cache = { raw, runs };
  return runs;
}

function subscribe(cb: () => void) {
  const on = (e: StorageEvent | Event) => {
    if (!(e instanceof StorageEvent) || e.key === KEY) cb();
  };
  window.addEventListener('storage', on);
  window.addEventListener(EVENT, on);
  return () => {
    window.removeEventListener('storage', on);
    window.removeEventListener(EVENT, on);
  };
}

export function usePracticeRuns(): PracticeRun[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

export function addPracticeRun(run: Omit<PracticeRun, 'id' | 'endedAt'>): PracticeRun {
  const full: PracticeRun = {
    ...run,
    id: `run_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    endedAt: new Date().toISOString(),
  };
  try {
    const next = [full, ...read()].slice(0, 200);
    window.localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(EVENT));
  } catch {
    // Storage blocked (private mode): the run still shows on the result screen.
  }
  return full;
}

export function bestByGame(runs: PracticeRun[]) {
  const best = new Map<string, PracticeRun>();
  for (const r of runs) {
    const b = best.get(r.gameId);
    if (!b || r.score > b.score || (r.score === b.score && r.endedAt < b.endedAt)) best.set(r.gameId, r);
  }
  return best;
}

export const formatDuration = (ms: number) => {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s} s`;
  return `${Math.floor(s / 60)} min ${s % 60} s`;
};

export const formatScore = (n: number) => n.toLocaleString('en-GB');

export function formatWhen(iso: string, now = Date.now()) {
  const d = new Date(iso);
  const days = Math.floor((now - d.getTime()) / 86400000);
  const sameDay = new Date(now).toDateString() === d.toDateString();
  if (sameDay) return `Today, ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
  if (days < 2) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return d.toISOString().slice(0, 10);
}
