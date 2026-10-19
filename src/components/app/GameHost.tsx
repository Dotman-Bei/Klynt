'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useWallet } from '@/components/WalletButton';
import type { Game } from '@/data/games';
import { api, useAuth, type SubmitResult } from '@/lib/api';
import { addPracticeRun, bestByGame, formatDuration, formatScore, usePracticeRuns, type PracticeRun } from '@/lib/practice';
import { IconBack } from './icons';

type Outcome =
  | { kind: 'practice' }
  | { kind: 'submitting' }
  | { kind: 'scored'; result: SubmitResult }
  | { kind: 'error'; message: string };

type State =
  | { kind: 'loading' }
  | { kind: 'ready' }
  | { kind: 'running' }
  | { kind: 'ended'; run: PracticeRun; previousBest: number | null; outcome: Outcome }
  | { kind: 'failed' };

// Generous: a slow connection is not a broken game. The iframe's load event usually lands first.
const LOAD_TIMEOUT_MS = 30000;

/** The score's path: where this run stands from game to chain. */
function PathStrip({ outcome }: { outcome: Outcome }) {
  const scored = outcome.kind === 'scored' ? outcome.result : null;
  const check: [string, 'done' | 'bad' | 'todo'] =
    outcome.kind === 'submitting' ? ['Checking…', 'todo']
    : scored?.status === 'accepted' ? ['Accepted', 'done']
    : scored?.status === 'rejected' ? ['Rejected', 'bad']
    : outcome.kind === 'error' ? ['Not checked', 'bad']
    : ['Not submitted', 'todo'];
  const rank: [string, 'done' | 'todo'] =
    scored?.status === 'accepted' ? [`Rank ${scored.rank} this season`, 'done'] : ['Not ranked', 'todo'];
  const earned = scored?.status === 'accepted' && scored.earned && BigInt(scored.earned) > 0n ? scored : null;
  const claim: [string, 'done' | 'todo'] = earned
    ? [`Earned ${Number(BigInt(earned.earned!) / 10n ** 14n) / 10_000} ${earned.symbol}`, 'done']
    : scored?.status === 'accepted' && scored.symbol
      ? ['Nothing earned this run', 'todo']
      : ['Rewards off', 'todo'];
  const steps: [string, string, string][] = [
    ['Play', 'Run finished', 'done'],
    ['Check', ...check],
    ['Rank', ...rank],
    ['Claim', ...claim],
  ];
  return (
    <ol className="path" aria-label="Where this run stands">
      {steps.map(([name, state, tone]) => (
        <li key={name} className={tone === 'done' ? 'is-done' : tone === 'bad' ? 'is-bad' : undefined}>
          <span className="path__name">{name}</span>
          <span className="path__state">{state}</span>
        </li>
      ))}
    </ol>
  );
}

function resultNote(outcome: Outcome) {
  switch (outcome.kind) {
    case 'submitting':
      return 'Sending the run to be checked…';
    case 'scored':
      return outcome.result.status === 'accepted'
        ? `Accepted and ranked. Your best this season is ${formatScore(outcome.result.best)}.${outcome.result.earned && BigInt(outcome.result.earned) > 0n ? ' Claim what you earned on the Rewards page.' : ''}`
        : `${outcome.result.reason} Rejected runs never rank.`;
    case 'error':
      return `${outcome.message} The run is saved on this device.`;
    default:
      return 'Practice run, not submitted. Sign in with your wallet to rank your next run. This one is saved on this device.';
  }
}

export function GameHost({ game }: { game: Game }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const [touchWarning, setTouchWarning] = useState(false);
  const [sessionNote, setSessionNote] = useState<string | null>(null);
  const runs = usePracticeRuns();
  const runsRef = useRef(runs);
  runsRef.current = runs;
  const w = useWallet();
  const auth = useAuth();
  const ranked = auth.live && game.availability === 'ranked';
  const rankedRef = useRef(false);
  rankedRef.current = ranked && auth.signedIn;
  const session = useRef<Promise<string | null> | null>(null);

  useEffect(() => {
    if (game.keyboardOnly && window.matchMedia('(pointer: coarse)').matches) setTouchWarning(true);
  }, [game.keyboardOnly]);

  useEffect(() => {
    setState({ kind: 'loading' });
    session.current = null;
    const timer = window.setTimeout(() => setState((s) => (s.kind === 'loading' ? { kind: 'failed' } : s)), LOAD_TIMEOUT_MS);

    const onMessage = async (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.source !== frame.current?.contentWindow) return;
      const msg = e.data as { type?: string; score?: number; durationMs?: number };
      if (msg?.type === 'klynt:ready') {
        window.clearTimeout(timer);
        setState((s) => (s.kind === 'loading' ? { kind: 'ready' } : s));
      } else if (msg?.type === 'klynt:run-start') {
        setState({ kind: 'running' });
        setSessionNote(null);
        // The server starts timing now. Its clock, not the game's, decides the run's length.
        session.current = rankedRef.current
          ? api<{ sessionId: string }>('/sessions', { method: 'POST', body: { gameId: game.id } })
              .then((r) => r.sessionId)
              .catch((err: Error) => {
                setSessionNote(`${err.message} This run is practice only.`);
                return null;
              })
          : null;
      } else if (msg?.type === 'klynt:run-end') {
        const previous = bestByGame(runsRef.current.filter((r) => r.gameId === game.id)).get(game.id);
        const score = Math.max(0, Math.floor(msg.score ?? 0));
        const run = addPracticeRun({ gameId: game.id, score, durationMs: Math.max(0, msg.durationMs ?? 0) });
        const pending = session.current;
        session.current = null;
        const base = { kind: 'ended' as const, run, previousBest: previous ? previous.score : null };
        if (!pending) {
          setState({ ...base, outcome: { kind: 'practice' } });
          return;
        }
        setState({ ...base, outcome: { kind: 'submitting' } });
        const sessionId = await pending;
        if (!sessionId) {
          setState({ ...base, outcome: { kind: 'practice' } });
          return;
        }
        try {
          const result = await api<SubmitResult>(`/sessions/${sessionId}/submit`, { method: 'POST', body: { score } });
          setState({ ...base, outcome: { kind: 'scored', result } });
        } catch (err) {
          setState({ ...base, outcome: { kind: 'error', message: err instanceof Error ? err.message : 'Submitting failed.' } });
        }
      }
    };
    window.addEventListener('message', onMessage);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('message', onMessage);
    };
  }, [game.id, attempt]);

  const restart = useCallback(() => setAttempt((a) => a + 1), []);
  const endRun = useCallback(() => {
    frame.current?.contentWindow?.postMessage({ type: 'klynt:end-request' }, window.location.origin);
  }, []);

  const best = bestByGame(runs.filter((r) => r.gameId === game.id)).get(game.id);
  const mode = rankedRef.current ? 'Ranked run' : 'Practice run · not submitted';
  const status =
    state.kind === 'loading' ? 'Loading…'
    : state.kind === 'failed' ? 'Didn’t load'
    : state.kind === 'ended' ? (state.outcome.kind === 'scored' ? 'Run over · checked' : 'Run over · saved on this device')
    : state.kind === 'running' ? mode
    : rankedRef.current ? 'Ready · ranked' : 'Ready · practice';

  return (
    <div className="play">
      <header className="play__bar">
        <Link href={`/games/${game.id}`} className="play__back">
          <IconBack /> <span>{game.name}</span>
        </Link>
        <p className="play__status" aria-live="polite">{sessionNote ?? status}</p>
        <div className="play__actions">
          {ranked && !auth.signedIn && state.kind !== 'running' && (
            w.isConnected ? (
              <button type="button" className="btn btn--primary" onClick={auth.signIn} disabled={auth.signing}>
                {auth.signing ? 'Check your wallet…' : 'Sign in to rank'}
              </button>
            ) : (
              <button type="button" className="btn btn--primary" onClick={w.connect} disabled={w.connecting}>
                Connect to rank
              </button>
            )
          )}
          <button type="button" className="btn btn--secondary" onClick={restart}>Restart</button>
          <button type="button" className="btn btn--secondary" onClick={endRun} disabled={state.kind !== 'running'}>End run</button>
        </div>
      </header>
      {auth.error && <p className="play__alert" role="alert">{auth.error}</p>}

      <div className="play__stage">
        <iframe
          key={attempt}
          ref={frame}
          className="play__frame"
          src={game.src}
          title={`${game.name}, playable game`}
          allow="autoplay; fullscreen"
          sandbox="allow-scripts allow-same-origin allow-pointer-lock"
          onLoad={() => setState((s) => (s.kind === 'loading' ? { kind: 'ready' } : s))}
        />

        {state.kind === 'loading' && (
          <div className="play__panel" role="status">
            <p className="play__panel-title">Loading {game.name}…</p>
            <p className="muted">{game.controls}</p>
          </div>
        )}

        {state.kind === 'failed' && (
          <div className="play__panel" role="alert">
            <p className="play__panel-title">{game.name} didn’t load.</p>
            <p className="muted">Check your connection and try again.</p>
            <div className="play__panel-actions">
              <button type="button" className="btn btn--primary" onClick={restart}>Retry</button>
              <Link href={`/games/${game.id}`} className="btn btn--secondary">Back to {game.name}</Link>
            </div>
          </div>
        )}

        {touchWarning && state.kind !== 'ended' && (
          <div className="play__panel" role="alert">
            <p className="play__panel-title">{game.name} needs a keyboard.</p>
            <p className="muted">It has no touch controls. On a phone, try Hextris or Tower Blocks.</p>
            <div className="play__panel-actions">
              <Link href="/play/hextris" className="btn btn--primary">Play Hextris</Link>
              <button type="button" className="btn btn--secondary" onClick={() => setTouchWarning(false)}>Try anyway</button>
            </div>
          </div>
        )}

        {state.kind === 'ended' && (
          <section className="play__panel play__panel--result" aria-labelledby="result-title">
            <div className="result">
              <div>
                <h1 id="result-title" className="result__title">
                  {state.outcome.kind === 'scored' ? (state.outcome.result.status === 'accepted' ? 'Accepted' : 'Rejected') : 'Run over'}
                </h1>
                <p className="result__score num">{formatScore(state.run.score)}</p>
                <p className="muted">
                  {formatDuration(state.outcome.kind === 'scored' ? state.outcome.result.durationMs : state.run.durationMs)} ·{' '}
                  {state.previousBest === null
                    ? 'your first run on this device'
                    : state.run.score > state.previousBest
                      ? `new best on this device (was ${formatScore(state.previousBest)})`
                      : `best on this device: ${formatScore(best?.score ?? state.run.score)}`}
                </p>
              </div>
              <div className="play__panel-actions">
                <button type="button" className="btn btn--primary" onClick={restart}>Play again</button>
                <Link href={ranked ? '/leaderboard' : `/games/${game.id}`} className="btn btn--secondary">
                  {ranked ? 'Leaderboard' : `Back to ${game.name}`}
                </Link>
              </div>
            </div>
            <PathStrip outcome={state.outcome} />
            <p className="result__note">{resultNote(state.outcome)}</p>
          </section>
        )}
      </div>
      {state.kind !== 'ended' && <h1 className="sr-only">Playing {game.name}</h1>}
    </div>
  );
}
