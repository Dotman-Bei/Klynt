'use client';

import Link from 'next/link';
import { useState } from 'react';
import { games, isPlayable, statusLabel, type Game } from '@/data/games';
import { useRewardSummary } from '@/lib/api';

// The stage takes each game's own ground colour; the sheet inverts against it.
const stage: Record<string, { bg: string; dark: boolean }> = {
  hextris: { bg: '#ecf0f1', dark: false },
  'tower-blocks': { bg: '#d0cbc7', dark: false },
  astray: { bg: '#262321', dark: true },
  'radius-raid': { bg: '#0b0b0b', dark: true },
  coloron: { bg: '#45d6cd', dark: false },
  'fruit-ninja': { bg: '#ff4571', dark: false },
};

function Sheet({ game }: { game: Game }) {
  const playable = isPlayable(game);
  const rewards = useRewardSummary();
  const rows: [string, string][] = [
    ['Type', game.type],
    ['How it scores', game.scoring],
    ['Controls', game.controls],
    ['Leaderboard', game.availability === 'ranked' ? 'Season 1 · open' : playable ? 'Opens with score checking' : '—'],
    ['Rewards', playable ? rewards.forGame(game.id) : '—'],
  ];
  return (
    <div className="sheet" data-ui>
      <div className="sheet__head">
        <p className="sheet__name">{game.name}</p>
        <span className={`sheet__pill sheet__pill--${game.availability}`}>{statusLabel[game.availability]}</span>
      </div>
      <p className="sheet__line">{game.line}</p>
      <dl className="sheet__rows">
        {rows.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      <Link className="sheet__action" href={`/games/${game.id}`}>
        {playable ? `Play ${game.name}` : 'See it in the catalogue'}
      </Link>
    </div>
  );
}

export function Showcase() {
  const [active, setActive] = useState(games[0].id);
  const game = games.find((g) => g.id === active)!;
  const s = stage[game.id];

  return (
    <section className="showcase chapter" aria-labelledby="showcase-title" data-reveal>
      <div className="showcase__index" data-reveal-item style={{ ['--i' as string]: 0 }}>
        <h2 id="showcase-title" className="showcase__title">
          Six games
        </h2>
        <ul className="showcase__names" role="tablist" aria-label="Games in the catalogue">
          {games.map((g) => (
            <li key={g.id}>
              <button
                type="button"
                role="tab"
                aria-selected={g.id === active}
                aria-controls="showcase-stage"
                className="showcase__name"
                onClick={() => setActive(g.id)}
              >
                {g.name}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div
        id="showcase-stage"
        role="tabpanel"
        className={`showcase__stage${s.dark ? ' is-dark' : ''}`}
        style={{ background: s.bg }}
        data-reveal-item
      >
        <div className="showcase__card" key={game.id}>
          {game.clip ? (
            <figure className="shutter">
              <video src={game.clip} poster={game.shot} autoPlay muted loop playsInline width={1280} height={800} aria-label={`${game.name} in play`} />
            </figure>
          ) : game.shot ? (
            <figure className="shutter">
              <img src={game.shot} alt={`${game.name} in play`} width={1280} height={800} />
            </figure>
          ) : (
            <div className="showcase__noart">
              <p>No artwork shown</p>
            </div>
          )}
          <Sheet game={game} />
        </div>
      </div>
    </section>
  );
}
