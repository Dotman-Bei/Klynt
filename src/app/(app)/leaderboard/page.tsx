import type { Metadata } from 'next';
import { Leaderboard } from '@/components/app/Leaderboard';

export const metadata: Metadata = { title: 'Leaderboard' };

export default function LeaderboardPage() {
  return (
    <>
      <div className="title-row">
        <div>
          <h1>Leaderboard</h1>
          <p className="title-row__line">Season 1 has not started. Ranks appear here when score checking goes live.</p>
        </div>
      </div>
      <Leaderboard />
    </>
  );
}
