import type { NextRequest } from 'next/server';
import { db } from '@/server/db';
import { fail, json, walletOf } from '@/server/http';
import { playerSummary } from '@/server/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const wallet = walletOf(req);
  if (!wallet) return fail(401, 'Sign in with your wallet to see ranked runs.');
  return json(await playerSummary(await db(), wallet));
}
