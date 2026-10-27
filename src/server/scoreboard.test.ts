import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { recoverTypedDataAddress } from 'viem';
import { gameKey, markRecorded, recordForRun, recordTypes, runKey, scoreboardClient, scoreboardDomain } from './scoreboard.ts';
import { startSession, submitScore } from './store.ts';
import { freshDb } from './testDb.ts';

const A = '0x00000000000000000000000000000000000000aa';
const B = '0x00000000000000000000000000000000000000bb';
const BOARD = '0x00000000000000000000000000000000000000cc' as const;
const KEY = '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d' as const;
const T0 = 1_760_000_000_000;

describe('on-chain records', () => {
  it('builds a record only for the wallet’s own accepted run', async () => {
    const db = await freshDb();
    const s = await startSession(db, A, 'tower-blocks', T0);
    assert.ok(s.ok);
    assert.deepEqual(await recordForRun(db, s.sessionId, A, T0), { ok: false, status: 409, error: 'Only accepted runs can be recorded on BOT Chain.' });
    await submitScore(db, s.sessionId, A, 40, T0 + 30_000);

    const r = await recordForRun(db, s.sessionId, A, T0 + 60_000);
    assert.ok(r.ok);
    assert.equal(r.record.score, 40n);
    assert.equal(r.record.seasonId, 1n);
    assert.equal(r.record.gameId, gameKey('tower-blocks'));
    assert.equal(r.record.runId, runKey(s.sessionId));
    assert.equal(r.record.expiry, BigInt((T0 + 60_000) / 1000 + 3600));

    const other = await recordForRun(db, s.sessionId, B, T0);
    assert.equal(other.ok, false);
    assert.equal(!other.ok && other.status, 404);
  });

  it('refuses a rejected run', async () => {
    const db = await freshDb();
    const s = await startSession(db, A, 'tower-blocks', T0);
    assert.ok(s.ok);
    await submitScore(db, s.sessionId, A, 999, T0 + 6_000);
    const r = await recordForRun(db, s.sessionId, A, T0);
    assert.equal(r.ok, false);
  });

  it('keeps the first transaction and refuses to record twice', async () => {
    const db = await freshDb();
    const s = await startSession(db, A, 'tower-blocks', T0);
    assert.ok(s.ok);
    await submitScore(db, s.sessionId, A, 40, T0 + 30_000);
    const tx1 = `0x${'1'.repeat(64)}`;
    assert.equal(await markRecorded(db, s.sessionId, tx1), true);
    assert.equal(await markRecorded(db, s.sessionId, `0x${'2'.repeat(64)}`), false);
    const row = (await db.query(`select chain_tx from sessions where id = $1`, [s.sessionId])).rows[0];
    assert.equal(row.chain_tx, tx1);
    const again = await recordForRun(db, s.sessionId, A, T0);
    assert.equal(!again.ok && again.error, 'This run is already on BOT Chain.');
  });

  it('signs with the attestor key over the scoreboard’s domain', async () => {
    const db = await freshDb();
    const s = await startSession(db, A, 'tower-blocks', T0);
    assert.ok(s.ok);
    await submitScore(db, s.sessionId, A, 40, T0 + 30_000);
    const r = await recordForRun(db, s.sessionId, A, T0);
    assert.ok(r.ok);
    const c = scoreboardClient({ board: BOARD, attestorKey: KEY, rpcUrl: 'http://127.0.0.1:1', chainId: 677 });
    const signature = await c.signRecord(r.record);
    const signer = await recoverTypedDataAddress({
      domain: scoreboardDomain(677, BOARD), types: recordTypes, primaryType: 'Record', message: r.record, signature,
    });
    assert.equal(signer, c.attestorAddress);
    const elsewhere = await recoverTypedDataAddress({
      domain: scoreboardDomain(968, BOARD), types: recordTypes, primaryType: 'Record', message: r.record, signature,
    });
    assert.notEqual(elsewhere, c.attestorAddress);
  });
});
