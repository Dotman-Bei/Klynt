import { NextResponse, type NextRequest } from 'next/server';
import { COOKIE, walletFromToken } from './auth.ts';

export const json = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: { 'cache-control': 'no-store' } });

export const fail = (status: number, error: string) => json({ error }, status);

export function walletOf(req: NextRequest): string | null {
  return walletFromToken(req.cookies.get(COOKIE)?.value);
}

export function clientIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'local';
}

// In-memory sliding window. Enough for one server; a multi-instance deployment needs a shared store.
const hits = new Map<string, number[]>();
export function limited(key: string, max: number, windowMs: number, now = Date.now()): boolean {
  const list = (hits.get(key) ?? []).filter((t) => t > now - windowMs);
  if (list.length >= max) {
    hits.set(key, list);
    return true;
  }
  list.push(now);
  hits.set(key, list);
  return false;
}

export async function body<T = Record<string, unknown>>(req: NextRequest): Promise<T | null> {
  try {
    const text = await req.text();
    if (text.length > 20_000) return null;
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}
