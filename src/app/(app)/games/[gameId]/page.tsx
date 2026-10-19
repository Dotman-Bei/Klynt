import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Thumb } from '@/components/app/GameList';
import { IconExternal } from '@/components/app/icons';
import { YourBest } from '@/components/app/YourBest';
import { games, getGame, isPlayable, statusLabel } from '@/data/games';

const Tick = () => (
  <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden><path d="M3 8.5l3.2 3L13 4.5" fill="none" stroke="currentColor" strokeWidth="2" /></svg>
);

function road(status: string, licence?: string): [string, boolean][] {
  if (status === 'on-hold') {
    return [
      ['A licence for the artwork, or original art', false],
      ['Hosted on Klynt with no ads or trackers', false],
      ['Score bridge added', false],
      ['Opens in Practice', false],
      ['Score rules published: minimum length and score ceiling', false],
      ['Opens for ranked play', false],
    ];
  }
  return [
    [`Open-source licence confirmed${licence ? ` (${licence})` : ''}`, true],
    ['Hosted on Klynt with no ads or trackers', false],
    ['Score bridge added', false],
    ['Opens in Practice', false],
    ['Score rules published: minimum length and score ceiling', false],
    ['Opens for ranked play', false],
  ];
}

export function generateStaticParams() {
  return games.map((g) => ({ gameId: g.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ gameId: string }> }): Promise<Metadata> {
  const { gameId } = await params;
  const g = getGame(gameId);
  return { title: g ? g.name : 'Game not found' };
}

export default async function GameDetails({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await params;
  const game = getGame(gameId);
  if (!game) notFound();
  const playable = isPlayable(game);

  return (
    <>
      <header className="object-head card">
        <Thumb game={game} size="cover" />
        <div className="object-head__text">
          <div className="object-head__name">
            <h1>{game.name}</h1>
            <span className={`pill pill--${game.availability}`}>{statusLabel[game.availability]}</span>
          </div>
          <p className="object-head__meta">
            {game.type}
            {game.credit && <> · by {game.credit.authors} · {game.credit.licence}</>}
          </p>
        </div>
        <div className="object-head__actions">
          {playable ? (
            <Link href={`/play/${game.id}`} className="btn btn--primary btn--wide">Play</Link>
          ) : (
            <p className="object-head__reason">
              {game.availability === 'on-hold' ? 'Not playable. Needs a licence for its art.' : 'Not playable yet. Integration is next.'}
            </p>
          )}
        </div>
      </header>

      <div className="grid6 detail-grid">
        {playable ? (
          <section className="card span4" aria-labelledby="how-title">
            <div className="card__head">
              <h2 id="how-title" className="card__title">How to play</h2>
            </div>
            <ol className="steps">
              {game.howToPlay.map((s) => <li key={s}>{s}</li>)}
            </ol>
            <dl className="kv kv--wide card__kv">
              <div><dt>Controls</dt><dd>{game.controls}</dd></div>
              <div><dt>Devices</dt><dd>{game.keyboardOnly ? 'Desktop with a keyboard. No touch controls.' : 'Desktop and phone'}</dd></div>
            </dl>
          </section>
        ) : (
          <section className="card span4" aria-labelledby="road-title">
            <div className="card__head">
              <h2 id="road-title" className="card__title">Road to ranked play</h2>
              <span className="card__meta">{statusLabel[game.availability]}</span>
            </div>
            <p>{game.reason}</p>
            <ul className="checklist">
              {road(game.availability, game.credit?.licence).map(([label, done]) => (
                <li key={label} className={done ? 'is-done' : undefined}>
                  <span className="checklist__mark" aria-hidden>{done ? <Tick /> : null}</span>
                  {label}
                  <span className="sr-only">{done ? ' (done)' : ' (to do)'}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="span2">
          <YourBest gameId={game.id} playable={playable} name={game.name} />
        </div>

        <section className="card span3" aria-labelledby="score-title">
          <div className="card__head">
            <h2 id="score-title" className="card__title">How it scores</h2>
          </div>
          <p>{game.scoring}</p>
          <p className="card__note">
            {playable
              ? 'Ranked by best accepted score in the season. Ties go to the earlier run.'
              : 'Scoring rules are published before a game opens for ranked play.'}
          </p>
        </section>

        <section className="card span3" aria-labelledby="rewards-title">
          <div className="card__head">
            <h2 id="rewards-title" className="card__title">Rewards</h2>
            <span className="pill">Off</span>
          </div>
          <p>Off this season. Rewards switch on when the GGI contract is verified and the reward vault is funded.</p>
          <p className="card__note"><Link href="/rewards" className="text-action">See the reward rules</Link></p>
        </section>

        <section className="card span6" aria-labelledby="board-title">
          <div className="card__head">
            <h2 id="board-title" className="card__title">{game.name} leaderboard</h2>
            <span className="card__meta">Season 1 · not started</span>
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
                    {playable
                      ? 'Ranked play opens when score checking goes live. Your practice runs are under Profile.'
                      : `${game.name} has no leaderboard until it is playable.`}
                  </p>
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        {game.credit && (
          <section className="card span6 credits" aria-labelledby="credits-title">
            <div className="card__head">
              <h2 id="credits-title" className="card__title">Credits</h2>
            </div>
            <dl className="kv kv--wide">
              <div><dt>Made by</dt><dd>{game.credit.authors}</dd></div>
              <div><dt>Licence</dt><dd>{game.credit.licence}</dd></div>
              <div>
                <dt>Source</dt>
                <dd>
                  <a href={game.credit.source} target="_blank" rel="noopener noreferrer" className="text-action ext">
                    {game.credit.source.replace('https://', '')} <IconExternal />
                  </a>
                </dd>
              </div>
              {game.credit.changes && <div><dt>What Klynt changed</dt><dd>{game.credit.changes}</dd></div>}
            </dl>
          </section>
        )}
      </div>
    </>
  );
}
