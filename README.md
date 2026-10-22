# Klynt

Casual browser games on BOT Chain. Play in your browser, rank on checked leaderboards, and claim
capped rewards on BOT Chain once a season is funded.

**Status:** frontend, score service and reward vault built and tested; not yet deployed to BOT Chain
testnet (968). Rewards are off by default. The GGI token is not verified (see `Klynt_PRD.md` §9),
so the vault is built to pay any approved ERC-20 and is tested with `KTP-TEST`, testnet points with
no value.

## What works today

- Six games in the catalogue. Hextris, Tower Blocks and Astray Master run on Klynt; Radius Raid and
  Coloron are open source and queued for integration; Fruit Ninja is on hold (no licence for its art).
- Wallet connection (MetaMask or any injected EVM wallet) on BOT Chain testnet.
- Sign-in by signing one message. No transaction, no gas, no keys leave the wallet.
- Ranked runs: the server starts a session, times the run itself, checks the score and ranks it.
- Per-game leaderboards for Season 1, player profiles, practice runs saved on the device.
- Game submissions stored as Pending review.
- Rewards (when switched on): accepted runs above a game's score threshold earn, within a daily cap;
  the player claims through a funded on-chain vault with a server-signed EIP-712 authorisation.

## Deploy on Vercel

1. In the Vercel project: Storage → Create Database → Neon (Postgres) → connect it to this project.
   That adds `DATABASE_URL`. Tables are created on first use.
2. Add the environment variables from `.env.example` that you need: at least
   `NEXT_PUBLIC_KLYNT_API=/api` and a random `KLYNT_SESSION_SECRET`; for rewards also
   `NEXT_PUBLIC_REWARD_VAULT`, `ATTESTOR_PRIVATE_KEY` and `REWARDS_ENABLED=true`.
3. Redeploy. Without `NEXT_PUBLIC_KLYNT_API` the site runs in Practice mode and the API answers 503.

## Run it

Requires Node 22 or newer. No database to install: locally the score service uses PGlite (Postgres compiled to WebAssembly) in `.data/pglite`; in production it uses `DATABASE_URL` (Neon).

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
| `cd contracts && forge test` | Vault tests: replay, expiry, recipients, signers, caps, pauses, admin access, fuzzed caps |
| `node --experimental-strip-types scripts/check-vault.ts` | Server signatures against a deployed vault (see the file's header) |
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

## Rewards

```text
accepted run (score >= game threshold, within the daily cap)  ->  earnings ledger (server)
Rewards page: Claim  ->  POST /api/rewards/authorize
                         server bundles unclaimed earnings, capped by the wallet's remaining on-chain cap
                         and the pool, signs an EIP-712 Claim with the attestor key
                     ->  wallet sends KlyntRewardVault.claim(claim, signature)
                         vault checks signer, wallet = sender, token, expiry, unused nonce, pool, cap, pauses
                     ->  POST /api/rewards/confirm  server finds the Claimed event in the receipt, then records it
```

The vault (`contracts/src/KlyntRewardVault.sol`) only transfers tokens it was funded with. It never
mints. The owner can pause one season or everything, rotate or revoke attestor keys, and withdraw
unclaimed funds only after a season's claim window has closed. Ownership moves in two steps and can't
be renounced.

### Deploy to BOT Chain testnet

Needs a deployer wallet funded with testnet BOT (faucet.botchain.ai) and a separate attestor key.
Keys go in the environment only, never in files in this repo.

```bash
cd contracts
export BOT_TESTNET_RPC=https://rpc.bohr.life
export DEPLOYER_PRIVATE_KEY=...        # pays gas, becomes the owner
export ATTESTOR_ADDRESS=0x...          # address of the server's ATTESTOR_PRIVATE_KEY
export SEASON_BUDGET=10000             # optional: create and fund Season 1 (testnet points)
forge script script/Deploy.s.sol --rpc-url bot_testnet --broadcast
```

Then set `NEXT_PUBLIC_REWARD_VAULT`, `ATTESTOR_PRIVATE_KEY` and `REWARDS_ENABLED=true` for the app.
Verify the source on the explorer (BOT Scan; confirm its verifier API before relying on
`forge verify-contract`), then set the matching sign-off flag. The readiness checklist on
`/rewards` only ticks items that are read from the chain or signed off in config.

## Trust assumptions and limits

- **Scores are client-reported.** The server measures time itself and rejects anything impossible
  for that time, but a careful cheat within the bounds is not detected. Replay or server-side
  simulation would be the next step. Rewards must not be enabled on this check alone.
- **The rule values are first guesses** (minimum lengths and score ceilings per game) and need
  confirming with real play data before any season pays out.
- **Sign-in verifies plain EOA signatures** (`viem.verifyMessage`). Smart-contract wallets
  (ERC-1271) are not supported yet.
- **Rate limits are in memory**, per server process. A multi-instance deployment needs a shared store.
- **Storage is Postgres**: Neon in production, PGlite locally and in tests, so both run the same SQL.
- **The attestor decides who earned what.** The vault enforces budgets, caps, replay protection and
  pauses, but it trusts the attestor's signature. Keep that key in a secrets manager, separate from
  the owner key, and revoke it on the vault if it leaks.
- **Reward policy values are proposals** (thresholds Hextris 500, Tower Blocks 10, Astray 1 level;
  1 token per run; 10 per wallet per day) and need sign-off before a real season.
- **`forge coverage` does not run on this Windows setup** (it can't resolve OpenZeppelin through
  `../node_modules`); the tests name every revert path instead.
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
