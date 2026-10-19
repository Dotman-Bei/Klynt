// End-to-end check of the score service over HTTP with a throwaway wallet.
// usage: node scripts/smoke-api.mjs [baseUrl]   (default http://localhost:3000)
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';

const base = process.argv[2] || 'http://localhost:3000';
const account = privateKeyToAccount(generatePrivateKey());
let cookie = '';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function call(method, path, body) {
  const res = await fetch(base + path, {
    method,
    headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const set = res.headers.get('set-cookie');
  if (set) cookie = set.split(';')[0];
  return { status: res.status, body: await res.json() };
}

const check = (label, cond, detail) => {
  console.log(`${cond ? 'ok  ' : 'FAIL'} ${label}${detail ? ` — ${JSON.stringify(detail)}` : ''}`);
  if (!cond) process.exitCode = 1;
};

const nonce = await call('GET', `/api/auth/nonce?address=${account.address}`);
check('nonce issued', nonce.status === 200);
const signature = await account.signMessage({ message: nonce.body.message });
const verify = await call('POST', '/api/auth/verify', { message: nonce.body.message, signature });
check('signed in', verify.status === 200 && cookie.startsWith('klynt_session='), verify.body);
const replay = await call('POST', '/api/auth/verify', { message: nonce.body.message, signature });
check('sign-in message cannot be replayed', replay.status === 401, replay.body);

const s1 = await call('POST', '/api/sessions', { gameId: 'tower-blocks' });
check('session started', s1.status === 201, s1.body);
await sleep(6000);
const ok = await call('POST', `/api/sessions/${s1.body.sessionId}/submit`, { score: 12 });
check('valid run accepted with a rank', ok.body.status === 'accepted' && ok.body.rank >= 1, ok.body);
const again = await call('POST', `/api/sessions/${s1.body.sessionId}/submit`, { score: 15 });
check('second submit of one session refused', again.status === 409, again.body);

const s2 = await call('POST', '/api/sessions', { gameId: 'tower-blocks' });
await sleep(6000);
const high = await call('POST', `/api/sessions/${s2.body.sessionId}/submit`, { score: 900 });
check('impossible score rejected with a reason', high.body.status === 'rejected' && high.body.code === 'over-ceiling', high.body);

const s3 = await call('POST', '/api/sessions', { gameId: 'tower-blocks' });
const fast = await call('POST', `/api/sessions/${s3.body.sessionId}/submit`, { score: 1 });
check('too-fast run rejected', fast.body.status === 'rejected' && fast.body.code === 'too-fast', fast.body);

const board = await call('GET', '/api/leaderboard?game=tower-blocks');
const mine = board.body.rows.find((r) => r.wallet === account.address.toLowerCase());
check('leaderboard shows the accepted run only', mine && mine.best === 12, mine);

const me = await call('GET', '/api/me');
check('profile summary counts accepted and rejected', me.body.accepted === 1 && me.body.rejected === 2, { accepted: me.body.accepted, rejected: me.body.rejected });

await call('POST', '/api/auth/logout');
cookie = '';
const after = await call('POST', '/api/sessions', { gameId: 'hextris' });
check('signed out: ranked sessions refused', after.status === 401);
