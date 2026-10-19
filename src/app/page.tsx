import Link from 'next/link';
import { WalletLink } from '@/components/WalletButton';
import { Reveal } from '@/components/home/Reveal';
import { Showcase } from '@/components/home/Showcase';
import { Stages } from '@/components/home/Stages';
import { PaidCaption } from '@/components/app/RewardText';
import { botChain, explorerUrl, faucetUrl, service } from '@/lib/chain';
import '@/styles/home.css';

const faq: [string, string][] = [
  [
    'Do I need a wallet to play?',
    'No. Every game in Practice runs without one. You need a wallet for ranked play and for claiming, and Klynt will never ask for your seed phrase or private key.',
  ],
  [
    'Can I earn GGI right now?',
    'No. GGI is the token named by the original Galaxy Gaming site, and Klynt has not yet verified its contract or its right to distribute it. Until both are confirmed, rewards stay off. Any test season will use clearly labelled testnet points.',
  ],
  [
    'How are scores checked?',
    'Each ranked run gets a session ID from the server. When it ends, the server checks the time played, the score against what is possible in that time, and whether the session was already used. Only accepted scores rank.',
  ],
  [
    'Is it cheat-proof?',
    'No browser game is. Checking blocks the obvious attacks, suspicious runs go to review, and operators can pause rewards. We publish what the checks cover and what they do not.',
  ],
  [
    'Which network is this?',
    'BOT Chain. Testnet first: chain ID 968, explorer scan.bohr.life. Mainnet, chain ID 677, only after the reward contract has been reviewed.',
  ],
  [
    'Where did these games come from?',
    'They are open-source games, credited on each game’s page and below. Klynt hosts them; their authors made them.',
  ],
  [
    'Can I put my game on Klynt?',
    'Yes. Submit it for review. Approved games join the catalogue; nothing goes live automatically.',
  ],
];

const blocks = [
  { l: 'K', bg: 'var(--accent)', h: 100 },
  { l: 'L', bg: 'var(--field-coloron)', h: 72 },
  { l: 'Y', bg: 'var(--field-red)', h: 88 },
  { l: 'N', bg: 'var(--field-tower)', h: 64 },
  { l: 'T', bg: 'var(--paper)', h: 80 },
];

export default function Home() {
  return (
    <>
      <Reveal />
      <header className="hero">
        <svg className="hero__hex" viewBox="0 0 100 86.6" aria-hidden focusable="false">
          <polygon points="25,0 75,0 100,43.3 75,86.6 25,86.6 0,43.3" />
        </svg>
        <nav className="nav" aria-label="Main">
          <Link href="/" className="wordmark" aria-label="Klynt, home">
            <svg viewBox="0 0 100 86.6" aria-hidden><polygon points="25,0 75,0 100,43.3 75,86.6 25,86.6 0,43.3" /></svg>
            Klynt
          </Link>
          <ul className="nav__links">
            <li><Link href="/games">Games</Link></li>
            <li><Link href="/leaderboard">Leaderboard</Link></li>
            <li><Link href="/rewards">Rewards</Link></li>
            <li><Link href="/submit-game">Submit a game</Link></li>
            <li><WalletLink className="nav__wallet" /></li>
          </ul>
          <Link href="/games" className="nav__menu">Games</Link>
        </nav>
        <div className="hero__copy">
          <h1 className="hero__title">
            Games on <br />BOT Chain
          </h1>
          <p className="hero__line">
            Play casual games in your browser, rank on checked leaderboards, and claim capped rewards on BOT Chain
            when a season is funded.
          </p>
          <div className="hero__actions">
            <Link href="/games" className="btn-hex">Choose a game</Link>
            <a href="#how" className="text-link">How scores are checked</a>
          </div>
        </div>
      </header>

      <main>
        <Showcase />
        <Stages />

        <section className="paid chapter" aria-labelledby="paid-title" data-reveal>
          <h2 id="paid-title" className="paid__title" data-reveal-item style={{ ['--i' as string]: 0 }}>
            Paid out so far
          </h2>
          <div className="paid__figure-wrap" data-reveal-item style={{ ['--i' as string]: 1 }}>
            <p className="paid__figure">
              0<sup>GGI</sup>
            </p>
            <p className="paid__caption">
              <PaidCaption />
            </p>
          </div>
          <Link href="/rewards" className="paid__source">
            Reward vault: {service.rewardVault ? 'deployed' : 'not deployed'} · {botChain.name} {botChain.id}
          </Link>
        </section>

        <section className="faq" aria-labelledby="faq-title">
          <div className="faq__head">
            <h2 id="faq-title" className="faq__title">Questions</h2>
          </div>
          {faq.map(([q, a]) => (
            <div className="faq__band" key={q} data-reveal>
              <h3 className="faq__q" data-reveal-item style={{ ['--i' as string]: 0 }}>{q}</h3>
              <p className="faq__a" data-reveal-item style={{ ['--i' as string]: 1 }}>{a}</p>
            </div>
          ))}
        </section>

        <section className="creators" aria-labelledby="creators-title" data-reveal>
          <div className="creators__tile creators__tile--pic" data-reveal-item style={{ ['--i' as string]: 0 }}>
            <img src="/shots/radius-raid.png" alt="Radius Raid in play" width={1280} height={800} />
          </div>
          <div className="creators__tile creators__tile--main" data-reveal-item style={{ ['--i' as string]: 1 }}>
            <h2 id="creators-title" className="creators__title">Bring your game</h2>
            <p className="creators__text">
              Klynt handles the wallet, the leaderboard and the payouts. You send a playable browser game and
              confirm you own it.
            </p>
            <Link href="/submit-game" className="btn-hex">Submit a game</Link>
          </div>
          <div className="creators__tile creators__tile--pic" data-reveal-item style={{ ['--i' as string]: 2 }}>
            <img src="/shots/coloron.png" alt="Coloron in play" width={1280} height={800} />
          </div>
        </section>
      </main>

      <footer className="footer">
        <svg className="footer__mark" viewBox="0 0 1004 240" role="img" aria-label="Klynt">
          {blocks.map((b, i) => {
            const w = 197.6;
            const x = i * (w + 4);
            const h = (b.h / 100) * 240;
            return (
              <g key={b.l}>
                <rect x={x} y={240 - h} width={w} height={h} fill={b.bg} />
                <text x={x + w / 2} y={232} textAnchor="middle" className="footer__letter">{b.l}</text>
              </g>
            );
          })}
        </svg>
        <div className="footer__cols">
          <div>
            <h2 className="footer__h">Play</h2>
            <ul>
              <li><Link href="/games">Games</Link></li>
              <li><Link href="/leaderboard">Leaderboard</Link></li>
              <li><Link href="/rewards">Rewards</Link></li>
            </ul>
          </div>
          <div>
            <h2 className="footer__h">Creators</h2>
            <ul>
              <li><Link href="/submit-game">Submit a game</Link></li>
              <li><Link href="/submit-game#requirements">Integration guide</Link></li>
            </ul>
          </div>
          <div>
            <h2 className="footer__h">Chain</h2>
            <ul>
              <li><a href={explorerUrl} rel="noopener noreferrer" target="_blank">Testnet explorer</a></li>
              <li><a href={faucetUrl} rel="noopener noreferrer" target="_blank">Testnet faucet</a></li>
            </ul>
          </div>
          <div>
            <h2 className="footer__h">Rules</h2>
            <ul>
              <li><Link href="/leaderboard">Rules for scores</Link></li>
              <li><Link href="/rewards#rules">Rules for rewards</Link></li>
            </ul>
          </div>
          <p className="footer__credits">
            Games by their authors: Hextris by Logan Engstrom, Garrett Finucane, Noah Moroze and Michael Yang
            (GPL-3.0); Tower Blocks by ste-vg (MIT); Astray by wwwtyro (public domain); Radius Raid by Jack Rugile
            (MIT); Coloron by greghub (Apache-2.0).
          </p>
        </div>
        <div className="footer__last">
          <p>© 2026 Klynt</p>
          <Link href="/games" className="footer__btn">Choose a game</Link>
        </div>
      </footer>
    </>
  );
}
