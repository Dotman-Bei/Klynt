import type { Metadata } from 'next';
import { Leaderboard } from '@/components/app/Leaderboard';
import { LeaderboardLine } from '@/components/app/RewardText';

export const metadata: Metadata = { title: 'Leaderboard' };

export default function LeaderboardPage() {
  return (
    <>
      <div className="title-row">
        <div>
          <h1>Leaderboard</h1>
          <p className="title-row__line">
            <LeaderboardLine />
          </p>
        </div>
      </div>
      <Leaderboard />
    </>
  );
}
