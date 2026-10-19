import type { NextRequest } from 'next/server';
import { botChain } from '@/lib/chain';
import { COOKIE, SESSION_TTL_S, sessionToken, verifySignIn } from '@/server/auth';
import { db } from '@/server/db';
import { body, clientIp, fail, json, limited } from '@/server/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  if (limited(`verify:${clientIp(req)}`, 20, 10 * 60_000)) return fail(429, 'Too many sign-in attempts. Wait a few minutes.');
  const b = await body<{ message?: unknown; signature?: unknown }>(req);
  if (!b || typeof b.message !== 'string' || typeof b.signature !== 'string') return fail(400, 'Send the signed message and its signature.');
  const result = await verifySignIn(db(), b.message, b.signature, botChain.id);
  if (!result.ok) return fail(401, result.error);
  const res = json({ wallet: result.wallet });
  res.cookies.set(COOKIE, sessionToken(result.wallet), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_TTL_S,
  });
  return res;
}
