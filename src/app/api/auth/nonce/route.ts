import type { NextRequest } from 'next/server';
import { botChain } from '@/lib/chain';
import { issueNonce } from '@/server/auth';
import { db } from '@/server/db';
import { clientIp, fail, json, limited } from '@/server/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (limited(`nonce:${clientIp(req)}`, 20, 10 * 60_000)) return fail(429, 'Too many sign-in attempts. Wait a few minutes.');
  const address = req.nextUrl.searchParams.get('address') ?? '';
  const message = await issueNonce(await db(), address, botChain.id);
  if (!message) return fail(400, 'That is not a wallet address.');
  return json({ message });
}
