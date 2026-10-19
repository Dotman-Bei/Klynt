'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { games, isPlayable, statusLabel, type Game } from '@/data/games';
import { IconChevron, IconSearch } from './icons';

type Tab = 'all' | 'playable' | 'coming-soon' | 'on-hold';

const tabs: { id: Tab; label: string; test: (g: Game) => boolean }[] = [
  { id: 'all', label: 'All', test: () => true },
  { id: 'playable', label: 'Playable', test: isPlayable },
  { id: 'coming-soon', label: 'Coming soon', test: (g) => g.availability === 'coming-soon' },
  { id: 'on-hold', label: 'On hold', test: (g) => g.availability === 'on-hold' },
];

export function Thumb({ game, size = 'row' }: { game: Game; size?: 'row' | 'cover' }) {
  if (!game.shot) return <span className={`thumb thumb--${size} thumb--blank`} aria-hidden />;
  return (
    <span className={`thumb thumb--${size}`} aria-hidden>
      <img src={game.shot} alt="" width={1280} height={800} style={{ objectPosition: game.focus ?? '50% 50%', transformOrigin: game.focus ?? '50% 50%' }} />
    </span>
  );
}

const order = { ranked: 0, practice: 1, 'coming-soon': 2, 'on-hold': 3 } as const;

export function GameList() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('all');
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const matches = (g: Game) => !q || g.name.toLowerCase().includes(q) || g.type.toLowerCase().includes(q);
  const rows = useMemo(
    () => games.filter(tabs.find((t) => t.id === tab)!.test).filter(matches).sort((a, b) => order[a.availability] - order[b.availability]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tab, q],
  );

  return (
    <>
      <div className="tabs" role="tablist" aria-label="Filter by status">
        {tabs.map((t) => (
          <button key={t.id} type="button" role="tab" className="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}>
            {t.label}
            <span className="num">{games.filter(t.test).filter(matches).length}</span>
          </button>
        ))}
      </div>
      <div className="toolbar">
        <label className="search">
          <IconSearch />
          <span className="sr-only">Search games</span>
          <input type="search" placeholder="Search games" value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
        <p className="toolbar__meta">
          {rows.length} {rows.length === 1 ? 'game' : 'games'} · sorted by status
        </p>
      </div>

      <table className="table games-table">
        <thead>
          <tr>
            <th>Game</th>
            <th className="col-type">Type</th>
            <th className="col-score">How it scores</th>
            <th className="col-board">Leaderboard</th>
            <th className="col-rewards">Rewards</th>
            <th>Status</th>
            <th aria-hidden />
          </tr>
        </thead>
        <tbody>
          {rows.map((g) => {
            const playable = isPlayable(g);
            return (
              <tr key={g.id} className="is-link" onClick={() => router.push(`/games/${g.id}`)}>
                <td>
                  <div className="game-cell">
                    <Thumb game={g} />
                    <div>
                      <Link href={`/games/${g.id}`} className="game-cell__name" onClick={(e) => e.stopPropagation()}>{g.name}</Link>
                      <p className="game-cell__line">{g.line}</p>
                      <p className="game-cell__sub">{g.type}</p>
                    </div>
                  </div>
                </td>
                <td className="col-type muted">{g.type}</td>
                <td className="col-score muted">{g.scoring}</td>
                <td className="col-board muted">{playable ? 'Opens with checking' : '—'}</td>
                <td className="col-rewards muted">{playable ? 'Off this season' : '—'}</td>
                <td><span className={`pill pill--${g.availability}`}>{statusLabel[g.availability]}</span></td>
                <td className="chev"><IconChevron /></td>
              </tr>
            );
          })}
          {rows.length === 0 && (
            <tr>
              <td colSpan={7}>
                <p className="empty" style={{ margin: '12px 0' }}>
                  No game called ‘{query}’. Try Hextris, Tower Blocks or Astray.
                </p>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </>
  );
}
