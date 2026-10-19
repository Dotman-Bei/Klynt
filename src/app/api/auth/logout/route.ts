import { COOKIE } from '@/server/auth';
import { json } from '@/server/http';

export const runtime = 'nodejs';

export function POST() {
  const res = json({ ok: true });
  res.cookies.set(COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
  return res;
}
