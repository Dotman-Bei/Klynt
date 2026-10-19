import type { Metadata } from 'next';
import { Leaderboard } from '@/components/app/Leaderboard';
import { service } from '@/lib/chain';

export const metadata: Metadata = { title: 'Leaderboard' };

export default function LeaderboardPage() {
  return (
    <>
      <div className="title-row">
        <div>
          <h1>Leaderboard</h1>
          <p className="title-row__line">
            {service.api
              ? 'Season 1 is open. Best accepted score per wallet; rewards are off.'
              : 'Season 1 has not started. Ranks appear here when score checking goes live.'}
          </p>
        </div>
      </div>
      <Leaderboard />
    </>
  );
}
