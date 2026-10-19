# Klynt

Casual browser games on BOT Chain. Play in your browser, rank on checked leaderboards, and claim
capped rewards on BOT Chain once a season is funded.

**Status:** frontend and score service working on BOT Chain testnet (968). Rewards are off: the
reward vault is not built and the GGI token is not verified (see `Klynt_PRD.md` §9).

## What works today

- Six games in the catalogue. Hextris, Tower Blocks and Astray Master run on Klynt; Radius Raid and
  Coloron are open source and queued for integration; Fruit Ninja is on hold (no licence for its art).
- Wallet connection (MetaMask or any injected EVM wallet) on BOT Chain testnet.
- Sign-in by signing one message. No transaction, no gas, no keys leave the wallet.
- Ranked runs: the server starts a session, times the run itself, checks the score and ranks it.
- Per-game leaderboards for Season 1, player profiles, practice runs saved on the device.
- Game submissions stored as Pending review.

## Run it

Requires Node 22.5 or newer (the score service uses the built-in `node:sqlite`).

```bash
npm install
cp .env.example .env.local        # set KLYNT_SESSION_SECRET for anything beyond local dev
npm run dev                       # http://localhost:3000
```

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and server |
| `npm test` | Unit tests: score rules, sessions, ranking, sign-in |
| `npm run typecheck` | TypeScript |
| `node scripts/smoke-api.mjs [url]` | End-to-end check of the API with a throwaway wallet. It writes test runs to the database it hits, so point it at a dev database only. |

## How a ranked run works

```text
Play page            Score service (src/server, src/app/api)
  game starts   ->   POST /api/sessions          session ID, server clock starts
  game over     ->   POST /api/sessions/:id/submit
                       checks: signed-in wallet owns the session, session unused,
                       length >= game minimum and <= 2 h, score <= ceiling for the length
                     <- accepted (with rank) or rejected (with the reason)
Leaderboard     ->   GET /api/leaderboard?game=   best accepted score per wallet, ties to the earlier run
```

Games report scores through `public/games/klynt-bridge.js`, a same-origin `postMessage` bridge.
Rules live in `src/server/rules.ts` (version 1).

## Trust assumptions and limits

- **Scores are client-reported.** The server measures time itself and rejects anything impossible
  for that time, but a careful cheat within the bounds is not detected. Replay or server-side
  simulation would be the next step. Rewards must not be enabled on this check alone.
- **The rule values are first guesses** (minimum lengths and score ceilings per game) and need
  confirming with real play data before any season pays out.
- **Sign-in verifies plain EOA signatures** (`viem.verifyMessage`). Smart-contract wallets
  (ERC-1271) are not supported yet.
- **Rate limits are in memory**, per server process. A multi-instance deployment needs a shared store.
- **Storage is SQLite** in one file. Fine for a single server; swap `src/server/db.ts` for Postgres
  to scale out.
- **Admin is UI-only so far.** The admin screens hide behind `NEXT_PUBLIC_ADMIN_WALLETS`, but no
  admin API exists yet; it must check the signed-in wallet server-side when it is added.

## Game sources and licences

| Game | Source | Licence | Klynt changes |
| --- | --- | --- | --- |
| Hextris | github.com/Hextris/hextris | GPL-3.0 | Ads, analytics and remote scripts removed; bridge added |
| Tower Blocks | codepen.io/ste-vg/pen/ppLQNW | MIT (CodePen, to confirm) | Old coin API removed; bridge added |
| Astray | github.com/wwwtyro/Astray | Public domain | Texture paths fixed; bridge added |
| Radius Raid | github.com/jackrugile/radius-raid-js13k | MIT | Not integrated yet |
| Coloron | github.com/greghub/coloron | Apache-2.0 | Not integrated yet |

`scripts/vendor-games.mjs` re-applies the Klynt changes to fresh upstream copies.

## Design

`docs/FRONTEND.md` is the source of truth for the interface.
