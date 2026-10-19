'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Game } from '@/data/games';
import { addPracticeRun, bestByGame, formatDuration, formatScore, usePracticeRuns, type PracticeRun } from '@/lib/practice';
import { IconBack } from './icons';

type State =
  | { kind: 'loading' }
  | { kind: 'ready' }
  | { kind: 'running' }
  | { kind: 'ended'; run: PracticeRun; previousBest: number | null }
  | { kind: 'failed' };

const LOAD_TIMEOUT_MS = 15000;

/** The score's path: where this run stands from game to chain. Only the first step is live today. */
function PathStrip() {
  const steps: [string, string, boolean][] = [
    ['Play', 'Run finished', true],
    ['Check', 'Not live yet', false],
    ['Rank', 'Season 1 not started', false],
    ['Claim', 'Rewards off', false],
  ];
  return (
    <ol className="path" aria-label="Where this run stands">
      {steps.map(([name, state, done]) => (
        <li key={name} className={done ? 'is-done' : undefined}>
          <span className="path__name">{name}</span>
          <span className="path__state">{state}</span>
        </li>
      ))}
    </ol>
  );
}

export function GameHost({ game }: { game: Game }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const [touchWarning, setTouchWarning] = useState(false);
  const runs = usePracticeRuns();
  const runsRef = useRef(runs);
  runsRef.current = runs;

  useEffect(() => {
    if (game.keyboardOnly && window.matchMedia('(pointer: coarse)').matches) setTouchWarning(true);
  }, [game.keyboardOnly]);

  useEffect(() => {
    setState({ kind: 'loading' });
    const timer = window.setTimeout(() => setState((s) => (s.kind === 'loading' ? { kind: 'failed' } : s)), LOAD_TIMEOUT_MS);
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.source !== frame.current?.contentWindow) return;
      const msg = e.data as { type?: string; score?: number; durationMs?: number };
      if (msg?.type === 'klynt:ready') {
        window.clearTimeout(timer);
        setState((s) => (s.kind === 'loading' ? { kind: 'ready' } : s));
      } else if (msg?.type === 'klynt:run-start') {
        setState({ kind: 'running' });
      } else if (msg?.type === 'klynt:run-end') {
        const previous = bestByGame(runsRef.current.filter((r) => r.gameId === game.id)).get(game.id);
        const run = addPracticeRun({ gameId: game.id, score: Math.max(0, Math.floor(msg.score ?? 0)), durationMs: Math.max(0, msg.durationMs ?? 0) });
        setState({ kind: 'ended', run, previousBest: previous ? previous.score : null });
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
  const status =
    state.kind === 'loading' ? 'Loading…'
    : state.kind === 'failed' ? 'Didn’t load'
    : state.kind === 'ended' ? 'Run over · saved on this device'
    : state.kind === 'running' ? 'Practice run · not submitted'
    : 'Ready · practice';

  return (
    <div className="play">
      <header className="play__bar">
        <Link href={`/games/${game.id}`} className="play__back">
          <IconBack /> <span>{game.name}</span>
        </Link>
        <p className="play__status" aria-live="polite">{status}</p>
        <div className="play__actions">
          <button type="button" className="btn btn--secondary" onClick={restart}>Restart</button>
          <button type="button" className="btn btn--secondary" onClick={endRun} disabled={state.kind !== 'running'}>End run</button>
        </div>
      </header>

      <div className="play__stage">
        <iframe
          key={attempt}
          ref={frame}
          className="play__frame"
          src={game.src}
          title={`${game.name}, playable game`}
          allow="autoplay; fullscreen"
          sandbox="allow-scripts allow-same-origin allow-pointer-lock"
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
                <h1 id="result-title" className="result__title">Run over</h1>
                <p className="result__score num">{formatScore(state.run.score)}</p>
                <p className="muted">
                  {formatDuration(state.run.durationMs)} ·{' '}
                  {state.previousBest === null
                    ? 'your first run on this device'
                    : state.run.score > state.previousBest
                      ? `new best on this device (was ${formatScore(state.previousBest)})`
                      : `best on this device: ${formatScore(best?.score ?? state.run.score)}`}
                </p>
              </div>
              <div className="play__panel-actions">
                <button type="button" className="btn btn--primary" onClick={restart}>Play again</button>
                <Link href={`/games/${game.id}`} className="btn btn--secondary">Back to {game.name}</Link>
              </div>
            </div>
            <PathStrip />
            <p className="result__note">
              Not submitted. Ranked play opens when score checking goes live. This run is saved on this device.
            </p>
          </section>
        )}
      </div>
      {state.kind !== 'ended' && <h1 className="sr-only">Playing {game.name}</h1>}
    </div>
  );
}
