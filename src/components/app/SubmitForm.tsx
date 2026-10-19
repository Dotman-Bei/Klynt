'use client';

import { useEffect, useRef, useState } from 'react';
import { service } from '@/lib/chain';
import { nextStates, requirements } from './submitCopy';
import { MAX_DESC, empty, validate, type Draft } from '@/lib/submission';

const DRAFT_KEY = 'klynt:submission-draft';

export function SubmitForm() {
  const [d, setD] = useState<Draft>(empty);
  const [touched, setTouched] = useState<Partial<Record<keyof Draft, boolean>>>({});
  const [tried, setTried] = useState(false);
  const [result, setResult] = useState<{ kind: 'saved'; at: string } | { kind: 'sent'; id: string } | { kind: 'error'; msg: string } | null>(null);
  const [sending, setSending] = useState(false);
  const loaded = useRef(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) setD({ ...empty, ...JSON.parse(raw) });
    } catch {}
    loaded.current = true;
  }, []);

  const errors = validate(d);
  const show = (k: keyof Draft) => (tried || touched[k]) && errors[k];
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((prev) => ({ ...prev, [k]: v }));
  const field = (k: keyof Draft) => ({
    id: `f-${k}`,
    'aria-invalid': show(k) ? true : undefined,
    'aria-describedby': show(k) ? `e-${k}` : undefined,
    onBlur: () => setTouched((t) => ({ ...t, [k]: true })),
  });
  const err = (k: keyof Draft) => (show(k) ? <p className="field__error" id={`e-${k}`}>{errors[k]}</p> : null);

  const onSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setTried(true);
    setResult(null);
    if (Object.keys(errors).length) {
      document.getElementById(`f-${Object.keys(errors)[0]}`)?.focus();
      return;
    }
    if (!service.api) {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
        setResult({ kind: 'saved', at: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) });
      } catch {
        setResult({ kind: 'error', msg: 'This browser blocked saving. Copy your answers somewhere safe.' });
      }
      return;
    }
    setSending(true);
    try {
      const res = await fetch(`${service.api}/submissions`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(d) });
      if (!res.ok) throw new Error(String(res.status));
      const body = (await res.json()) as { id?: string };
      localStorage.removeItem(DRAFT_KEY);
      setResult({ kind: 'sent', id: body.id ?? '—' });
    } catch {
      setResult({ kind: 'error', msg: 'Couldn’t send it. Your answers are still here; try again in a minute.' });
    } finally {
      setSending(false);
    }
  };

  return (
    <form className="settings" onSubmit={onSubmit} noValidate>
      <section className="settings__row" aria-labelledby="s-game">
        <div className="settings__label">
          <h2 id="s-game">The game</h2>
          <p>What players will see in the catalogue. You can change it before approval.</p>
          <h3 className="settings__sub">What happens next</h3>
          <ol className="states states--compact">
            {nextStates.map(([state, line]) => (
              <li key={state}>
                <span className="states__name">{state}</span>
                <span className="muted">{line}</span>
              </li>
            ))}
          </ol>
        </div>
        <div className="settings__panel">
          <div className="field">
            <label htmlFor="f-name">Game name</label>
            <input {...field('name')} value={d.name} onChange={(e) => set('name', e.target.value)} maxLength={80} autoComplete="off" />
            {err('name')}
          </div>
          <div className="field">
            <label htmlFor="f-category">Category</label>
            <select {...field('category')} value={d.category} onChange={(e) => set('category', e.target.value)}>
              <option value="">Choose one</option>
              {['Puzzle', 'Arcade', 'Shooter', 'Stacking', 'Maze', 'Timing', 'Other'].map((c) => <option key={c}>{c}</option>)}
            </select>
            {err('category')}
          </div>
          <div className="field">
            <div className="field__labelrow">
              <label htmlFor="f-description">Description</label>
              <span className={`field__count num${d.description.length > MAX_DESC ? ' is-over' : ''}`}>{d.description.length} / {MAX_DESC}</span>
            </div>
            <textarea {...field('description')} rows={4} value={d.description} onChange={(e) => set('description', e.target.value)} />
            {err('description')}
          </div>
        </div>
      </section>

      <section className="settings__row" aria-labelledby="s-where">
        <div className="settings__label" id="requirements">
          <h2 id="s-where">Where it lives</h2>
          <p>A reviewer plays the demo link first. A public repository makes the licence check faster.</p>
          <h3 className="settings__sub">Requirements</h3>
          <ul className="reqs">
            {requirements.map((r) => <li key={r}>{r}</li>)}
          </ul>
        </div>
        <div className="settings__panel">
          <div className="field">
            <label htmlFor="f-demoUrl">Demo link</label>
            <input {...field('demoUrl')} type="url" inputMode="url" placeholder="https://" value={d.demoUrl} onChange={(e) => set('demoUrl', e.target.value)} />
            {err('demoUrl')}
          </div>
          <div className="field">
            <label htmlFor="f-repoUrl">Repository <span className="field__opt">optional</span></label>
            <input {...field('repoUrl')} type="url" inputMode="url" placeholder="https://" value={d.repoUrl} onChange={(e) => set('repoUrl', e.target.value)} />
            {err('repoUrl')}
          </div>
          <div className="field">
            <label htmlFor="f-hosting">Hosting</label>
            <select {...field('hosting')} value={d.hosting} onChange={(e) => set('hosting', e.target.value)}>
              <option value="">Choose one</option>
              <option value="klynt">Klynt hosts the files</option>
              <option value="embed">I host it, Klynt embeds it</option>
            </select>
            {err('hosting')}
          </div>
          <div className="field">
            <label htmlFor="f-integration">How it reports scores</label>
            <select {...field('integration')} value={d.integration} onChange={(e) => set('integration', e.target.value)}>
              <option value="">Choose one</option>
              <option value="bridge">Score bridge (postMessage)</option>
              <option value="unsure">Not sure yet</option>
            </select>
            {err('integration')}
          </div>
        </div>
      </section>

      <section className="settings__row" aria-labelledby="s-you">
        <div className="settings__label">
          <h2 id="s-you">You</h2>
          <p>Only operators see your contact details. A wallet is only needed if your game will hold rewards.</p>
        </div>
        <div className="settings__panel">
          <div className="field">
            <label htmlFor="f-developer">Developer or team name</label>
            <input {...field('developer')} value={d.developer} onChange={(e) => set('developer', e.target.value)} autoComplete="organization" />
            {err('developer')}
          </div>
          <div className="field">
            <label htmlFor="f-contact">Contact</label>
            <input {...field('contact')} placeholder="you@studio.dev or @handle" value={d.contact} onChange={(e) => set('contact', e.target.value)} autoComplete="email" />
            {err('contact')}
          </div>
          <div className="field">
            <label htmlFor="f-wallet">Wallet address <span className="field__opt">optional</span></label>
            <input {...field('wallet')} className="mono" placeholder="0x…" value={d.wallet} onChange={(e) => set('wallet', e.target.value.trim())} spellCheck={false} />
            {err('wallet')}
          </div>
        </div>
      </section>

      <section className="settings__row" aria-labelledby="s-rights">
        <div className="settings__label">
          <h2 id="s-rights">Rights</h2>
          <p>Klynt hosts only games whose code, art, audio and name you own or have a licence for.</p>
        </div>
        <div className="settings__panel">
          <label className="check">
            <input type="checkbox" {...field('ownsRights')} checked={d.ownsRights} onChange={(e) => set('ownsRights', e.target.checked)} />
            <span>I own or have a licence for all code, art, audio and names in this game.</span>
          </label>
          {err('ownsRights')}
          <label className="check">
            <input type="checkbox" {...field('acceptsRemoval')} checked={d.acceptsRemoval} onChange={(e) => set('acceptsRemoval', e.target.checked)} />
            <span>I understand Klynt may remove a game that breaks these rules or stops working.</span>
          </label>
          {err('acceptsRemoval')}
          <div className="settings__submit">
            <button type="submit" className="btn btn--primary" disabled={sending}>
              {sending ? 'Sending…' : service.api ? 'Send for review' : 'Save draft'}
            </button>
            {!service.api && <p className="muted">Submissions open when the review service launches.</p>}
          </div>
          <div aria-live="polite">
            {result?.kind === 'saved' && (
              <p className="notice settings__result">Draft saved on this device at {result.at}. Submissions open when the review service launches; your answers will be here.</p>
            )}
            {result?.kind === 'sent' && (
              <p className="notice notice--ok settings__result">Sent. Your submission <span className="mono">{result.id}</span> is Pending review. Nothing goes live until an operator approves it.</p>
            )}
            {result?.kind === 'error' && <p className="notice notice--bad settings__result">{result.msg}</p>}
            {tried && Object.keys(errors).length > 0 && (
              <p className="field__error">{Object.keys(errors).length} {Object.keys(errors).length === 1 ? 'answer needs' : 'answers need'} a look before this can be saved.</p>
            )}
          </div>
        </div>
      </section>
    </form>
  );
}
