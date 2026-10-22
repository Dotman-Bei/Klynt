// One in-memory Postgres (PGlite) per test file, emptied between tests. Starting PGlite takes a few
// seconds, so reusing it keeps the suite fast while every test still starts from a clean database.
import { openDb, type Db } from './db.ts';

let shared: Promise<Db> | null = null;

export async function freshDb(): Promise<Db> {
  shared ??= openDb('memory');
  const db = await shared;
  await db.query(`truncate earnings, claims, sessions, auth_nonces, submissions restart identity cascade`);
  return db;
}
