// Everything a reward route needs, read once and cached briefly. Returns why rewards are unavailable
// rather than guessing, so the interface can say it in words.
import { policyFromEnv, type RewardPolicy } from './rewards.ts';
import { vaultClient, vaultConfig } from './vault.ts';

type Ready = {
  ok: true;
  client: ReturnType<typeof vaultClient>;
  policy: RewardPolicy;
  seasonId: number;
  season: Awaited<ReturnType<ReturnType<typeof vaultClient>['season']>>;
  globalPaused: boolean;
  symbol: string;
  decimals: number;
};
type NotReady = { ok: false; reason: string };

let cached: { at: number; value: Ready | NotReady } | null = null;
const TTL_MS = 15_000;

export async function rewardContext(seasonId: number): Promise<Ready | NotReady> {
  if (cached && Date.now() - cached.at < TTL_MS) return cached.value;
  const value = await load(seasonId);
  cached = { at: Date.now(), value };
  return value;
}

export function clearRewardContext() {
  cached = null;
}

async function load(seasonId: number): Promise<Ready | NotReady> {
  const enabled = process.env.REWARDS_ENABLED === 'true';
  if (!enabled) return { ok: false, reason: 'Rewards are off.' };
  const cfg = vaultConfig();
  if (!cfg) return { ok: false, reason: 'The reward vault is not configured.' };
  const client = vaultClient(cfg);
  try {
    const season = await client.season(seasonId);
    if (!season.exists) return { ok: false, reason: 'This season does not exist on the vault.' };
    if (!(await client.attestorActive())) return { ok: false, reason: 'The score service’s signing key is not active on the vault.' };
    const [decimals, symbol, globalPaused] = await Promise.all([
      client.tokenDecimals(season.token),
      client.tokenSymbol(season.token),
      client.globalPaused(),
    ]);
    const expected = Number(process.env.REWARD_TOKEN_DECIMALS || 18);
    if (decimals !== expected) return { ok: false, reason: `The reward token has ${decimals} decimals; the server expects ${expected}.` };
    return { ok: true, client, policy: policyFromEnv(decimals), seasonId, season, globalPaused, symbol, decimals };
  } catch {
    return { ok: false, reason: 'Couldn’t reach the reward vault. Try again shortly.' };
  }
}
