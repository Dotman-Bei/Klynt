import type { NextRequest } from 'next/server';
import { json, walletOf } from '@/server/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function GET(req: NextRequest) {
  return json({ wallet: walletOf(req) });
}
