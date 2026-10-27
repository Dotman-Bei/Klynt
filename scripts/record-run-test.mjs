// End-to-end check of on-chain score records: sign in, play an accepted run, record it on the
// scoreboard from the player's wallet, and have the server confirm it.
// usage: PLAYER_PRIVATE_KEY=0x… SCOREBOARD=0x… RPC_URL=… node scripts/record-run-test.mjs [baseUrl]
// The player wallet pays the gas, so it needs a little BOT on the chain the app is set to.
import { createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { scoreboardAbi } from '../src/lib/scoreboardAbi.ts';

const base = process.argv[2] || 'http://localhost:3000';
const account = privateKeyToAccount(process.env.PLAYER_PRIVATE_KEY);
const board = process.env.SCOREBOARD;
const transport = http(process.env.RPC_URL);
const pub = createPublicClient({ transport });
const chainId = await pub.getChainId();
const wallet = createWalletClient({ account, transport, chain: { id: chainId, name: 'BOT Chain', nativeCurrency: { name: 'BOT', symbol: 'BOT', decimals: 18 }, rpcUrls: { default: { http: [process.env.RPC_URL] } } } });
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
const verify = await call('POST', '/api/auth/verify', { message: nonce.body.message, signature: await account.signMessage({ message: nonce.body.message }) });
check('signed in', verify.status === 200, verify.body);

const s = await call('POST', '/api/sessions', { gameId: 'tower-blocks' });
await sleep(6000);
const score = 12 + Math.floor(Math.random() * 6);
const run = await call('POST', `/api/sessions/${s.body.sessionId}/submit`, { score });
check('run accepted', run.body.status === 'accepted', run.body);

const res = await call('POST', '/api/scores/record', { sessionId: s.body.sessionId });
check('server signed a record', res.status === 200, res.status === 200 ? undefined : res.body);
const r = res.body.record;
const record = { wallet: r.wallet, seasonId: BigInt(r.seasonId), gameId: r.gameId, score: BigInt(r.score), runId: r.runId, expiry: BigInt(r.expiry) };
check('record carries the accepted score', record.score === BigInt(score));

const before = await pub.readContract({ address: board, abi: scoreboardAbi, functionName: 'bestScore', args: [record.seasonId, record.gameId, account.address] });
const gasPrice = await pub.getGasPrice();
const hash = await wallet.writeContract({ address: board, abi: scoreboardAbi, functionName: 'record', args: [record, res.body.signature], gasPrice });
const receipt = await pub.waitForTransactionReceipt({ hash });
check('record transaction succeeded', receipt.status === 'success', { hash, gasUsed: receipt.gasUsed.toString() });

const early = await call('POST', '/api/scores/record/confirm', { sessionId: s.body.sessionId, txHash: `0x${'ab'.repeat(32)}` });
check('server refuses a transaction that is not this record', early.status === 409, early.body);
const conf = await call('POST', '/api/scores/record/confirm', { sessionId: s.body.sessionId, txHash: hash });
check('server confirmed the record on-chain', conf.body.status === 'recorded', conf.body);

const after = await pub.readContract({ address: board, abi: scoreboardAbi, functionName: 'bestScore', args: [record.seasonId, record.gameId, account.address] });
check('on-chain best is the higher of old and new', after === (before > record.score ? before : record.score), { before: before.toString(), after: after.toString() });

const twice = await call('POST', '/api/scores/record', { sessionId: s.body.sessionId });
check('a recorded run cannot be signed again', twice.status === 409, twice.body);

console.log(`tx ${hash}`);
