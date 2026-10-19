import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { GameHost } from '@/components/app/GameHost';
import { Thumb } from '@/components/app/GameList';
import { IconBack } from '@/components/app/icons';
import { games, getGame, isPlayable, statusLabel } from '@/data/games';
import '@/styles/app.css';

export function generateStaticParams() {
  return games.map((g) => ({ gameId: g.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ gameId: string }> }): Promise<Metadata> {
  const { gameId } = await params;
  const g = getGame(gameId);
  return { title: g ? `Play ${g.name}` : 'Game not found' };
}

export default async function PlayPage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await params;
  const game = getGame(gameId);
  if (!game) notFound();

  if (!isPlayable(game) || !game.src) {
    return (
      <div className="play">
        <header className="play__bar">
          <Link href={`/games/${game.id}`} className="play__back"><IconBack /> <span>{game.name}</span></Link>
          <p className="play__status">{statusLabel[game.availability]}</p>
        </header>
        <div className="play__stage play__stage--closed">
          <div className="closed">
            <h1>{game.name} isn’t playable yet</h1>
            <p className="closed__reason">{game.reason}</p>
            <div className="closed__actions">
              <Link href={`/games/${game.id}`} className="btn btn--secondary">About {game.name}</Link>
              <Link href="/games" className="btn btn--secondary">All games</Link>
            </div>
            <section className="closed__alts" aria-labelledby="alts-title">
              <h2 id="alts-title">Play one of these instead</h2>
              <table className="table">
                <tbody>
                  {games.filter(isPlayable).map((g) => (
                    <tr key={g.id}>
                      <td>
                        <div className="game-cell">
                          <Thumb game={g} />
                          <div>
                            <Link href={`/games/${g.id}`} className="game-cell__name">{g.name}</Link>
                            <p className="game-cell__line">{g.line}</p>
                          </div>
                        </div>
                      </td>
                      <td className="num"><Link href={`/play/${g.id}`} className="btn btn--primary">Play</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </div>
        </div>
      </div>
    );
  }

  return <GameHost game={game} />;
}
