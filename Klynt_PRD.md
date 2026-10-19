# PRD.md — Klynt

## 1. Project Overview

**Project name:** Klynt  
**Category:** GameFi  
**Target ecosystem:** BOT Chain  
**Existing public site:** https://galaxygaming.online/  
**BOT Chain ecosystem listing:** https://www.botchain.ai/en/project-party/

### Product summary

Klynt is a Web3 gaming hub where players discover and play casual browser games, connect a BOT Chain wallet, compete on leaderboards, and qualify for transparent game rewards. The platform should also establish a path for independent game creators to submit games for review and integration.

**Core user promise:** Play accessible browser games, compete with other players, and track eligible rewards transparently through BOT Chain.

### Existing product narrative to preserve

The current public Galaxy Gaming website presents the project as a play-to-earn Web3 gaming ecosystem. It lists these games:

- Astray Master — 3D maze
- Tower Blocks — high-score game
- Radius Raid — shooter
- Hextris — high-score/puzzle game
- Fruit Ninja — cutting game
- Coloron — level game

The public site also describes MetaMask wallet connection, GGI as its custom reward token, rewards for playing, a minimum redeemable balance, and an open platform where developers may submit games. It mentions future in-game NFTs/assets and community game integrations.

The building agent must inspect the live site and any accessible existing source/code before implementation so that the rebuild preserves supported existing functionality without blindly copying broken template links, placeholder values, or unverified token claims.

## 2. Problem

Players often encounter Web3 gaming products that either lack worthwhile gameplay or make reward rules difficult to understand. Game creators also need an accessible way to reach players without each game having to build its own wallet, reward, leaderboard, and distribution stack.

Klynt should solve this through one platform that provides:

1. A discoverable catalogue of casual games.
2. A straightforward wallet connection on BOT Chain.
3. Play sessions and score recording.
4. Fair, abuse-resistant leaderboards.
5. Transparent reward eligibility and claim status.
6. On-chain reward settlement where the deployed reward asset and economics are verified.
7. A controlled submission path for community games.

## 3. BOT Chain and Incubation Strategy

The project must be built as a real, deployable GameFi application intended to qualify for the BOT Labs incubation programme. Optimize for a working product, verified contracts, real player activity, measured retention, and a credible milestone roadmap.

### 3.1 BOT Chain must have a meaningful role

The blockchain layer must be load-bearing rather than limited to a wallet-connect button.

The on-chain component should cover:

- Reward pool configuration and funding.
- Season and reward-claim state where applicable.
- Authorized score/reward attestations.
- Replay-resistant reward claims.
- Claim history and public transaction references.
- Verifiable reward disbursements.
- Optional on-chain achievement/badge records only if they are genuinely useful.

Gameplay itself can run off-chain so that each key press does not require a transaction. The contract and public explorer should make reward settlement and season accounting verifiable.

### 3.2 Ecosystem-specific fit

Klynt should demonstrate why it is useful on BOT Chain:

- BOT Chain-native wallet and reward settlement.
- Low-cost claims and frequent gaming interactions.
- An ecosystem game catalogue that can attract repeat users.
- A route for third-party developers to contribute games.
- Public, measurable player and transaction activity.

Do not claim BOT Chain is uniquely required for browser gameplay. The strongest chain-specific value is the verifiable reward settlement, wallet identity, and transparent game economy.

### 3.3 BOT Labs criteria to implement against

The build should demonstrate:

- **Technical capability:** working games, tested reward logic, contracts deployed and verified.
- **Market potential:** casual players and game creators have clear reasons to use the platform.
- **Ecosystem fit:** the product brings players and measurable transactions to BOT Chain.
- **Milestone readiness:** delivery can be broken into achievable increments.
- **Community foundation:** real test players, creator feedback, public build updates, and ecosystem participation.

### 3.4 Real use and evidence

Track real usage from the start:

- Unique connected wallets.
- Daily and weekly active players.
- Game starts and completed sessions.
- Accepted score submissions.
- Leaderboard participation.
- Reward claims and amounts.
- Repeat player rate.
- Games submitted and approved.
- Transactions associated with reward distribution.

Never fake users, game sessions, scores, transaction counts, token balances, or traction claims.

### 3.5 Do not invent tokenomics

Do not deploy a new Klynt token just to make the project look more complete.

The site describes a custom token called GGI, but this PRD does not assume that its live contract address, supply, decimals, transferability, distribution rights, liquidity, or security status have been verified. The building agent must confirm these from authoritative project sources before integrating real-token rewards.

If GGI cannot be verified, use clearly labelled testnet points/test tokens for development and demos. Do not tell users that points are redeemable for real assets unless the actual redemption mechanism exists and is funded.

## 4. Goals

### MVP goals

1. Ship a responsive and usable gaming hub.
2. Connect compatible EVM wallets on BOT Chain.
3. List the six existing game concepts and launch playable games.
4. Track completed sessions and scores with server-side validation.
5. Provide a reliable leaderboard.
6. Provide player profiles and reward history.
7. Implement an auditable, capped reward-claim flow.
8. Add a basic game submission form and an admin review workflow.
9. Deploy to BOT Chain testnet first.
10. Collect feedback from real players and fix the highest-impact issues before considering mainnet.

### Success criteria

The MVP is not complete merely because the interface renders. A user must be able to connect a wallet, play a game, submit a score, see the accepted score reflected in a leaderboard, and—when the reward system is enabled—claim eligible rewards with the claim recorded on BOT Chain.

## 5. Target Users

### 5.1 Players
People who want quick casual games, competitive scores, and transparent reward eligibility.

### 5.2 Competitive players
Players who repeatedly play supported games and compare scores by season, game, or overall ranking.

### 5.3 Game creators
Indie developers who want to submit browser games to Klynt and reach a Web3 audience.

### 5.4 Platform administrators
Trusted operators who approve games, configure seasons/reward pools, review abuse reports, and pause unsafe reward activity.

## 6. MVP Feature Scope

### 6.1 Game catalogue

The game catalogue must list the six games represented on the current Galaxy Gaming site:

1. Astray Master
2. Tower Blocks
3. Radius Raid
4. Hextris
5. Fruit Ninja
6. Coloron

Each game entry should include:

- Game title and stable game ID.
- Category/type.
- Short description.
- Availability status.
- Play action if playable.
- Supported scoring method.
- Whether a season/leaderboard is active.
- Whether reward eligibility is currently enabled.

**Playable-game requirement:** do not mark a game as playable unless its game loop actually runs and can produce a validated session result. If the existing code/assets are unavailable or cannot legally/technically be integrated, show it as **Coming Soon** or integrate a simple replacement only with explicit project approval. Do not invent game-provider integrations.

For the first working vertical slice, prioritize at least three complete games that are practical to implement or reuse—prefer Tower Blocks, Hextris, and Astray Master if their assets/source are accessible. The remaining titles can follow as subsequent integration milestones. All six catalogue entries should exist in the MVP, but availability status must be honest.

### 6.2 Game session lifecycle

Each session should follow a defined lifecycle:

```text
Player opens game
      ↓
Wallet identity is available (connection optional for non-reward play)
      ↓
Player starts a session
      ↓
Platform issues a session identifier and rules
      ↓
Game runs
      ↓
Game ends or player exits
      ↓
Score is submitted
      ↓
Server validates the result
      ↓
Accepted score appears in history/leaderboard
      ↓
Eligible reward is calculated for the active season
      ↓
Player claims when claim requirements are met
```

A client-side score alone must never be sufficient to issue real token rewards.

### 6.3 Wallet connection

Support MetaMask and standard EVM wallet connection through a maintained wallet connector. Add other wallets only where reliable support exists.

Requirements:

- Connect/disconnect wallet.
- Display abbreviated address.
- Detect the active chain.
- Request a network switch/add-network action when needed using verified BOT Chain configuration.
- Explain unsupported-network states.
- Avoid requiring a wallet for purely casual/demo play unless the game feature needs identity.
- Require an appropriate wallet connection for on-chain reward claims.
- Never request or store private keys or seed phrases.

### 6.4 Player profile

Profile data should include:

- Wallet address.
- Total accepted sessions.
- Games played.
- Best score by game.
- Current and historical leaderboard placements.
- Current season progress.
- Rewards earned, pending, claimed, and claimable where applicable.
- Claim transaction links.
- Recent sessions.

Profile statistics may use an indexer/read database, but blockchain claim state must be verified from contract state/events.

### 6.5 Leaderboard

Provide game-specific and overall rankings. At minimum support:

- Per-game leaderboard.
- Current-season leaderboard.
- All-time totals or best-score board where meaningful.
- Player wallet/profile link.
- Score and session timestamp.
- Pagination or bounded result lists.

The ranking calculation must be documented and consistent. For high-score games, rank by best accepted score in the period unless the specific game's scoring rules require another metric. Do not compare raw scores between games with incomparable score systems on the overall leaderboard; use a clearly documented points system or keep rankings per game.

### 6.6 Reward programme

Rewards must be transparent, finite, and configurable.

Requirements:

- Every season has a stated reward pool or a clear statement that rewards are disabled.
- Rules explain how accepted play and scores contribute to eligibility.
- Display claimable and claimed amounts separately.
- Enforce a minimum claim threshold only if it is a real, configured product rule.
- Show reward asset, amount, decimals, chain, and contract/source.
- Do not promise a fixed earning rate or income.
- Enforce season budget/caps on-chain.
- Pausing a season must stop new claims without corrupting prior claims.
- No user can claim the same reward authorization twice.
- Reject expired, invalid, wrong-chain, wrong-wallet, or already-used claim authorizations.
- If reward funding is exhausted, clearly show that rewards are unavailable rather than displaying false balances.

### 6.7 Reward calculation

Do not pay real tokens solely by number of game launches. That is easy to farm.

For MVP, use a documented reward policy with:

- Per-game/season reward budget.
- A cap per wallet and/or per day.
- Accepted score/session validation.
- Cooldowns or limits where needed.
- Optional score bands or normalized game points.
- Sybil/automation checks.
- An explicit statement that scores do not guarantee a fixed monetary return.

An administrator must be able to configure the budget and disable rewards. Avoid designing token emissions or economic claims beyond what is implemented.

### 6.8 Game submission

Provide an external developer submission workflow.

Submission fields:

- Game name.
- Developer/team name.
- Contact method.
- Game description.
- Category.
- Demo URL or repository URL.
- Hosting/source information.
- Requested integration method.
- Content/licence confirmation.
- Wallet address (optional unless needed for rewards or ownership proofs).

Submitted games must enter **Pending Review** state. They must not automatically become visible/playable on the public catalogue.

### 6.9 Admin review

A protected admin area should allow authorized operators to:

- Review game submissions.
- Approve, reject, or request changes.
- Configure game availability.
- Configure seasons and reward pool settings.
- Pause/resume reward claims.
- Review suspicious score activity.
- Review system health and key metrics.

Admin permissions must use a defined access-control strategy and must not rely on hiding a frontend route alone.

## 7. Reward Verification and Anti-Cheat Architecture

This is one of the most important parts of the product.

### 7.1 Basic approach

For browser games, gameplay and high-frequency score events should not be sent on-chain one by one. Instead:

1. A server issues a unique session ID and session constraints.
2. The game records score-relevant events or a replay/proof where practical.
3. The server validates session timing, game rules, score bounds, duplicate submissions, and known abuse signals.
4. An authorized verifier signs a typed reward/score attestation.
5. The user can claim eligible rewards through the reward contract.
6. The contract validates the signature, wallet, season, nonce, expiry, and remaining reward budget.
7. The contract marks the authorization as used and transfers reward assets.
8. The claim transaction/event is publicly verifiable.

### 7.2 Score validation

Validation should be proportional to game type:

- Enforce sensible maximum scores and time limits.
- Reject sessions that finish faster than possible.
- Reject duplicate session IDs and duplicate claim nonces.
- Use server-side score calculations or replay validation when practical.
- Rate-limit session creation and score submission.
- Detect repeated suspicious score patterns.
- Keep an admin review and reward-pause process.

Do not pretend simple client-reported scores are cheat-proof. Document the current trust assumptions and limitations.

### 7.3 Signature/claim requirements

If EIP-712 or equivalent signed attestations are used, bind the authorization to at least:

- Claiming wallet.
- Season ID.
- Game ID or eligible reward source.
- Reward token/asset.
- Reward amount.
- Unique nonce or claim ID.
- Expiration.
- Chain ID and verifying contract/domain.

The contract must verify authorized signers and prevent replay. Key rotation and emergency signer revocation must be considered. Signing keys must be stored securely and never committed to the repository.

### 7.4 Contract reward safety

- Only approved reward assets may be distributed.
- Contracts must not mint arbitrary GGI tokens unless the verified token contract and authorized minting permission genuinely support it.
- Prefer a funded reward vault that transfers existing tokens over an assumed mint function.
- Enforce season/contract budget limits.
- Protect against reentrancy where applicable.
- Use checks-effects-interactions.
- Restrict admin and signer functions.
- Provide pause/unpause controls.
- Prevent double claims.
- Handle failing token transfers safely.
- Avoid unbounded loops.
- Consider fee-on-transfer or non-standard ERC-20 behavior; preferably reject unsupported reward tokens.
- Include tests for exhausted pools, invalid signatures, expired claims, duplicate claims, wrong recipients, unauthorized admin actions, and pause behavior.

## 8. Smart Contract Scope

Keep the on-chain architecture small.

### 8.1 Reward Vault / Claim Contract

Responsible for:

- Approved reward asset configuration.
- Reward pool funding and accounting.
- Authorized verifier configuration.
- Season-level budgets/caps.
- Signature/attestation verification.
- Claim nonce/replay protection.
- Reward transfers.
- Pause state.
- Claim events.

### 8.2 Optional Achievement Contract

Do not build this unless the first MVP needs it. If implemented later, use it for meaningful achievement badges rather than speculative NFTs.

### 8.3 On-chain vs off-chain responsibilities

**On-chain:**
- Reward pool funding and balances.
- Claim authorization validation.
- Budget/claim accounting.
- Claim history/events.
- Administration of critical contract settings.

**Off-chain:**
- Game rendering and gameplay.
- Session state.
- Score/replay validation.
- Leaderboard aggregation and search.
- Analytics and game submission review workflow.

The off-chain verifier is a declared trust assumption in the MVP. The system must make this clear and preserve an upgrade path toward stronger verification.

## 9. Token and Reward Readiness Gate

Before real-token rewards are enabled, the building agent must:

1. Locate authoritative GGI token documentation or obtain the official address from project maintainers.
2. Confirm chain, address, decimals, total supply, transfer rules, admin permissions, and whether the token is already deployed.
3. Confirm the project has permission to distribute the token.
4. Verify the contract on the relevant explorer where verification is supported.
5. Confirm the reward vault is funded.
6. Confirm budget, per-wallet limits, claim threshold, and pause process.
7. Document relevant risks and any audit/review status.
8. Run end-to-end test claims on testnet or a controlled deployment.

If any requirement is not satisfied, launch the development flow with clearly labelled testnet points/test assets and keep real-money/token claims disabled. Never fabricate a GGI address or token balance.

## 10. Standard Pages and Routes

The MVP will have **9 standard pages/routes**.

### 1. Home
**Route:** `/`

Purpose:
- Explain Klynt.
- Feature available games and current season.
- Show selected platform statistics.
- Provide wallet connection and play entry points.
- Show how scores/rewards work.

### 2. Games
**Route:** `/games`

Purpose:
- Catalogue supported games.
- Show genre, availability, leaderboard status, and reward eligibility.
- Let players open a game detail page.

### 3. Game Details
**Route:** `/games/[gameId]`

Purpose:
- Explain the selected game and rules.
- Show status, best score, leaderboard link, and reward eligibility.
- Start a playable session if available.

### 4. Play
**Route:** `/play/[gameId]`

Purpose:
- Host the game loop.
- Create/track a session.
- Pause/restart/end where the game supports it.
- Submit the score and show validation/result status.

### 5. Leaderboard
**Route:** `/leaderboard`

Purpose:
- Show overall and per-game/season rankings.
- Provide consistent ranking rules and links to player profiles.

### 6. Rewards
**Route:** `/rewards`

Purpose:
- Explain the reward rules and current status.
- Show earned, claimable, claimed, and pending rewards.
- Let users claim eligible rewards.
- Link successful claims to BOT Chain explorer.

### 7. Profile
**Route:** `/profile`

Purpose:
- Show the connected player's scores, session history, game activity, and reward/claim history.

### 8. Submit Game
**Route:** `/submit-game`

Purpose:
- Allow developers to submit a game for review.
- Explain supported game/integration requirements.
- Show confirmation and submission status.

### 9. Admin
**Route:** `/admin`

Purpose:
- Review game submissions.
- Manage game availability and seasons.
- Configure reward programme settings.
- Review suspicious scores and pause rewards.
- View usage metrics.

### Route summary

```text
/                      Home
/games                 Games
/games/[gameId]        Game Details
/play/[gameId]         Play
/leaderboard           Leaderboard
/rewards               Rewards
/profile               Profile
/submit-game           Submit Game
/admin                 Admin
```

**Total standard pages/routes: 9.**

Wallet-connect prompts, transaction confirmations, claim modals, validation errors, loading states, and game result states should be handled within these routes rather than creating unnecessary standalone pages.

## 11. Frontend Instructions

This PRD intentionally contains **no visual design requirements**.

When it is time to build the frontend, the building agent MUST read and follow **`frontend.md`**. That file is the source of truth for visual design, layout, component styling, responsive behavior, and interaction presentation.

Do not invent or duplicate design rules in this PRD.

## 12. Data Model

Implement only the entities needed by the agreed MVP.

### Game
- Stable ID.
- Name and description.
- Category.
- Launch mode/source.
- Availability status.
- Scoring rules/version.
- Reward eligibility.
- Created/updated timestamps.

### Player
- Wallet address.
- First/last seen.
- Public game statistics.
- Optional profile data that is safe to make public.

### Game session
- Session ID.
- Wallet address if connected.
- Game ID.
- Start/end timestamps.
- Scoring rules version.
- Submitted and accepted score.
- Validation status/reason.
- Replay/proof reference where applicable.

### Season
- Season ID.
- Start/end.
- State.
- Reward policy version.
- Reward asset.
- Budget reference.
- Claim configuration.

### Reward claim
- Claim ID/nonce.
- Wallet.
- Season and game/source reference.
- Amount/asset.
- Attestation expiry.
- Claim status.
- Transaction hash when claimed.

### Game submission
- Submission ID.
- Developer information.
- Game URLs/repository.
- License/content declarations.
- Review status and admin notes.

Do not store private keys, seed phrases, authentication secrets, or unnecessary sensitive personal information.

## 13. Technology Expectations

Use standard EVM tooling and a maintainable web stack.

Suggested choices:
- Solidity.
- Hardhat or Foundry.
- TypeScript.
- React/Next.js or an equivalent standard framework.
- viem/wagmi or another maintained EVM wallet integration.
- A server/API for session and score validation.
- A database for game catalog, sessions, submissions, and indexed read views.
- An indexer or event-reading service where justified.

The building agent may choose equivalents if they are simple, secure, deployable, and compatible with BOT Chain. Do not add unnecessary services or microservices for the MVP.

## 14. BOT Chain Configuration and Deployment

Before deploying, the agent MUST verify current network details from BOT Chain official documentation rather than relying on hardcoded memory.

The current official quick guide lists:
- Mainnet Chain ID: `677`
- Mainnet RPC: `https://rpc.botchain.ai`
- Mainnet explorer: `https://scan.botchain.ai`
- Testnet Chain ID: `968`
- Testnet RPC: `https://rpc.bohr.life`
- Testnet explorer: `https://scan.bohr.life`

These are reference values, not a substitute for rechecking the official documentation at build and deployment time.

Requirements:
- Keep RPCs and addresses in environment/config files.
- Never commit private keys or deployment secrets.
- Separate testnet/mainnet deployments.
- Verify contracts on the appropriate explorer when supported.
- Document environment setup and deployment commands.
- Test using testnet before mainnet.
- Use a real, deployable frontend URL for demos.

Official developer docs: https://dev-docs.botchain.ai/docs/Developers/quick-guide/

## 15. Security, Abuse, and Reliability

### Wallet and transaction security
- Do not request seed phrases or private keys.
- Display correct chain and reward asset before claim.
- Make users review claim details before signing.
- Do not claim a transaction succeeded until confirmed.
- Link transaction hashes to the correct explorer.

### Game integrity
- Validate results server-side.
- Apply request/session rate limits.
- Reject duplicate sessions and submissions.
- Set practical score/time bounds.
- Record score rejection reasons for debugging.
- Do not distribute real rewards based only on a client-side number.

### Contract security
- Access control.
- Reentrancy protections where applicable.
- Safe ERC-20 transfer handling.
- Replay protection.
- Signature expiry and domain separation.
- Budget caps.
- Emergency pause.
- No unbounded loops.
- Tests for all important failure paths.

### Operational security
- Keep signing keys in protected secrets storage.
- Separate admin and reward-attestor responsibilities where practical.
- Rotate/revoke compromised signer keys.
- Log administrative configuration changes.
- Add monitoring for unusual claim/score activity.
- Document recovery and pause procedures.

### Game content and licensing
- Confirm that games/assets are owned, open source, or licensed for integration.
- Do not scrape or republish proprietary games without permission.
- Require submitters to confirm rights to submitted code, art, audio, and other assets.
- Provide a process to disable a game that violates policy or stops working.

## 16. MVP Non-Goals

Do NOT include these unless the MVP is already stable and there is a clear need:

- A new Klynt token.
- Token launch or speculative tokenomics.
- NFT marketplace.
- In-game item sales.
- Token staking/farming.
- Cross-chain gaming.
- Native mobile apps.
- Complex guilds or social feed.
- Player-to-player payments.
- Unrestricted permissionless game publishing.
- Real-time on-chain game state for every action.
- Unverified external game integrations.
- Guaranteed play-to-earn income.
- Uncapped rewards.
- Automated rewards based on unvalidated client scores.

## 17. Milestone Plan

### M1 — Discovery and Foundation
- Inspect the existing site, game assets, licenses, and any available source code.
- Create repository and implementation plan.
- Confirm BOT Chain config from official docs.
- Choose stack and establish test/lint/build commands.
- Define game session and scoring interfaces.
- Confirm whether GGI's token contract is verifiable; keep real rewards disabled until confirmed.

### M2 — Core Game Hub
- Implement game data model/catalog.
- Build `/`, `/games`, and `/games/[gameId]`.
- Connect a supported EVM wallet.
- Implement game launch and session tracking.
- Make at least one game fully playable end-to-end.

### M3 — Playable Games and Score Validation
- Integrate or implement the prioritized games.
- Add session IDs and server-side validation.
- Add score history and leaderboard.
- Add tests for malformed/duplicate/implausible submissions.
- Keep unavailable games explicitly marked as coming soon.

### M4 — Reward Infrastructure
- Implement a reward policy and season model.
- Build the reward vault/claim contract.
- Implement signed reward authorization and replay protection.
- Add rewards page and claim state.
- Use testnet assets/points if verified GGI is unavailable.
- Test caps, exhausted budget, invalid signatures, expired signatures, and duplicate claims.

### M5 — Creator Submission and Administration
- Add game submission route and API.
- Add admin review workflow and access control.
- Add game status controls and reward pause.
- Add basic metrics for usage, sessions, claims, and game submissions.

### M6 — Testnet Release
- Deploy test contracts.
- Verify contracts where supported.
- Test the full player flow with real testers.
- Test supported wallets and browser sizes.
- Fix critical bugs and document limitations.
- Publish a public demo and short build video.

### M7 — Mainnet Readiness and Ecosystem Growth
- Complete security review of reward contracts.
- Verify token readiness, legal/permission assumptions, and reward funding.
- Deploy to mainnet only if all gates are satisfied.
- Run initial community season with a capped budget.
- Recruit real players and game creators.
- Publish a build log/tutorial and provide feedback to BOT Chain builders.

These milestones should be treated as phased checkpoints. Do not skip security or token verification in order to claim a faster launch.

## 18. Product Metrics

Collect and report real metrics.

### Player engagement
- Unique connected wallets.
- Daily/weekly active players.
- Game launches.
- Completed sessions.
- Repeat sessions per player.
- Day-7 retention where measurable.

### Game quality
- Playable game count.
- Session completion rate.
- Score rejection rate.
- Game errors/crashes.
- Average load time.

### Reward economy
- Reward pool funded.
- Eligible amount.
- Claims completed.
- Total amount paid.
- Average claim size.
- Budget consumed.
- Rejected/replayed claim attempts.

### Ecosystem impact
- Unique BOT Chain wallets interacting with the reward contract.
- Reward contract transactions.
- New users brought to BOT Chain.
- Games submitted/approved.
- Active independent developers.

Only report metrics supported by real logs or on-chain events.

## 19. Definition of Done

The MVP is complete when:

- [ ] The site is deployed and usable.
- [ ] All nine routes work.
- [ ] Wallet connect and chain mismatch states work.
- [ ] The catalogue lists the six titles carried over from the original Galaxy Gaming site with honest availability statuses.
- [ ] At least three games are fully playable, or any blocker is clearly documented and agreed.
- [ ] A player can start and finish a game session.
- [ ] Session IDs and score validation work.
- [ ] Accepted scores appear on the appropriate leaderboard.
- [ ] The player profile and session history work.
- [ ] Game submissions can be created and reviewed.
- [ ] Admin routes and privileged actions are protected.
- [ ] Reward rules are visible and understandable.
- [ ] Reward contract tests cover critical cases.
- [ ] The project uses verified network settings.
- [ ] Testnet deployment and end-to-end tests are complete.
- [ ] The GGI token is verified before real-token claims are enabled.
- [ ] No fake reward balances, token addresses, users, or transactions are shown.
- [ ] README includes pitch, problem, architecture, setup instructions, deployment, test commands, threat model, and limitations.
- [ ] A 2–4 minute demo video is prepared.
- [ ] Real-user testing is documented.
- [ ] Git history shows continuous meaningful progress.
- [ ] Mainnet deployment is complete or a documented mainnet-readiness plan exists.

## 20. Git Commit Rules

Git commits are a required part of the development process.

During the build, commit changes continuously instead of waiting until the entire project is finished.

### Commit Frequency

For a normal build, aim for **50+ meaningful commits** across the development process.

Do NOT create 50 meaningless commits just to reach the number. Every commit should represent a real, completed development step.

Make a commit whenever you complete a logical unit of work, such as:

- Creating a new page
- Creating or modifying a component
- Adding a feature
- Implementing an API endpoint
- Adding database functionality
- Adding authentication logic
- Adding validation
- Adding error handling
- Connecting frontend to backend
- Adding a utility/helper
- Adding a configuration
- Refactoring a specific section
- Fixing a bug
- Improving an existing feature
- Adding tests
- Fixing failing tests
- Improving responsiveness
- Fixing accessibility issues
- Updating documentation
- Completing a route
- Completing a major UI section
- Integrating an external service

### Commit Process

After completing each logical development unit:

1. Check the current changes.
2. Verify that the changes work.
3. Stage only the relevant files.
4. Create a descriptive commit.
5. Continue building from the committed state.

Use conventional commit messages where appropriate:

- `feat: add game catalogue`
- `feat: add wallet connection`
- `feat: implement score validation`
- `feat: add reward claim contract`
- `fix: reject duplicate score submissions`
- `refactor: simplify game session service`
- `test: add reward claim tests`
- `style: improve mobile game controls`
- `docs: update setup instructions`

### Important Rules

- Do NOT wait until the end of the project to commit everything.
- Do NOT make one giant commit containing the entire project.
- Do NOT create fake changes solely to increase the commit count.
- Do NOT repeatedly modify and commit the same thing without a meaningful reason.
- Keep commits small, focused, and logically separated.
- Before moving to the next major feature, make sure the previous feature has been committed.
- If a task contains several independent steps, commit each completed step separately.
- If you encounter and fix a bug during development, commit the fix separately.
- If you make a meaningful refactor, commit it separately.

### Target

For a substantial project, aim for **50+ meaningful commits by the time the build is complete**, distributed naturally throughout development.

The commit history should clearly show the progression of the project from initial setup → individual features → integrations → fixes → testing → polish → final state.

At the end of the build, run `git log` and verify that the history accurately reflects the development process.

## 21. Build Rules for the Coding Agent

1. Read this PRD completely before coding.
2. Inspect the current Galaxy Gaming site and any accessible project source/assets before replacing or duplicating functionality.
3. Read `frontend.md` before building any frontend and follow it as the source of truth for design.
4. Do not insert visual design requirements into this PRD.
5. Verify current BOT Chain network details from official documentation before deployment.
6. Keep the first release focused on the core game loop.
7. Never fake games, scores, token rewards, wallet balances, users, or transactions.
8. Do not enable real GGI rewards until its token contract and distribution authority have been verified.
9. Test every critical contract and score-validation path.
10. Make the blockchain layer meaningful through reward funding, verifiable claims, and public settlement.
11. Do not store private keys, seed phrases, or signing secrets in source control.
12. Follow the Git Commit Rules throughout the build.
13. Document security assumptions, scoring limitations, and any centralized verifier dependencies.
14. Check every Definition of Done item before claiming the project is complete.
15. Run `git log` at the end and verify the commit history reflects actual development.

## 22. Final Positioning

> **Klynt is a Web3 gaming hub on BOT Chain where players discover casual games, compete on scoreboards, and track eligible rewards through transparent on-chain settlement.**

The first version should prove this loop clearly:

**Discover game → play → validate score → rank → qualify for reward → claim on BOT Chain.**

The product should win through playable games, credible scoring, transparent reward rules, repeat users, and an open path for creators—not through speculative token promises or a large number of unfinished features.

## 23. References

- Galaxy Gaming current public site: https://galaxygaming.online/
- BOT Chain Project Party / ecosystem directory: https://www.botchain.ai/en/project-party/
- BOT Chain developer quick guide: https://dev-docs.botchain.ai/docs/Developers/quick-guide/
- BOT Chain testnet faucet: https://faucet.botchain.ai/
- BOT Chain mainnet explorer: https://scan.botchain.ai/
- BOT Chain testnet explorer: https://scan.bohr.life/
