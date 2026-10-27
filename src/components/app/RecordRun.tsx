'use client';

import { useState } from 'react';
import type { Hex } from 'viem';
import { usePublicClient, useWriteContract } from 'wagmi';
import { useWallet } from '@/components/WalletButton';
import { api } from '@/lib/api';
import { botChain, service, txUrl } from '@/lib/chain';
import { scoreboardAbi, scoreboardRevertWords } from '@/lib/scoreboardAbi';
import { explainTx } from '@/lib/txError';

type Step =
  | { step: 'idle' }
  | { step: 'asking' }
  | { step: 'signing' }
  | { step: 'confirming'; hash: Hex }
  | { step: 'done'; hash: Hex }
  | { step: 'failed'; message: string; hash?: Hex };

/** Sends one accepted run to the scoreboard contract. The player pays the gas; nothing is paid out. */
export function RecordRun({ sessionId }: { sessionId: string }) {
  const w = useWallet();
  const client = usePublicClient({ chainId: botChain.id });
  const { writeContractAsync } = useWriteContract();
  const [s, setS] = useState<Step>({ step: 'idle' });

  if (!service.scoreboard) return null;

  async function run() {
    let hash: Hex | undefined;
    try {
      setS({ step: 'asking' });
      const res = await api<{ record: Record<string, string>; signature: Hex }>('/scores/record', { method: 'POST', body: { sessionId } });
      const r = res.record;
      const record = {
        wallet: r.wallet as Hex, seasonId: BigInt(r.seasonId), gameId: r.gameId as Hex,
        score: BigInt(r.score), runId: r.runId as Hex, expiry: BigInt(r.expiry),
      };
      setS({ step: 'signing' });
      hash = await writeContractAsync({ address: service.scoreboard as Hex, abi: scoreboardAbi, functionName: 'record', args: [record, res.signature], chainId: botChain.id });
      setS({ step: 'confirming', hash });
      const receipt = await client!.waitForTransactionReceipt({ hash });
      if (receipt.status !== 'success') throw new Error('The transaction failed on-chain. The run was not recorded.');
      // The server checks the receipt itself before marking the run recorded.
      await api('/scores/record/confirm', { method: 'POST', body: { sessionId, txHash: hash } });
      setS({ step: 'done', hash });
    } catch (e) {
      setS({ step: 'failed', message: explainTx(e, scoreboardRevertWords), hash });
    }
  }

  const busy = s.step === 'asking' || s.step === 'signing' || s.step === 'confirming';
  return (
    <div className="record-run">
      {w.wrongNetwork ? (
        <button type="button" className="btn btn--secondary" onClick={w.switchNetwork} disabled={w.switching}>
          Switch to {botChain.name} to record
        </button>
      ) : s.step === 'done' ? (
        <a className="btn btn--secondary" href={txUrl(s.hash)} target="_blank" rel="noopener noreferrer">View on BOT Scan</a>
      ) : (
        <button type="button" className="btn btn--secondary" onClick={run} disabled={busy}>
          {busy ? 'Working…' : s.step === 'failed' ? 'Try recording again' : 'Record on BOT Chain'}
        </button>
      )}
      <p className="record-run__note" aria-live="polite">
        {s.step === 'idle' && 'Optional. One transaction from your wallet puts this score on BOT Chain. You pay a small BOT fee.'}
        {s.step === 'asking' && 'Asking the score service to sign this run…'}
        {s.step === 'signing' && 'Confirm the transaction in your wallet.'}
        {s.step === 'confirming' && 'Waiting for BOT Chain to confirm it…'}
        {s.step === 'done' && 'Recorded on BOT Chain.'}
        {s.step === 'failed' && s.message}
        {'hash' in s && s.hash && s.step !== 'done' && (
          <> <a className="text-action" href={txUrl(s.hash)} target="_blank" rel="noopener noreferrer">View the transaction</a></>
        )}
      </p>
    </div>
  );
}
