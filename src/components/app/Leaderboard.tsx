'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { games, isPlayable } from '@/data/games';
import { botChain } from '@/lib/chain';
import { bestByGame, formatScore, formatWhen, usePracticeRuns } from '@/lib/practice';
import { Thumb } from './GameList';

const boards = games.filter(isPlayable);

export function Leaderboard() {
  const [gameId, setGameId] = useState(boards[0].id);
  const game = boards.find((g) => g.id === gameId)!;
  const runs = usePracticeRuns();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const best = bestByGame(mounted ? runs : []);

  return (
    <>
      <div className="scope-row">
        <div className="segmented" role="tablist" aria-label="Game">
          {boards.map((g) => (
            <button key={g.id} type="button" role="tab" aria-selected={g.id === gameId} onClick={() => setGameId(g.id)}>
              {g.name}
            </button>
          ))}
        </div>
        <label className="select">
          <span className="sr-only">Season</span>
          <select defaultValue="1">
            <option value="1">Season 1 · not started</option>
          </select>
        </label>
      </div>

      <div className="with-rail">
        <div className="stack">
          <section className="card" aria-labelledby="board-title">
            <div className="card__head">
              <h2 id="board-title" className="card__title">{game.name} · Season 1</h2>
              <span className="card__meta">Best accepted score</span>
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
                <tr>
                  <td colSpan={5}>
                    <p className="empty empty--inline">
                      No ranked runs yet. Ranked play opens when score checking goes live, and accepted scores appear here
                      with the wallet that played them.
                    </p>
                  </td>
                </tr>
              </tbody>
            </table>
          </section>

          <section className="card" aria-labelledby="season-title">
            <div className="card__head">
              <h2 id="season-title" className="card__title">Season 1</h2>
              <span className="pill">Not started</span>
            </div>
            <dl className="kv">
              <div><dt>Dates</dt><dd>Not scheduled</dd></div>
              <div><dt>Games with a board</dt><dd className="num">{boards.length}</dd></div>
              <div><dt>Ranked players</dt><dd className="num">0</dd></div>
              <div><dt>Ranked by</dt><dd>Best accepted score</dd></div>
              <div><dt>Score checking</dt><dd>Not live</dd></div>
              <div><dt>Network</dt><dd>{botChain.name} ({botChain.id})</dd></div>
              <div><dt>Rewards</dt><dd>Off · <Link href="/rewards" className="text-action">why</Link></dd></div>
            </dl>
          </section>
        </div>

        <div className="stack">
          <section className="card" aria-labelledby="mine-title">
            <div className="card__head">
              <h2 id="mine-title" className="card__title">Your practice bests</h2>
              <span className="card__meta">On this device</span>
            </div>
            <ul className="mini-list">
              {boards.map((g) => {
                const b = best.get(g.id);
                return (
                  <li key={g.id}>
                    <Thumb game={g} />
                    <div className="mini-list__text">
                      <p className="mini-list__name">{g.name}</p>
                      <p className="mini-list__sub">{b ? formatWhen(b.endedAt) : 'No runs yet'}</p>
                    </div>
                    <p className="mini-list__value num">{b ? formatScore(b.score) : '—'}</p>
                    <Link href={`/play/${g.id}`} className="text-action">Play</Link>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="card" id="rules" aria-labelledby="rules-title">
            <div className="card__head">
              <h2 id="rules-title" className="card__title">How ranks work</h2>
            </div>
            <ul className="rules">
              <li>Each game has its own board. Klynt never adds Hextris points to Tower Blocks blocks.</li>
              <li>Your rank is your best accepted score in the season.</li>
              <li>Ties go to the earlier run.</li>
              <li>Rejected runs never rank. Practice runs never rank.</li>
            </ul>
          </section>
        </div>
      </div>
    </>
  );
}
