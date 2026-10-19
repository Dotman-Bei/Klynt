'use client';

import Link from 'next/link';
import { live, useRewardSummary } from '@/lib/api';

// Reward wording for server-rendered pages. Each reads the vault-backed summary, so a paused or
// unfunded season reads as off, and testnet points are always named as having no value.

export function GameRewardsCard({ gameId, playable }: { gameId: string; playable: boolean }) {
  const r = useRewardSummary();
  const min = r.minScore[gameId];
  const on = r.on && playable && min !== undefined;
  return (
    <section className="card span3" aria-labelledby="rewards-title">
      <div className="card__head">
        <h2 id="rewards-title" className="card__title">Rewards</h2>
        <span className={`pill${on ? ' pill--ranked' : ''}`}>{r.loading ? 'Checking…' : on ? 'On' : 'Off'}</span>
      </div>
      {on ? (
        <p>
          A ranked run scoring {min} or more earns {r.perRun} {r.symbol}, up to {r.dailyCap} a day.
          {r.isTest ? ' These are testnet points with no value.' : ''}
        </p>
      ) : (
        <p>Off this season. Rewards switch on when the reward vault is funded and switched on.</p>
      )}
      <p className="card__note"><Link href="/rewards" className="text-action">See the reward rules</Link></p>
    </section>
  );
}

export function GamesNote() {
  const r = useRewardSummary();
  if (!live) {
    return <>Practice runs are kept on this device. Ranked play opens when score checking goes live; until then no game is Ranked and nothing earns rewards.</>;
  }
  return (
    <>
      Sign in with your wallet to rank. Without it, runs are practice and stay on this device.{' '}
      {r.loading ? null : r.on ? `Qualifying ranked runs earn ${r.perRun} ${r.symbol}${r.isTest ? ' (testnet points, no value)' : ''}.` : 'Rewards are off this season.'}
    </>
  );
}

export function LeaderboardLine() {
  const r = useRewardSummary();
  if (!live) return <>Season 1 has not started. Ranks appear here when score checking goes live.</>;
  return (
    <>
      Season 1 is open. Best accepted score per wallet{r.loading ? '.' : ';'}{' '}
      {r.loading ? null : r.on ? `qualifying runs earn ${r.symbol}${r.isTest ? ' testnet points' : ''}.` : 'rewards are off.'}
    </>
  );
}

/** Home's caption under "Paid out so far": the figure is GGI, which is never paid until verified. */
export function PaidCaption() {
  const r = useRewardSummary();
  if (r.loading) return <>No GGI has been paid. Checking the reward vault…</>;
  if (r.on && r.isTest) {
    return (
      <>
        No GGI has been paid. Season 1 runs on testnet points with no value while the GGI contract is
        unverified. Nothing you play is owed GGI.
      </>
    );
  }
  return (
    <>
      Rewards are off. They switch on when the GGI contract is verified and the reward vault is funded. Until
      then, nothing you play is owed anything.
    </>
  );
}
