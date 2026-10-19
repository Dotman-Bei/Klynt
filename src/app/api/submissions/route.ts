import type { NextRequest } from 'next/server';
import { clean, validate } from '@/lib/submission';
import { db } from '@/server/db';
import { body, clientIp, fail, json, limited } from '@/server/http';
import { createSubmission } from '@/server/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  if (limited(`submission:${clientIp(req)}`, 5, 3600_000)) return fail(429, 'Too many submissions from here. Try again in an hour.');
  const raw = await body(req);
  if (!raw) return fail(400, 'Send the submission as JSON.');
  const draft = clean(raw);
  const errors = validate(draft);
  if (Object.keys(errors).length) return json({ error: 'Some answers need a look.', fields: errors }, 422);
  return json(createSubmission(db(), draft), 201);
}
