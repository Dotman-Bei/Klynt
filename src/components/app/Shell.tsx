'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { getGame } from '@/data/games';
import { addressUrl, botChain, service, shortAddress } from '@/lib/chain';
import { useWallet } from '@/components/WalletButton';
import { IconAdmin, IconCopy, IconExternal, IconGames, IconMore, IconProfile, IconRanks, IconRewards, IconSubmit } from './icons';

const main = [
  { href: '/games', label: 'Games', short: 'Games', Icon: IconGames },
  { href: '/leaderboard', label: 'Leaderboard', short: 'Ranks', Icon: IconRanks },
  { href: '/rewards', label: 'Rewards', short: 'Rewards', Icon: IconRewards },
  { href: '/profile', label: 'Profile', short: 'Profile', Icon: IconProfile },
];

function useIsAdmin() {
  const { address } = useWallet();
  return !!address && service.adminWallets.includes(address.toLowerCase());
}

function Mark() {
  return (
    <Link href="/" className="app-mark" aria-label="Klynt, home">
      <svg viewBox="0 0 100 86.6" aria-hidden><polygon points="25,0 75,0 100,43.3 75,86.6 25,86.6 0,43.3" /></svg>
      <span>Klynt</span>
    </Link>
  );
}

function Crumbs() {
  const path = usePathname();
  const parts = path.split('/').filter(Boolean);
  const names: Record<string, string> = {
    games: 'Games',
    leaderboard: 'Leaderboard',
    rewards: 'Rewards',
    profile: 'Profile',
    'submit-game': 'Submit a game',
    admin: 'Admin',
  };
  const crumbs = parts.map((p, i) => ({
    href: '/' + parts.slice(0, i + 1).join('/'),
    label: names[p] ?? getGame(p)?.name ?? p,
  }));
  return (
    <nav className="crumbs" aria-label="Breadcrumb">
      {crumbs.map((c, i) =>
        i < crumbs.length - 1 ? (
          <span key={c.href}>
            <Link href={c.href}>{c.label}</Link>
            <span className="crumbs__sep" aria-hidden>/</span>
          </span>
        ) : (
          <span key={c.href} aria-current="page">{c.label}</span>
        ),
      )}
    </nav>
  );
}

export function WalletSwitcher({ compact = false }: { compact?: boolean }) {
  const w = useWallet();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  if (!mounted) return <span className="switcher__placeholder" />;

  if (!w.isConnected || !w.address) {
    if (!w.hasInjected) {
      return (
        <a className="btn btn--primary" href="https://metamask.io/download/" target="_blank" rel="noopener noreferrer">
          Get a wallet
        </a>
      );
    }
    return (
      <button type="button" className="btn btn--primary" onClick={w.connect} disabled={w.connecting}>
        {w.connecting ? 'Connecting…' : 'Connect wallet'}
      </button>
    );
  }

  return (
    <div className="switcher" ref={ref}>
      <button type="button" className="switcher__btn" aria-expanded={open} aria-haspopup="menu" onClick={() => setOpen((o) => !o)}>
        <span className={`switcher__dot${w.wrongNetwork ? ' is-wrong' : ''}`} aria-hidden />
        {!compact && <span className="switcher__net">{w.wrongNetwork ? 'Wrong network' : botChain.name}</span>}
        <span className="mono">{shortAddress(w.address)}</span>
      </button>
      {open && (
        <div className="menu" role="menu">
          <p className="menu__meta">{w.wrongNetwork ? `Your wallet is on chain ${w.chainId}.` : `Connected to ${botChain.name} (${botChain.id})`}</p>
          {w.wrongNetwork && (
            <button type="button" role="menuitem" className="menu__item" onClick={w.switchNetwork}>
              Switch to {botChain.name}
            </button>
          )}
          <button
            type="button"
            role="menuitem"
            className="menu__item"
            onClick={async () => {
              await navigator.clipboard.writeText(w.address!).catch(() => {});
              setCopied(true);
              setTimeout(() => setCopied(false), 1400);
            }}
          >
            <IconCopy /> {copied ? 'Copied' : 'Copy address'}
          </button>
          <a role="menuitem" className="menu__item" href={addressUrl(w.address)} target="_blank" rel="noopener noreferrer">
            <IconExternal /> View on explorer
          </a>
          <Link role="menuitem" className="menu__item" href="/profile" onClick={() => setOpen(false)}>
            <IconProfile /> Profile
          </Link>
          <button type="button" role="menuitem" className="menu__item" onClick={() => { w.disconnect(); setOpen(false); }}>
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const isAdmin = useIsAdmin();
  const [sheet, setSheet] = useState(false);
  useEffect(() => setSheet(false), [path]);
  const active = (href: string) => path === href || path.startsWith(href + '/');

  return (
    <div className="app">
      <aside className="sidebar" aria-label="Main">
        <div className="sidebar__top"><Mark /></div>
        <nav className="sidebar__nav">
          <ul>
            {main.map(({ href, label, Icon }) => (
              <li key={href}>
                <Link href={href} className="nav-item" aria-current={active(href) ? 'page' : undefined}>
                  <Icon /> {label}
                </Link>
              </li>
            ))}
          </ul>
          <p className="sidebar__group">Creators</p>
          <ul>
            <li>
              <Link href="/submit-game" className="nav-item" aria-current={active('/submit-game') ? 'page' : undefined}>
                <IconSubmit /> Submit a game
              </Link>
            </li>
            {isAdmin && (
              <li>
                <Link href="/admin" className="nav-item" aria-current={active('/admin') ? 'page' : undefined}>
                  <IconAdmin /> Admin
                </Link>
              </li>
            )}
          </ul>
        </nav>
        <p className="sidebar__foot">
          {botChain.name} · chain {botChain.id}
        </p>
      </aside>

      <header className="topbar">
        <div className="topbar__mark"><Mark /></div>
        <Crumbs />
        <div className="topbar__right">
          <WalletSwitcher />
        </div>
      </header>

      <main className="canvas" id="main">{children}</main>

      <nav className="bottombar" aria-label="Main">
        {main.map(({ href, short, Icon }) => (
          <Link key={href} href={href} className="bottombar__item" aria-current={active(href) ? 'page' : undefined}>
            <Icon />
            <span>{short}</span>
          </Link>
        ))}
        <button type="button" className="bottombar__item" aria-expanded={sheet} onClick={() => setSheet(true)}>
          <IconMore />
          <span>More</span>
        </button>
      </nav>

      {sheet && (
        <div className="sheet-backdrop" onClick={() => setSheet(false)}>
          <div className="phone-sheet" role="dialog" aria-modal="true" aria-label="More" onClick={(e) => e.stopPropagation()}>
            <div className="phone-sheet__wallet"><WalletSwitcher /></div>
            <Link href="/submit-game" className="phone-sheet__item"><IconSubmit /> Submit a game</Link>
            <Link href="/leaderboard#rules" className="phone-sheet__item"><IconRanks /> How ranks work</Link>
            <Link href="/rewards#rules" className="phone-sheet__item"><IconRewards /> Rules for rewards</Link>
            {isAdmin && <Link href="/admin" className="phone-sheet__item"><IconAdmin /> Admin</Link>}
            <Link href="/" className="phone-sheet__item">About Klynt</Link>
            <button type="button" className="btn btn--secondary phone-sheet__close" onClick={() => setSheet(false)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
