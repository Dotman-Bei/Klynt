'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { formatDuration, formatScore, formatWhen, usePracticeRuns } from '@/lib/practice';

/** The visitor's practice record for one game, read from this device only. */
export function YourBest({ gameId, playable, name }: { gameId: string; playable: boolean; name: string }) {
  const all = usePracticeRuns();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const runs = mounted ? all.filter((r) => r.gameId === gameId) : [];
  const best = runs.reduce<(typeof runs)[number] | null>((b, r) => (!b || r.score > b.score ? r : b), null);

  return (
    <section className="card card--stretch" aria-labelledby="best-title">
      <div className="card__head">
        <h2 id="best-title" className="card__title">Your best</h2>
        <span className="card__meta">On this device</span>
      </div>
      <p className="figure num">{best ? formatScore(best.score) : <span className="dash">—</span>}</p>
      <dl className="kv">
        <div><dt>Practice runs</dt><dd className="num">{runs.length}</dd></div>
        <div><dt>Best run</dt><dd>{best ? formatWhen(best.endedAt) : '—'}</dd></div>
        <div><dt>Length</dt><dd className="num">{best ? formatDuration(best.durationMs) : '—'}</dd></div>
        <div><dt>Last run</dt><dd>{runs[0] ? formatWhen(runs[0].endedAt) : '—'}</dd></div>
        <div><dt>Ranked best</dt><dd>—</dd></div>
      </dl>
      <div className="card__foot">
        {playable ? (
          <Link href={`/play/${gameId}`} className="text-action">{runs.length ? 'Beat it' : `Play ${name}`}</Link>
        ) : (
          <span className="muted">Not playable yet</span>
        )}
      </div>
    </section>
  );
}
