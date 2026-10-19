'use client';

import { useState } from 'react';
import { botChain } from '@/lib/chain';

// One example session carried through the four stages. Labelled "Example" on the fragment:
// it explains the mechanism and is not activity on Klynt.
const example = {
  session: 'ses_7Q2KD9',
  started: '21:04:12',
  ended: '21:07:48',
  lengthS: 216,
  score: 1340,
  wallet: '0x9f3a…c21e',
};

const fmtLength = (s: number) => `${Math.floor(s / 60)} min ${s % 60} s`;

const stages = [
  {
    name: 'Play',
    clause: ['Play a round', 'of Hextris'],
    note: 'Practice runs need no wallet. Ranked runs start a session first.',
  },
  {
    name: 'Check',
    clause: ['The server', 'checks it'],
    note: 'A client-side score is never enough on its own. Rejections come with a reason.',
  },
  {
    name: 'Rank',
    clause: ['It ranks', 'this season'],
    note: 'High-score games rank by best accepted score in the season.',
  },
  {
    name: 'Claim',
    clause: ['Claim it', 'on BOT Chain'],
    note: 'One signature per claim, bound to your wallet and chain. Each nonce works once.',
  },
];

function Fragment({ stage }: { stage: number }) {
  if (stage === 0) {
    return (
      <div className="frag" data-ui>
        <p className="frag__label">Example session</p>
        <img className="frag__shot" src="/shots/hextris.png" alt="Hextris in play" width={1280} height={800} />
        <dl className="frag__rows">
          <div><dt>Session</dt><dd className="mono">{example.session}</dd></div>
          <div><dt>Started</dt><dd className="num">{example.started}</dd></div>
          <div><dt>Ended</dt><dd className="num">{example.ended}</dd></div>
          <div><dt>Length</dt><dd className="num">{fmtLength(example.lengthS)}</dd></div>
          <div><dt>Reported score</dt><dd className="num">{example.score.toLocaleString('en-GB')}</dd></div>
        </dl>
      </div>
    );
  }
  if (stage === 1) {
    const checks = [
      ['Played longer than the 20 s minimum', fmtLength(example.lengthS)],
      ['Under the score ceiling for this length', '1,340 of 50,000'],
      ['Session ID used once', example.session],
      ['No rate-limit flags', '0 flags'],
    ];
    return (
      <div className="frag" data-ui>
        <p className="frag__label">Example session · {example.session}</p>
        <ul className="frag__checks">
          {checks.map(([k, v]) => (
            <li key={k}>
              <svg className="frag__tick" viewBox="0 0 16 16" aria-hidden><path d="M3 8.5l3.2 3L13 4.5" fill="none" stroke="currentColor" strokeWidth="2" /></svg>
              <span>{k}</span>
              <span className="frag__val num">{v}</span>
            </li>
          ))}
        </ul>
        <p className="frag__result">
          <span className="frag__pill">Accepted</span>
          <span className="num">Score 1,340</span>
        </p>
      </div>
    );
  }
  if (stage === 2) {
    const rows = [
      [11, '0x51c8…e1a0', 1422],
      [12, example.wallet, example.score],
      [13, '0x07bd…44f2', 1295],
    ] as const;
    return (
      <div className="frag" data-ui>
        <p className="frag__label">Example board · Hextris · Season 1</p>
        <table className="frag__table">
          <thead>
            <tr><th className="num">Rank</th><th>Player</th><th className="num">Best score</th></tr>
          </thead>
          <tbody>
            {rows.map(([r, p, s]) => (
              <tr key={r} className={r === 12 ? 'is-you' : undefined}>
                <td className="num">{r}</td>
                <td className="mono">{p}</td>
                <td className="num">{s.toLocaleString('en-GB')}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="frag__foot">Ranked by best accepted score. Ties go to the earlier run.</p>
      </div>
    );
  }
  const fields: [string, string][] = [
    ['wallet', example.wallet],
    ['season', '1'],
    ['game', 'hextris'],
    ['asset', 'GGI (unverified)'],
    ['amount', 'set by the season’s pool'],
    ['nonce', 'clm_00412'],
    ['expires', '24 h after signing'],
    ['chainId', String(botChain.id)],
    ['contract', 'not deployed'],
  ];
  return (
    <div className="frag" data-ui>
      <p className="frag__label">Example claim · what the contract checks</p>
      <dl className="frag__rows frag__rows--code">
        {fields.map(([k, v]) => (
          <div key={k}><dt className="mono">{k}</dt><dd>{v}</dd></div>
        ))}
      </dl>
    </div>
  );
}

export function Stages() {
  const [stage, setStage] = useState(0);
  const s = stages[stage];
  return (
    <section className="stages" id="how" aria-labelledby="stages-title" data-reveal>
      <div className="stages__clause-field">
        <h2 id="stages-title" className="stages__clause" aria-live="polite" data-reveal-item style={{ ['--i' as string]: 0 }}>
          {s.clause[0]}
          <br />
          {s.clause[1]}
        </h2>
        <p className="stages__note" data-reveal-item style={{ ['--i' as string]: 1 }}>{s.note}</p>
      </div>
      <div className="stages__frag-field" data-reveal-item style={{ ['--i' as string]: 2 }}>
        <div className="stages__frag" key={stage}>
          <Fragment stage={stage} />
        </div>
      </div>
      <div className="stages__control">
        <label className="sr-only" htmlFor="stage-range">From game to chain: stage</label>
        <div className="stages__slider" style={{ ['--p' as string]: `${(stage / 3) * 100}%` }}>
        <span className="stages__track" aria-hidden><span className="stages__fill" /></span>
        <input
          id="stage-range"
          className="stages__range"
          type="range"
          min={0}
          max={3}
          step={1}
          value={stage}
          aria-valuetext={`${s.name}: ${s.clause.join(' ')}`}
          onChange={(e) => setStage(Number(e.target.value))}
        />
        </div>
        <ol className="stages__names">
          {stages.map((st, i) => (
            <li key={st.name}>
              <button type="button" aria-current={i === stage ? 'step' : undefined} onClick={() => setStage(i)}>
                {st.name}
              </button>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
