import type { NextRequest } from 'next/server';
import { db } from '@/server/db';
import { body, fail, json, limited, walletOf } from '@/server/http';
import { submitScore } from '@/server/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const wallet = walletOf(req);
  if (!wallet) return fail(401, 'Sign in with your wallet to submit a ranked run.');
  if (limited(`submit:${wallet}`, 20, 60_000)) return fail(429, 'Too many submissions. Wait a minute.');
  const { id } = await params;
  const b = await body<{ score?: unknown }>(req);
  if (!b) return fail(400, 'Send the score.');
  const r = submitScore(db(), id, wallet, b.score);
  if (!r.ok) return fail(r.status, r.error);
  return json(r);
}
