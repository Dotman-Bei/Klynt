import { NextResponse, type NextRequest } from 'next/server';

// A deployment without NEXT_PUBLIC_KLYNT_API runs in Practice mode and has no database (for example
// on a serverless host with no persistent disk). Its API answers plainly instead of failing.
export function middleware(_req: NextRequest) {
  if (process.env.NEXT_PUBLIC_KLYNT_API) return NextResponse.next();
  return NextResponse.json(
    { error: 'The score service is not enabled on this deployment. Games run in Practice mode.' },
    { status: 503, headers: { 'cache-control': 'no-store' } },
  );
}

export const config = { matcher: '/api/:path*' };
