'use client';

import Link from 'next/link';
import { useWallet } from '@/components/WalletButton';
import { live, useBoard } from '@/lib/api';
import { shortAddress } from '@/lib/chain';
import { formatScore, formatWhen } from '@/lib/practice';

/** The top of one game's board, on its detail page. */
export function GameBoard({ gameId, name, playable }: { gameId: string; name: string; playable: boolean }) {
  const ranked = live && playable;
  const board = useBoard(gameId, 5);
  const me = useWallet().address?.toLowerCase();
  const rows = ranked ? board.data?.rows ?? [] : [];
  const total = board.data?.total ?? 0;

  return (
    <section className="card span6" aria-labelledby="board-title">
      <div className="card__head">
        <h2 id="board-title" className="card__title">{name} leaderboard</h2>
        <span className="card__meta">
          {ranked ? (total ? <Link href="/leaderboard" className="text-action">View all {total}</Link> : 'Season 1 · open') : 'Season 1 · not started'}
        </span>
      </div>
      <table className="table table--flush">
        <thead>
          <tr>
            <th className="num rank-col">Rank</th>
            <th>Player</th>
            <th className="num">Best score</th>
            <th className="num">Runs</th>
            <th className="num">Last run</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.wallet} className={r.wallet === me ? 'is-you' : undefined}>
              <td className="num rank-col">{r.rank}</td>
              <td><span className="mono">{shortAddress(r.wallet)}</span>{r.wallet === me && <span className="you">You</span>}</td>
              <td className="num">{formatScore(r.best)}</td>
              <td className="num">{r.runs}</td>
              <td className="num muted">{formatWhen(new Date(r.lastRun).toISOString())}</td>
            </tr>
          ))}
          {rows.length === 0 && !(ranked && board.isLoading) && (
            <tr>
              <td colSpan={5}>
                <p className="empty empty--inline">
                  {!playable
                    ? `${name} has no leaderboard until it is playable.`
                    : !live
                      ? 'Ranked play opens when score checking goes live. Your practice runs are under Profile.'
                      : board.isError
                        ? 'Couldn’t load the board. Refresh to try again.'
                        : 'No ranked runs yet. Sign in with your wallet and play to set the first score.'}
                </p>
              </td>
            </tr>
          )}
          {ranked && board.isLoading && [0, 1, 2].map((i) => (
            <tr key={i} aria-hidden><td colSpan={5}><span className="skeleton" /></td></tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
