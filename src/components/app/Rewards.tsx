'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { BaseError, ContractFunctionRevertedError, formatUnits, type Hex } from 'viem';
import { usePublicClient, useWriteContract } from 'wagmi';
import { useWallet } from '@/components/WalletButton';
import { api, live, useAuth, useMe, useRewards, type RewardsStatus } from '@/lib/api';
import { addressUrl, botChain, explorerUrl, service, shortAddress, txUrl } from '@/lib/chain';
import { revertWords, vaultAbi } from '@/lib/vaultAbi';

// Every value here comes from config, the score service or the vault itself. Nothing is sample data.
// A claim is shown as paid only after the server has found its transaction on-chain (PRD 15).

type Season = NonNullable<RewardsStatus['season']>;
const fmt = (v: string | bigint | undefined, d: number) => {
  const n = Number(formatUnits(BigInt(v ?? 0), d));
  return n.toLocaleString('en-GB', { maximumFractionDigits: 4 });
};
const isTestPoints = (s?: Season | null) => !!s && /^KTP-TEST$/.test(s.symbol);
const assetName = (s?: Season | null) => (!s ? 'GGI (unverified)' : isTestPoints(s) ? `${s.symbol} (testnet points, no value)` : s.symbol);

function explain(e: unknown): string {
  if (e instanceof BaseError) {
    const revert = e.walk((x) => x instanceof ContractFunctionRevertedError) as ContractFunctionRevertedError | null;
    const name = revert?.data?.errorName;
    if (name && revertWords[name]) return revertWords[name];
    if (/User rejected|denied/i.test(e.message)) return 'You cancelled in your wallet. Nothing was sent.';
    return e.shortMessage || e.message;
  }
  return e instanceof Error ? e.message : 'Something went wrong.';
}

type Flow =
  | { step: 'review' }
  | { step: 'authorising' }
  | { step: 'signing' }
  | { step: 'confirming'; hash: Hex }
  | { step: 'done'; hash: Hex; amount: string }
  | { step: 'failed'; message: string; hash?: Hex };

function ClaimSheet({ s, amount, onClose }: { s: Season; amount: string; onClose: () => void }) {
  const qc = useQueryClient();
  const client = usePublicClient({ chainId: botChain.id });
  const { writeContractAsync } = useWriteContract();
  const [flow, setFlow] = useState<Flow>({ step: 'review' });

  async function run() {
    let hash: Hex | undefined;
    try {
      setFlow({ step: 'authorising' });
      const auth = await api<{ claim: Record<string, string>; signature: Hex }>('/rewards/authorize', { method: 'POST' });
      const c = auth.claim;
      const claim = {
        wallet: c.wallet as Hex, seasonId: BigInt(c.seasonId), gameId: c.gameId as Hex, token: c.token as Hex,
        amount: BigInt(c.amount), nonce: c.nonce as Hex, expiry: BigInt(c.expiry),
      };
      setFlow({ step: 'signing' });
      hash = await writeContractAsync({ address: service.rewardVault as Hex, abi: vaultAbi, functionName: 'claim', args: [claim, auth.signature], chainId: botChain.id });
      setFlow({ step: 'confirming', hash });
      const receipt = await client!.waitForTransactionReceipt({ hash });
      if (receipt.status !== 'success') throw new Error('The claim transaction failed on-chain. Nothing was paid.');
      // The server checks the receipt itself before recording the claim as paid.
      await api('/rewards/confirm', { method: 'POST', body: { nonce: claim.nonce, txHash: hash } });
      setFlow({ step: 'done', hash, amount: claim.amount.toString() });
    } catch (e) {
      setFlow({ step: 'failed', message: explain(e), hash });
    } finally {
      qc.invalidateQueries({ queryKey: ['rewards'] });
    }
  }

  const busy = flow.step === 'authorising' || flow.step === 'signing' || flow.step === 'confirming';
  return (
    <div className="sheet-backdrop sheet-backdrop--center" onClick={() => !busy && onClose()}>
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="review-title" onClick={(e) => e.stopPropagation()}>
        <h2 id="review-title" className="dialog__title">
          {flow.step === 'done' ? 'Claimed' : flow.step === 'failed' ? 'Claim not completed' : 'Review claim'}
        </h2>
        <dl className="kv">
          <div><dt>Amount</dt><dd className="num">{fmt(flow.step === 'done' ? flow.amount : amount, s.decimals)} {s.symbol}</dd></div>
          <div><dt>Asset</dt><dd>{assetName(s)}</dd></div>
          <div><dt>Token</dt><dd><a className="mono text-action" href={addressUrl(s.token)} target="_blank" rel="noopener noreferrer">{shortAddress(s.token)}</a></dd></div>
          <div><dt>Decimals</dt><dd className="num">{s.decimals}</dd></div>
          <div><dt>Chain</dt><dd>{botChain.name} ({botChain.id})</dd></div>
          <div><dt>Contract</dt><dd><a className="mono text-action" href={addressUrl(service.rewardVault!)} target="_blank" rel="noopener noreferrer">{shortAddress(service.rewardVault!)}</a></dd></div>
        </dl>
        <p className="dialog__note" aria-live="polite">
          {flow.step === 'review' && 'Your wallet will ask you to send one transaction. It pays the network fee in BOT and moves these tokens to your wallet.'}
          {flow.step === 'authorising' && 'Asking the score service to sign your claim…'}
          {flow.step === 'signing' && 'Confirm the transaction in your wallet.'}
          {flow.step === 'confirming' && 'Waiting for the transaction to be confirmed on BOT Chain…'}
          {flow.step === 'done' && 'Confirmed on-chain and recorded.'}
          {flow.step === 'failed' && flow.message}
        </p>
        {'hash' in flow && flow.hash && (
          <p className="dialog__note"><a className="text-action" href={txUrl(flow.hash)} target="_blank" rel="noopener noreferrer">View the transaction</a></p>
        )}
        <div className="dialog__actions">
          {flow.step === 'review' && <button type="button" className="btn btn--primary" onClick={run}>Claim {fmt(amount, s.decimals)} {s.symbol}</button>}
          {busy && <button type="button" className="btn btn--primary" disabled>Working…</button>}
          <button type="button" className="btn btn--secondary" onClick={onClose} disabled={busy}>{flow.step === 'done' ? 'Done' : 'Close'}</button>
        </div>
      </div>
    </div>
  );
}

export function RewardsView() {
  const w = useWallet();
  const auth = useAuth();
  const rewards = useRewards();
  const me = useMe(auth.signedIn);
  const [mounted, setMounted] = useState(false);
  const [sheet, setSheet] = useState(false);
  useEffect(() => setMounted(true), []);

  const r = rewards.data;
  const s = r?.season ?? null;
  const d = s?.decimals ?? 18;
  const mine = r?.me;
  const connected = mounted && w.isConnected && !!w.address;
  const on = !!r?.available;
  const symbol = s?.symbol ?? 'GGI';
  const claimable = BigInt(mine?.claimable ?? 0);

  const checking = live && rewards.isLoading;
  const why = !live
    ? 'Nothing to claim. Rewards are off.'
    : checking
      ? 'Checking the reward vault…'
      : !on
      ? r?.reason ?? 'Rewards are off.'
      : !connected
        ? 'Connect your wallet to claim.'
        : w.wrongNetwork
          ? `Switch to ${botChain.name} to claim.`
          : !auth.signedIn
            ? 'Sign in with your wallet to claim.'
            : BigInt(mine?.pending ?? 0) > 0n
              ? 'A claim is waiting. It expires within a day if unused.'
              : claimable === 0n
                ? 'Nothing to claim yet. Accepted runs above the score threshold earn.'
                : null;

  // Facts come from the chain; the rest are sign-offs a person records in config after checking.
  const signedOff = (v: string | undefined) => v === 'true';
  const gate: [string, boolean][] = [
    ['GGI contract verified on the explorer', signedOff(process.env.NEXT_PUBLIC_SIGNOFF_GGI_VERIFIED)],
    ['Permission to distribute GGI confirmed', signedOff(process.env.NEXT_PUBLIC_SIGNOFF_GGI_PERMISSION)],
    ['Reward vault deployed', !!service.rewardVault && !!s],
    ['Vault source verified on the explorer', signedOff(process.env.NEXT_PUBLIC_SIGNOFF_VAULT_VERIFIED)],
    [`Vault funded for Season 1${s ? ` (${fmt(s.funded, d)} ${symbol})` : ''}`, !!s && BigInt(s.funded) > 0n],
    ['Budget, caps and pause tested on testnet', signedOff(process.env.NEXT_PUBLIC_SIGNOFF_TESTNET_TESTED)],
  ];
  const done = gate.filter(([, x]) => x).length;

  return (
    <>
      <div className="title-row">
        <div>
          <h1>Rewards</h1>
          <p className="title-row__line">
            {checking
              ? 'Checking the reward vault…'
              : on && r?.policy
              ? `Season 1 pays ${fmt(r.policy.perRun, d)} ${symbol} per qualifying run, up to ${fmt(r.policy.dailyCap, d)} a day.${isTestPoints(s) ? ' These are testnet points with no value.' : ''}`
              : 'Rewards are off this season. Nothing you play is owed anything until the pool is funded.'}
          </p>
        </div>
      </div>

      <div className="grid6 detail-grid">
        <div className="span3">
          <section className="card card--stretch" aria-labelledby="claim-title">
            <div className="card__head">
              <h2 id="claim-title" className="card__title">Claimable</h2>
              <span className="card__meta">{connected ? shortAddress(w.address) : 'No wallet connected'}</span>
            </div>
            <p className="figure figure--lead num">{fmt(claimable, d)} <span className="unit">{symbol}</span></p>
            <dl className="kv">
              <div><dt>Earned this season</dt><dd className="num">{fmt(mine?.earned, d)} {symbol}</dd></div>
              <div><dt>Pending</dt><dd className="num">{fmt(mine?.pending, d)} {symbol}</dd></div>
              <div><dt>Claimed</dt><dd className="num">{fmt(mine?.claimed, d)} {symbol}</dd></div>
              <div><dt>Accepted runs</dt><dd className="num">{me.data?.accepted ?? 0}</dd></div>
              <div><dt>Network</dt><dd>{connected && w.wrongNetwork ? `Chain ${w.chainId}` : `${botChain.name} (${botChain.id})`}</dd></div>
            </dl>
            {connected && w.wrongNetwork && (
              <div className="notice notice--row">
                <span>Switch to {botChain.name} to claim.</span>
                <button type="button" className="btn btn--secondary" onClick={w.switchNetwork} disabled={w.switching}>Switch network</button>
              </div>
            )}
            <div className="card__foot claim-row">
              {on && connected && !w.wrongNetwork && !auth.signedIn ? (
                <button type="button" className="btn btn--primary" onClick={auth.signIn} disabled={auth.signing}>
                  {auth.signing ? 'Check your wallet…' : 'Sign in to claim'}
                </button>
              ) : (
                <button type="button" className="btn btn--primary" disabled={!!why} aria-describedby="claim-why" onClick={() => setSheet(true)}>
                  Claim
                </button>
              )}
              {why && <p id="claim-why" className="muted">{why}</p>}
            </div>
          </section>
        </div>

        <div className="span3">
          <section className="card card--stretch" aria-labelledby="season-title">
            <div className="card__head">
              <h2 id="season-title" className="card__title">Season 1</h2>
              <span className={`pill${on ? ' pill--ranked' : ''}`}>{checking ? 'Checking…' : on ? 'Rewards on' : s?.paused ? 'Paused' : 'Rewards off'}</span>
            </div>
            <dl className="kv">
              <div><dt>Pool</dt><dd className="num">{s ? `${fmt(BigInt(s.funded) - BigInt(s.claimed), d)} of ${fmt(s.budget, d)} left` : 'Not funded'}</dd></div>
              <div><dt>Asset</dt><dd>{assetName(s)}</dd></div>
              <div><dt>Decimals</dt><dd className="num">{s ? s.decimals : '—'}</dd></div>
              <div><dt>Chain</dt><dd>{botChain.name} ({botChain.id})</dd></div>
              <div>
                <dt>Contract</dt>
                <dd>{service.rewardVault ? <a className="mono text-action" href={`${explorerUrl}/address/${service.rewardVault}`} target="_blank" rel="noopener noreferrer">{shortAddress(service.rewardVault)}</a> : 'Not deployed'}</dd>
              </div>
              <div><dt>Cap per wallet</dt><dd className="num">{s ? `${fmt(s.perWalletCap, d)} ${symbol}` : '—'}</dd></div>
              <div><dt>Claims close</dt><dd>{s ? new Date(s.claimsUntil * 1000).toISOString().slice(0, 10) : '—'}</dd></div>
            </dl>
          </section>
        </div>

        <div className="span3">
          <section className="card" id="rules" aria-labelledby="gate-title">
            <div className="card__head">
              <h2 id="gate-title" className="card__title">Before real rewards switch on</h2>
              <span className="card__meta num">{done} of {gate.length} done</span>
            </div>
            <div className="progress" role="img" aria-label={`${done} of ${gate.length} steps done`}>
              <span style={{ width: `${(done / gate.length) * 100}%` }} />
            </div>
            <ul className="checklist">
              {gate.map(([label, ok]) => (
                <li key={label} className={ok ? 'is-done' : undefined}>
                  <span className="checklist__mark" aria-hidden>
                    {ok ? <svg viewBox="0 0 16 16" width="12" height="12"><path d="M3 8.5l3.2 3L13 4.5" fill="none" stroke="currentColor" strokeWidth="2" /></svg> : null}
                  </span>
                  {label}
                  <span className="sr-only">{ok ? ' (done)' : ' (to do)'}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <section className="card span3" aria-labelledby="how-title">
          <div className="card__head">
            <h2 id="how-title" className="card__title">How rewards work</h2>
          </div>
          <ul className="rules">
            <li>Every season states its pool before it starts, or says that rewards are off.</li>
            <li>Only accepted runs at or above a game’s score threshold count, and each wallet has a daily cap.</li>
            <li>There is no fixed earning rate. Scores never guarantee a payout or any income.</li>
            <li>Every claim is one signed transaction, bound to your wallet, the season and the chain.</li>
            <li>Pausing a season stops new claims. Claims already confirmed stay valid.</li>
          </ul>
        </section>

        <section className="card span6" aria-labelledby="history-title">
          <div className="card__head">
            <h2 id="history-title" className="card__title">Claim history</h2>
            <span className="card__meta">Checked against the reward contract</span>
          </div>
          <table className="table table--flush">
            <thead>
              <tr><th>Date</th><th>Season</th><th>Status</th><th className="num">Amount</th><th className="num">Transaction</th></tr>
            </thead>
            <tbody>
              {(mine?.history ?? []).map((h) => (
                <tr key={h.nonce}>
                  <td>{new Date(h.createdAt).toISOString().slice(0, 10)}</td>
                  <td>Season 1</td>
                  <td><span className={`pill${h.status === 'confirmed' ? ' pill--ranked' : ''}`}>{h.status === 'confirmed' ? 'Claimed' : h.status === 'signed' ? 'Waiting' : 'Expired'}</span></td>
                  <td className="num">{fmt(h.amount, d)} {symbol}</td>
                  <td className="num">{h.txHash ? <a className="mono text-action" href={txUrl(h.txHash)} target="_blank" rel="noopener noreferrer">{shortAddress(h.txHash)}</a> : '—'}</td>
                </tr>
              ))}
              {!mine?.history?.length && (
                <tr>
                  <td colSpan={5}>
                    <p className="empty empty--inline">No claims yet. Each claim will link to its transaction on the BOT Chain explorer.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      </div>

      {sheet && s && <ClaimSheet s={s} amount={claimable.toString()} onClose={() => setSheet(false)} />}
    </>
  );
}
