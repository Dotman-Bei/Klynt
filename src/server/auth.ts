// Wallet sign-in: the player signs one plain message; the server checks the signature and sets an
// httpOnly cookie. No transaction, no gas, and no key ever leaves the wallet (PRD 6.3).
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import { isAddress, verifyMessage } from 'viem';

export const COOKIE = 'klynt_session';
const NONCE_TTL_MS = 10 * 60 * 1000;
export const SESSION_TTL_S = 7 * 24 * 60 * 60;

let devSecret: string | null = null;
function secret(): string {
  const s = process.env.KLYNT_SESSION_SECRET;
  if (s && s.length >= 32) return s;
  if (process.env.NODE_ENV === 'production') throw new Error('KLYNT_SESSION_SECRET must be set (32+ characters).');
  // Development only: a per-process secret, so sign-ins reset when the server restarts.
  devSecret ??= randomBytes(32).toString('hex');
  return devSecret;
}

export function signInMessage(wallet: string, chainId: number, nonce: string, issuedAt: string) {
  return [
    'Sign in to Klynt',
    '',
    `Wallet: ${wallet}`,
    `Chain ID: ${chainId}`,
    `Nonce: ${nonce}`,
    `Issued: ${issuedAt}`,
    '',
    'This proves you own this wallet. It sends no transaction and costs nothing.',
  ].join('\n');
}

export function issueNonce(db: DatabaseSync, wallet: string, chainId: number, now = Date.now()) {
  if (!isAddress(wallet)) return null;
  const nonce = randomBytes(12).toString('base64url');
  db.prepare(`delete from auth_nonces where created_at < ?`).run(now - NONCE_TTL_MS);
  db.prepare(`insert into auth_nonces (nonce, wallet, created_at) values (?, ?, ?)`).run(nonce, wallet.toLowerCase(), now);
  return signInMessage(wallet, chainId, nonce, new Date(now).toISOString());
}

const field = (message: string, name: string) => message.match(new RegExp(`^${name}: (.+)$`, 'm'))?.[1]?.trim();

export async function verifySignIn(db: DatabaseSync, message: string, signature: string, chainId: number, now = Date.now()) {
  const wallet = field(message, 'Wallet');
  const nonce = field(message, 'Nonce');
  const chain = Number(field(message, 'Chain ID'));
  if (!wallet || !nonce || !isAddress(wallet)) return { ok: false as const, error: 'The sign-in message is not one Klynt issued.' };
  if (chain !== chainId) return { ok: false as const, error: 'The sign-in message is for another network.' };

  const row = db.prepare(`select wallet, created_at, used from auth_nonces where nonce = ?`).get(nonce) as Record<string, unknown> | undefined;
  if (!row || String(row.wallet) !== wallet.toLowerCase()) return { ok: false as const, error: 'The sign-in message is not one Klynt issued.' };
  if (Number(row.used)) return { ok: false as const, error: 'This sign-in message was already used.' };
  if (now - Number(row.created_at) > NONCE_TTL_MS) return { ok: false as const, error: 'This sign-in message expired. Try again.' };
  // Rebuild the message from stored values, so nothing else in it can be changed.
  const expected = signInMessage(wallet, chainId, nonce, field(message, 'Issued') ?? '');
  if (expected !== message) return { ok: false as const, error: 'The sign-in message was changed.' };

  let valid = false;
  try {
    valid = await verifyMessage({ address: wallet as `0x${string}`, message, signature: signature as `0x${string}` });
  } catch {
    valid = false;
  }
  if (!valid) return { ok: false as const, error: 'The signature does not match this wallet.' };

  const used = db.prepare(`update auth_nonces set used = 1 where nonce = ? and used = 0`).run(nonce);
  if (Number(used.changes) !== 1) return { ok: false as const, error: 'This sign-in message was already used.' };
  return { ok: true as const, wallet: wallet.toLowerCase() };
}

/** A signed cookie value: base64url(payload).hmac */
export function sessionToken(wallet: string, now = Date.now()) {
  const payload = Buffer.from(JSON.stringify({ w: wallet.toLowerCase(), exp: Math.floor(now / 1000) + SESSION_TTL_S })).toString('base64url');
  const mac = createHmac('sha256', secret()).update(payload).digest('base64url');
  return `${payload}.${mac}`;
}

export function walletFromToken(token: string | undefined, now = Date.now()): string | null {
  if (!token) return null;
  const [payload, mac] = token.split('.');
  if (!payload || !mac) return null;
  const expected = createHmac('sha256', secret()).update(payload).digest();
  const given = Buffer.from(mac, 'base64url');
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const { w, exp } = JSON.parse(Buffer.from(payload, 'base64url').toString()) as { w: string; exp: number };
    if (typeof w !== 'string' || exp * 1000 < now) return null;
    return w;
  } catch {
    return null;
  }
}
