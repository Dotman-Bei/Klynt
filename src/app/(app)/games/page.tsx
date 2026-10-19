import type { Metadata } from 'next';
import { GameList } from '@/components/app/GameList';
import { catalogueCounts } from '@/data/games';
import { GamesNote } from '@/components/app/RewardText';

export const metadata: Metadata = { title: 'Games' };

export default function GamesPage() {
  const c = catalogueCounts();
  return (
    <>
      <div className="title-row">
        <div>
          <h1>Games</h1>
          <p className="title-row__line">
            {c.total} in the catalogue · {c.playable} playable · {c.ranked} ranked
          </p>
        </div>
      </div>
      <GameList />
      <p className="games-note">
        <GamesNote />
      </p>
    </>
  );
}
