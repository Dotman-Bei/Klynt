import type { Metadata } from 'next';
import { GameList } from '@/components/app/GameList';
import { catalogueCounts } from '@/data/games';

export const metadata: Metadata = { title: 'Games' };

export default function GamesPage() {
  const c = catalogueCounts();
  return (
    <>
      <div className="title-row">
        <div>
          <h1>Games</h1>
          <p className="title-row__line">
            {c.total} in the catalogue · {c.playable} playable in Practice · {c.ranked} ranked yet
          </p>
        </div>
      </div>
      <GameList />
      <p className="games-note">
        Practice runs are kept on this device. Ranked play opens when score checking goes live; until then no
        game is Ranked and nothing earns rewards.
      </p>
    </>
  );
}
