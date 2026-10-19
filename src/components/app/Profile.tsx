'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { formatUnits } from 'viem';
import { useBalance } from 'wagmi';
import { useWallet } from '@/components/WalletButton';
import { live, useAuth, useMe, useRewards, useRewardSummary } from '@/lib/api';
import { games, getGame, isPlayable } from '@/data/games';
import { botChain, shortAddress } from '@/lib/chain';
import { bestByGame, formatDuration, formatScore, formatWhen, usePracticeRuns } from '@/lib/practice';
import { Thumb } from './GameList';
import { IconCopy } from './icons';

const playable = games.filter(isPlayable);

export function Profile() {
  const w = useWallet();
  const all = usePracticeRuns();
  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showAll, setShowAll] = useState(false);
  useEffect(() => setMounted(true), []);
  const connected = mounted && w.isConnected && !!w.address;
  const runs = mounted ? all : [];
  const best = bestByGame(runs);
  const gamesPlayed = new Set(runs.map((r) => r.gameId)).size;
  const balance = useBalance({ address: w.address, chainId: botChain.id, query: { enabled: connected && !w.wrongNetwork } });
  const balanceText = !connected
    ? '—'
    : w.wrongNetwork
      ? '—'
      : balance.isLoading
        ? '…'
        : balance.data
          ? Number(formatUnits(balance.data.value, balance.data.decimals)).toLocaleString('en-GB', { minimumFractionDigits: 4, maximumFractionDigits: 4 })
          : '—';
  const recent = runs.slice(0, showAll ? 20 : 5);
  const auth = useAuth();
  const me = useMe(auth.signedIn);
  const rankedRuns = me.data?.accepted ?? 0;
  const rewards = useRewardSummary();
  const rewardData = useRewards().data;
  const amount = (v?: string) => (v && rewardData?.season ? Number(BigInt(v) / 10n ** BigInt(Math.max(0, rewardData.season.decimals - 4))) / 10_000 : 0);
  const mine = rewardData?.me;

  return (
    <>
      <div className="title-row">
        <div>
          {connected ? (
            <h1 className="title-address">
              <span className="mono">{shortAddress(w.address)}</span>
              <button
                type="button"
                className="icon-btn"
                aria-label="Copy address"
                onClick={async () => {
                  await navigator.clipboard.writeText(w.address!).catch(() => {});
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1400);
                }}
              >
                <IconCopy />
              </button>
              {copied && <span className="copied">Copied</span>}
            </h1>
          ) : (
            <h1>Profile</h1>
          )}
          <p className="title-row__line">
            {connected
              ? `${botChain.name} · ranked runs and rewards follow this wallet`
              : 'Connect a wallet to see ranked runs and rewards. Practice runs on this device are below.'}
          </p>
        </div>
        {mounted && !connected && (
          w.hasInjected ? (
            <button type="button" className="btn btn--primary" onClick={w.connect} disabled={w.connecting}>
              {w.connecting ? 'Connecting…' : 'Connect wallet'}
            </button>
          ) : (
            <a className="btn btn--primary" href="https://metamask.io/download/" target="_blank" rel="noopener noreferrer">Get a wallet</a>
          )
        )}
      </div>

      {connected && w.wrongNetwork && (
        <div className="notice notice--row profile-notice">
          <span>Your wallet is on chain {w.chainId}. Klynt uses {botChain.name} ({botChain.id}).</span>
          <button type="button" className="btn btn--secondary" onClick={w.switchNetwork} disabled={w.switching}>Switch network</button>
        </div>
      )}

      <dl className="kpis">
        <div><dt>Ranked runs</dt><dd className="num">{rankedRuns}</dd><p className="kpis__note">{!live ? 'Ranking not live yet' : auth.signedIn ? `${me.data?.rejected ?? 0} rejected` : 'Sign in to see them'}</p></div>
        <div><dt>Practice runs</dt><dd className="num">{runs.length}</dd><p className="kpis__note">On this device</p></div>
        <div><dt>Games played</dt><dd className="num">{gamesPlayed} <span className="unit">of {playable.length}</span></dd><p className="kpis__note">Playable now</p></div>
        <div><dt>BOT balance</dt><dd className="num">{balanceText}</dd><p className="kpis__note">{connected ? 'Read from the chain' : 'No wallet connected'}</p></div>
      </dl>

      <div className="with-rail">
        <section className="card" aria-labelledby="bests-title">
            <div className="card__head">
              <h2 id="bests-title" className="card__title">Best by game</h2>
              <span className="card__meta">Practice, on this device</span>
            </div>
            <table className="table table--flush">
              <thead>
                <tr>
                  <th>Game</th>
                  <th className="num">Best</th>
                  <th className="num col-when">When</th>
                  <th className="num col-len">Length</th>
                  <th aria-hidden />
                </tr>
              </thead>
              <tbody>
                {playable.map((g) => {
                  const b = best.get(g.id);
                  return (
                    <tr key={g.id}>
                      <td>
                        <div className="game-cell">
                          <Thumb game={g} />
                          <div>
                            <Link href={`/games/${g.id}`} className="game-cell__name">{g.name}</Link>
                            <p className="game-cell__line">{b ? formatWhen(b.endedAt) : 'No runs yet'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="num">{b ? formatScore(b.score) : <span className="muted">—</span>}</td>
                      <td className="num col-when muted">{b ? formatWhen(b.endedAt) : '—'}</td>
                      <td className="num col-len muted">{b ? formatDuration(b.durationMs) : '—'}</td>
                      <td className="num"><Link href={`/play/${g.id}`} className="text-action">Play</Link></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        <section className="card" aria-labelledby="earn-title">
            <div className="card__head">
              <h2 id="earn-title" className="card__title">Rewards</h2>
              <span className={`pill${rewards.on ? ' pill--ranked' : ''}`}>{rewards.loading ? 'Checking…' : rewards.on ? 'On' : 'Off'}</span>
            </div>
            <dl className="kv">
              <div><dt>Earned</dt><dd className="num">{amount(mine?.earned)} {rewards.symbol}</dd></div>
              <div><dt>Pending</dt><dd className="num">{amount(mine?.pending)} {rewards.symbol}</dd></div>
              <div><dt>Claimable</dt><dd className="num">{amount(mine?.claimable)} {rewards.symbol}</dd></div>
              <div><dt>Claimed</dt><dd className="num">{amount(mine?.claimed)} {rewards.symbol}</dd></div>
              <div><dt>Claim transactions</dt><dd className="num">{mine?.history.filter((h) => h.status === 'confirmed').length || 'None yet'}</dd></div>
            </dl>
            <p className="card__note">
              {rewards.on
                ? <>{rewards.isTest ? 'Testnet points with no value. ' : ''}<Link href="/rewards" className="text-action">Claim on the Rewards page</Link></>
                : <>Nothing earned. Rewards are off. <Link href="/rewards" className="text-action">Why</Link></>}
            </p>
          </section>
      </div>

      <div className="with-rail with-rail--top">
        <section className="card" aria-labelledby="recent-title">
            <div className="card__head">
              <h2 id="recent-title" className="card__title">Recent runs</h2>
              <span className="card__meta">On this device</span>
            </div>
            {recent.length ? (
              <ul className="mini-list">
                {recent.map((r) => (
                  <li key={r.id}>
                    <div className="mini-list__text">
                      <p className="mini-list__name">{getGame(r.gameId)?.name ?? r.gameId}</p>
                      <p className="mini-list__sub">{formatWhen(r.endedAt)} · {formatDuration(r.durationMs)}</p>
                    </div>
                    <p className="mini-list__value num">{formatScore(r.score)}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <>
                <p className="empty">No runs on this device yet. <Link href="/games" className="text-action">Choose a game</Link></p>
                <ul className="rules rules--spaced">
                  <li>Every run you finish in Practice is listed here, newest first.</li>
                  <li>Practice runs stay in this browser. They never rank and never earn.</li>
                  <li>Clearing your browser data removes them.</li>
                </ul>
              </>
            )}
            {runs.length > 5 && (
              <button type="button" className="btn btn--secondary view-all" onClick={() => setShowAll((v) => !v)}>
                {showAll ? 'Show fewer' : `View all ${Math.min(runs.length, 20)}`}
              </button>
            )}
          </section>
        <section className="card" aria-labelledby="placements-title">
            <div className="card__head">
              <h2 id="placements-title" className="card__title">Placements</h2>
              {live && connected && !auth.signedIn ? (
                <button type="button" className="text-action" onClick={auth.signIn} disabled={auth.signing}>
                  {auth.signing ? 'Check your wallet…' : 'Sign in to rank'}
                </button>
              ) : (
                <span className="card__meta">Season 1</span>
              )}
            </div>
            <ul className="mini-list">
              {playable.map((g) => {
                const p = me.data?.games[g.id];
                return (
                  <li key={g.id}>
                    <div className="mini-list__text">
                      <p className="mini-list__name">{g.name}</p>
                      <p className="mini-list__sub">
                        {!live ? 'Board opens with score checking' : p ? `Best ${formatScore(p.best)} · ${formatWhen(new Date(p.at).toISOString())}` : 'No accepted run yet'}
                      </p>
                    </div>
                    <p className={p?.rank ? 'mini-list__value num' : 'mini-list__value'}>{p?.rank ? `Rank ${p.rank}` : 'Not ranked'}</p>
                  </li>
                );
              })}
            </ul>
            {auth.error && <p className="field__error">{auth.error}</p>}
          </section>
      </div>
    </>
  );
}
