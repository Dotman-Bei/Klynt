import type { NextRequest } from 'next/server';
import { db } from '@/server/db';
import { json, walletOf } from '@/server/http';
import { rewardContext } from '@/server/rewardContext';
import { balances, releaseExpired } from '@/server/rewards';
import { currentSeason } from '@/server/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const s = (v: bigint) => v.toString();

export async function GET(req: NextRequest) {
  const season = currentSeason(db());
  if (!season) return json({ available: false, reason: 'No season is open.' });
  const ctx = await rewardContext(season.id);
  const wallet = walletOf(req);

  if (ctx.ok) await releaseExpired(db(), (n) => ctx.client.nonceUsed(n as `0x${string}`));
  const mine = wallet ? balances(db(), wallet, season.id) : null;

  return json({
    available: ctx.ok && !ctx.globalPaused && !ctx.season.paused,
    reason: !ctx.ok ? ctx.reason : ctx.globalPaused ? 'All claims are paused.' : ctx.season.paused ? 'Claims for this season are paused.' : null,
    season: ctx.ok
      ? {
          id: season.id,
          token: ctx.season.token,
          symbol: ctx.symbol,
          decimals: ctx.decimals,
          budget: s(ctx.season.budget),
          funded: s(ctx.season.funded),
          claimed: s(ctx.season.claimed),
          perWalletCap: s(ctx.season.perWalletCap),
          claimsUntil: Number(ctx.season.claimsUntil),
          paused: ctx.season.paused || ctx.globalPaused,
        }
      : null,
    policy: ctx.ok
      ? { perRun: s(ctx.policy.perRun), dailyCap: s(ctx.policy.dailyCap), minScore: ctx.policy.minScore }
      : null,
    me: mine
      ? {
          earned: s(mine.earned),
          claimable: s(mine.claimable),
          pending: s(mine.pending),
          claimed: s(mine.claimed),
          history: mine.history,
        }
      : null,
  });
}
