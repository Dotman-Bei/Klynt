import type { Metadata } from 'next';
import { GameList } from '@/components/app/GameList';
import { catalogueCounts } from '@/data/games';
import { service } from '@/lib/chain';

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
        {service.api
          ? 'Sign in with your wallet to rank. Without it, runs are practice and stay on this device. Rewards are off this season.'
          : 'Practice runs are kept on this device. Ranked play opens when score checking goes live; until then no game is Ranked and nothing earns rewards.'}
      </p>
    </>
  );
}
