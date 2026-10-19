'use client';

import { useEffect, useState } from 'react';
import { useWallet } from '@/components/WalletButton';
import { useAuth, useMe } from '@/lib/api';
import { botChain, explorerUrl, service, shortAddress } from '@/lib/chain';

// Nothing on this screen is a sample. Every value comes from config or the connected wallet; while
// the vault is not deployed, amounts are zero and the claim is disabled with its reason (PRD 6.6, 9).

const gate: [string, boolean][] = [
  ['GGI contract verified on the explorer', false],
  ['Permission to distribute GGI confirmed', false],
  ['Reward vault deployed and verified', !!service.rewardVault],
  ['Vault funded for Season 1', false],
  ['Budget, caps and pause tested on testnet', false],
];

export function ClaimCard() {
  const w = useWallet();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const connected = mounted && w.isConnected && !!w.address;
  const auth = useAuth();
  const me = useMe(auth.signedIn);

  return (
    <section className="card card--stretch" aria-labelledby="claim-title">
      <div className="card__head">
        <h2 id="claim-title" className="card__title">Claimable</h2>
        <span className="card__meta">{connected ? shortAddress(w.address) : 'No wallet connected'}</span>
      </div>
      <p className="figure figure--lead num">0 <span className="unit">GGI</span></p>
      <dl className="kv">
        <div><dt>Earned this season</dt><dd className="num">0 GGI</dd></div>
        <div><dt>Pending</dt><dd className="num">0 GGI</dd></div>
        <div><dt>Claimed</dt><dd className="num">0 GGI</dd></div>
        <div><dt>Accepted runs</dt><dd className="num">{me.data?.accepted ?? 0}</dd></div>
        <div><dt>Network</dt><dd>{connected && w.wrongNetwork ? `Chain ${w.chainId}` : `${botChain.name} (${botChain.id})`}</dd></div>
      </dl>
      {connected && w.wrongNetwork && (
        <div className="notice notice--row">
          <span>Switch to {botChain.name} to claim.</span>
          <button type="button" className="btn btn--secondary" onClick={w.switchNetwork} disabled={w.switching}>
            {w.switching ? 'Switching…' : 'Switch network'}
          </button>
        </div>
      )}
      <div className="card__foot claim-row">
        <button type="button" className="btn btn--primary" disabled aria-describedby="claim-why">Claim</button>
        <p id="claim-why" className="muted">Nothing to claim. Rewards are off.</p>
      </div>
    </section>
  );
}

export function SeasonCard() {
  return (
    <section className="card card--stretch" aria-labelledby="season-title">
      <div className="card__head">
        <h2 id="season-title" className="card__title">Season 1</h2>
        <span className="pill">Rewards off</span>
      </div>
      <dl className="kv">
        <div><dt>Pool</dt><dd>Not funded</dd></div>
        <div><dt>Asset</dt><dd>GGI (unverified)</dd></div>
        <div><dt>Decimals</dt><dd>—</dd></div>
        <div><dt>Chain</dt><dd>{botChain.name} ({botChain.id})</dd></div>
        <div>
          <dt>Contract</dt>
          <dd>{service.rewardVault ? <a className="mono text-action" href={`${explorerUrl}/address/${service.rewardVault}`} target="_blank" rel="noopener noreferrer">{shortAddress(service.rewardVault)}</a> : 'Not deployed'}</dd>
        </div>
        <div><dt>Cap per wallet</dt><dd>—</dd></div>
        <div><dt>Minimum claim</dt><dd>None set</dd></div>
      </dl>
    </section>
  );
}

export function GateCard() {
  const done = gate.filter(([, d]) => d).length;
  return (
    <section className="card" id="rules" aria-labelledby="gate-title">
      <div className="card__head">
        <h2 id="gate-title" className="card__title">Before rewards switch on</h2>
        <span className="card__meta num">{done} of {gate.length} done</span>
      </div>
      <div className="progress" role="img" aria-label={`${done} of ${gate.length} steps done`}>
        <span style={{ width: `${(done / gate.length) * 100}%` }} />
      </div>
      <ul className="checklist">
        {gate.map(([label, d]) => (
          <li key={label} className={d ? 'is-done' : undefined}>
            <span className="checklist__mark" aria-hidden>
              {d ? <svg viewBox="0 0 16 16" width="12" height="12"><path d="M3 8.5l3.2 3L13 4.5" fill="none" stroke="currentColor" strokeWidth="2" /></svg> : null}
            </span>
            {label}
            <span className="sr-only">{d ? ' (done)' : ' (to do)'}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
