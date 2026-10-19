'use client';

import { useEffect, useState } from 'react';
import { useWallet } from '@/components/WalletButton';
import { games, statusLabel } from '@/data/games';
import { botChain, service } from '@/lib/chain';
import { Thumb } from './GameList';

// The frontend gate only hides this screen. Every privileged action must be enforced by the API
// (PRD 6.9); with no API connected, every write control is disabled and says why.

const areas = [
  { id: 'submissions', label: 'Submissions' },
  { id: 'games', label: 'Games' },
  { id: 'seasons', label: 'Seasons' },
  { id: 'scores', label: 'Score review' },
  { id: 'health', label: 'Health' },
] as const;
type Area = (typeof areas)[number]['id'];

const OFFLINE = 'Needs the review service';

function Offline({ cols, children }: { cols: number; children: React.ReactNode }) {
  return (
    <tr>
      <td colSpan={cols}>
        <p className="empty empty--inline">{children}</p>
      </td>
    </tr>
  );
}

function Rail({ id, title, items }: { id: string; title: string; items: string[] }) {
  return (
    <section className="card" aria-labelledby={id}>
      <div className="card__head">
        <h2 id={id} className="card__title">{title}</h2>
      </div>
      <ul className="rules">
        {items.map((i) => <li key={i}>{i}</li>)}
      </ul>
    </section>
  );
}

function Submissions() {
  return (
    <div className="with-rail">
    <section className="card" aria-labelledby="queue-title">
      <div className="card__head">
        <h2 id="queue-title" className="card__title">Review queue</h2>
        <span className="card__meta">Oldest first</span>
      </div>
      <table className="table table--flush">
        <thead>
          <tr><th>Game</th><th>Developer</th><th className="num">Submitted</th><th>Integration</th><th>Status</th><th className="num">Action</th></tr>
        </thead>
        <tbody>
          <Offline cols={6}>
            <strong>Review service not connected.</strong> Submissions appear here, oldest first, once it is. Each one
            can be approved, sent back with requested changes, or rejected with a reason.
          </Offline>
        </tbody>
      </table>
    </section>
    <Rail
      id="check-title"
      title="Review checklist"
      items={[
        'Play the demo on a desktop and a phone.',
        'Confirm the licence covers code, art, audio and name.',
        'No ads, trackers or remote scripts; the bridge reports a score.',
      ]}
    />
    </div>
  );
}

function Games() {
  return (
    <section className="card" aria-labelledby="avail-title">
      <div className="card__head">
        <h2 id="avail-title" className="card__title">Availability</h2>
        <span className="card__meta">Changes are logged</span>
      </div>
      <table className="table table--flush">
        <thead>
          <tr><th>Game</th><th>Status now</th><th>Set status</th><th>Reason shown to players</th></tr>
        </thead>
        <tbody>
          {games.map((g) => (
            <tr key={g.id}>
              <td>
                <div className="game-cell">
                  <Thumb game={g} />
                  <span className="game-cell__name">{g.name}</span>
                </div>
              </td>
              <td><span className={`pill pill--${g.availability}`}>{statusLabel[g.availability]}</span></td>
              <td>
                <label className="select select--sm">
                  <span className="sr-only">Set status for {g.name}</span>
                  <select defaultValue={g.availability} disabled title={OFFLINE}>
                    {Object.entries(statusLabel).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </label>
              </td>
              <td className="muted reason-cell">{g.reason ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="card__note">Status changes are disabled: {OFFLINE.toLowerCase()} to record who changed what.</p>
    </section>
  );
}

function Seasons() {
  const rows: [string, string][] = [
    ['Start', 'Not set'],
    ['End', 'Not set'],
    ['Reward pool', 'Not funded'],
    ['Reward asset', 'GGI (unverified)'],
    ['Cap per wallet per day', 'Not set'],
    ['Minimum claim', 'None'],
    ['Network', `${botChain.name} (${botChain.id})`],
    ['Reward vault', service.rewardVault ?? 'Not deployed'],
  ];
  return (
    <div className="with-rail">
      <section className="card" aria-labelledby="season-cfg-title">
        <div className="card__head">
          <h2 id="season-cfg-title" className="card__title">Season 1</h2>
          <span className="pill">Not started</span>
        </div>
        <dl className="kv">
          {rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
        </dl>
        <div className="card__foot claim-row">
          <button type="button" className="btn btn--secondary" disabled>Edit season</button>
          <p className="muted">{OFFLINE}, and the vault for anything on-chain.</p>
        </div>
      </section>
      <div className="stack">
      <section className="card" aria-labelledby="pause-title">
        <div className="card__head">
          <h2 id="pause-title" className="card__title">Claims</h2>
        </div>
        <div className="switch-row">
          <div>
            <p className="switch-row__title">Pause claims <span className="pill">Unavailable</span></p>
            <p className="muted">New claims stop. Claims already confirmed stay valid.</p>
          </div>
          <span className="switch" aria-hidden />
        </div>
        <p className="card__note">The pause lives on the reward vault contract, which is not deployed. When it is, this switch sends the pause transaction from an operator wallet.</p>
      </section>
      <section className="card" aria-labelledby="signers-title">
        <div className="card__head">
          <h2 id="signers-title" className="card__title">Signers</h2>
        </div>
        <dl className="kv">
          <div><dt>Score attestor</dt><dd>Not configured</dd></div>
          <div><dt>Last rotated</dt><dd>—</dd></div>
          <div><dt>Admin and attestor</dt><dd>Separate keys</dd></div>
        </dl>
        <div className="card__foot claim-row">
          <button type="button" className="btn btn--danger" disabled>Revoke signer</button>
          <p className="muted">No signer to revoke.</p>
        </div>
      </section>
      </div>
    </div>
  );
}

function Scores() {
  return (
    <div className="with-rail">
    <section className="card" aria-labelledby="flags-title">
      <div className="card__head">
        <h2 id="flags-title" className="card__title">Flagged runs</h2>
        <span className="card__meta">Most recent first</span>
      </div>
      <table className="table table--flush">
        <thead>
          <tr><th>Player</th><th>Game</th><th className="num">Score</th><th className="num">Length</th><th>Flag</th><th className="num">Action</th></tr>
        </thead>
        <tbody>
          <Offline cols={6}>
            <strong>Score service not connected.</strong> Runs flagged by the checks (too fast for the game, over the
            ceiling, repeated patterns) appear here for a decision.
          </Offline>
        </tbody>
      </table>
    </section>
    <Rail
      id="flagrules-title"
      title="What the checks flag"
      items={[
        'A run shorter than the game’s minimum, or over its score ceiling.',
        'A session ID or claim nonce used twice.',
        'Too many sessions from one wallet, or one pattern across wallets.',
      ]}
    />
    </div>
  );
}

function Health() {
  const kpis = ['Wallets connected', 'Runs started', 'Runs completed', 'Scores rejected', 'Claims'];
  return (
    <>
      <dl className="kpis kpis--5">
        {kpis.map((k) => (
          <div key={k}><dt>{k}</dt><dd className="num dash">—</dd><p className="kpis__note">Service not connected</p></div>
        ))}
      </dl>
      <p className="card__note">Only figures backed by real logs or on-chain events appear here. Nothing is estimated.</p>
      <section className="card admin-log" aria-labelledby="log-title">
        <div className="card__head">
          <h2 id="log-title" className="card__title">Change log</h2>
          <span className="card__meta">Every operator change, newest first</span>
        </div>
        <table className="table table--flush">
          <thead>
            <tr><th className="num">When</th><th>Operator</th><th>Change</th><th>Before</th><th>After</th></tr>
          </thead>
          <tbody>
            <Offline cols={5}>No changes logged. Status changes, season edits, pauses and signer rotations are recorded here with the wallet that made them.</Offline>
          </tbody>
        </table>
      </section>
    </>
  );
}

export function Admin() {
  const w = useWallet();
  const [mounted, setMounted] = useState(false);
  const [preview, setPreview] = useState(false);
  const [area, setArea] = useState<Area>('submissions');

  useEffect(() => {
    setMounted(true);
    // Development-only preview of the operator view, for design review without an operator wallet.
    if (process.env.NODE_ENV !== 'production') setPreview(new URLSearchParams(window.location.search).get('preview') === 'operator');
    const fromHash = () => {
      const h = window.location.hash.slice(1) as Area;
      if (areas.some((a) => a.id === h)) setArea(h);
    };
    fromHash();
    window.addEventListener('hashchange', fromHash);
    return () => window.removeEventListener('hashchange', fromHash);
  }, []);

  const isOperator = mounted && ((!!w.address && service.adminWallets.includes(w.address.toLowerCase())) || preview);

  if (!isOperator) {
    return (
      <div className="title-row">
        <div>
          <h1>Admin</h1>
          <p className="title-row__line">
            This area is for Klynt operators. {mounted && w.isConnected ? 'This wallet is not an operator wallet.' : 'Connect an operator wallet.'}
          </p>
        </div>
        {mounted && !w.isConnected && w.hasInjected && (
          <button type="button" className="btn btn--primary" onClick={w.connect}>Connect wallet</button>
        )}
      </div>
    );
  }

  const current = areas.find((a) => a.id === area)!;
  return (
    <>
      <div className="title-row">
        <div>
          <h1>{current.label}</h1>
          <p className="title-row__line">
            {preview ? 'Operator preview (development only). ' : ''}
            {service.api ? 'Connected to the review service.' : 'Review service not connected. Every change is disabled until it is.'}
          </p>
        </div>
      </div>
      <nav className="tabs" aria-label="Admin areas">
        {areas.map((a) => (
          <a key={a.id} href={`#${a.id}`} className="tab" aria-current={a.id === area ? 'page' : undefined}>{a.label}</a>
        ))}
      </nav>
      <div className="admin-body">
        {area === 'submissions' && <Submissions />}
        {area === 'games' && <Games />}
        {area === 'seasons' && <Seasons />}
        {area === 'scores' && <Scores />}
        {area === 'health' && <Health />}
      </div>
    </>
  );
}
