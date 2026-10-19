// Game submission fields and validation, shared by the form and the API so both check the same rules.

export type Draft = {
  name: string;
  category: string;
  description: string;
  demoUrl: string;
  repoUrl: string;
  hosting: string;
  integration: string;
  developer: string;
  contact: string;
  wallet: string;
  ownsRights: boolean;
  acceptsRemoval: boolean;
};

export const empty: Draft = {
  name: '', category: '', description: '', demoUrl: '', repoUrl: '', hosting: '', integration: '',
  developer: '', contact: '', wallet: '', ownsRights: false, acceptsRemoval: false,
};

export const MAX_DESC = 280;

const isUrl = (v: string) => {
  try {
    const u = new URL(v);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
};

export function validate(d: Draft): Partial<Record<keyof Draft, string>> {
  const e: Partial<Record<keyof Draft, string>> = {};
  if (!d.name.trim()) e.name = 'Give the game a name.';
  else if (d.name.length > 60) e.name = 'Keep the name under 60 characters.';
  if (!d.category) e.category = 'Choose the category that fits best.';
  if (d.description.trim().length < 20) e.description = 'Describe the game in at least 20 characters.';
  else if (d.description.length > MAX_DESC) e.description = `Keep it to ${MAX_DESC} characters.`;
  if (!isUrl(d.demoUrl)) e.demoUrl = 'Add a link where the game can be played, starting with https://.';
  if (d.repoUrl && !isUrl(d.repoUrl)) e.repoUrl = 'That isn’t a link. Leave it empty if there is no public repository.';
  if (!d.hosting) e.hosting = 'Say where the files will live.';
  if (!d.integration) e.integration = 'Choose how the game will report scores.';
  if (!d.developer.trim()) e.developer = 'Add your name or your team’s.';
  if (!/^\S+@\S+\.\S+$/.test(d.contact) && !/^@\w{3,}$/.test(d.contact)) e.contact = 'Use an email address or a Telegram handle such as @klyntdev.';
  if (d.wallet && !/^0x[a-fA-F0-9]{40}$/.test(d.wallet)) e.wallet = 'A wallet address is 0x followed by 40 letters and numbers.';
  if (!d.ownsRights) e.ownsRights = 'Klynt can only host games you have the rights to.';
  if (!d.acceptsRemoval) e.acceptsRemoval = 'Please confirm this to continue.';
  return e;
}

/** Keeps only known fields with the right types, so nothing else is stored. */
export function clean(input: unknown): Draft {
  const o = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const out = { ...empty };
  for (const k of Object.keys(empty) as (keyof Draft)[]) {
    const v = o[k];
    if (typeof empty[k] === 'boolean') (out as Record<string, unknown>)[k] = v === true;
    else (out as Record<string, unknown>)[k] = typeof v === 'string' ? v.slice(0, 2000) : '';
  }
  return out;
}
