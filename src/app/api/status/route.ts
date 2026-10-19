import { db } from '@/server/db';
import { json } from '@/server/http';
import { RULES_VERSION, rules } from '@/server/rules';
import { currentSeason } from '@/server/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function GET() {
  return json({ live: true, season: currentSeason(db()), rulesVersion: RULES_VERSION, rankedGames: Object.keys(rules) });
}
