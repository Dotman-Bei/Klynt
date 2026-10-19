# FRONTEND.md — Klynt

The source of truth for Klynt's visual design, layout, components, responsive behaviour and
presentation of interaction states. `Klynt_PRD.md` §11 defers to this file. Product rules (what is
real, what may be shown, what is on-chain) stay in the PRD; where this file shows data, it obeys them.

Art direction was dealt by the design-taste-frontend skill: page direction **Colour chapters**
(seed 52465672) for Home, app style **True-black flat** (seed 453854796) for the eight working
screens. Redraws and why are recorded in §10.

---

## 1. Who this is for, and the one action per page

**Players.** People with five spare minutes and a browser, on a phone in the evening or a laptop at
lunch. They want a game that starts in one click, a score that counts, and a straight answer about
whether there is anything to earn. Most arrive without a crypto wallet and must be able to play
without one.

**Competitive players.** The same people on their tenth visit: they come back for one game, check
where they stand this season and want to know exactly how ranks and rewards are calculated.

**Game creators.** Indie developers with a finished HTML5 game who want players without building a
wallet, leaderboard and payout stack of their own.

**Operators.** Two or three trusted people who review submissions, set seasons and pause rewards.
They use a laptop.

| Route | Page | The one action it drives |
| --- | --- | --- |
| `/` | Home | Start playing: **Choose a game** → `/games` |
| `/games` | Games | Open a game: row click → `/games/[gameId]` |
| `/games/[gameId]` | Game details | **Play** → `/play/[gameId]` |
| `/play/[gameId]` | Play | Finish a run and **Submit score** (or **Play again**) |
| `/leaderboard` | Leaderboard | Find your rank: filter by game and season |
| `/rewards` | Rewards | **Claim** what is claimable, or understand why nothing is |
| `/profile` | Profile | **Connect wallet**, then return to your best game |
| `/submit-game` | Submit game | **Send for review** |
| `/admin` | Admin | Clear the review queue: **Approve / Request changes / Reject** |

---

## 2. What is true today, and how the interface says it

The frontend ships before the score service, the reward vault and a verified GGI contract exist.
The interface never fills those gaps with sample numbers. Instead, each data source has a stated
state, and every screen designs that state rather than hiding it.

| Source | Today | What the interface shows |
| --- | --- | --- |
| Game catalogue | Static config in the repo (`src/data/games.ts`) | All six games, with honest availability |
| Games themselves | Hextris, Tower Blocks and Astray Master vendored from their open-source originals into `public/games/` | They run on `/play/[gameId]` in **Practice** |
| Practice runs | Recorded by the game bridge, stored in `localStorage` on this device | Shown on Play, Profile and Leaderboard, always labelled "on this device" |
| Score service (sessions, validation, leaderboards) | Not live. Read from `NEXT_PUBLIC_KLYNT_API` when set | When unset: "Ranked play opens when score checking goes live." |
| Reward vault and claims | Not deployed. Reads `NEXT_PUBLIC_REWARD_VAULT` when set | "Rewards are off" with the reasons, and 0 shown as 0 |
| GGI token | Unverified (PRD §9) | Named as unverified wherever GGI appears; no address, no balance |
| Wallet and chain | Real: injected EVM wallet via wagmi/viem, BOT Chain testnet (968) | Address, chain and native BOT balance read from the chain |

### Availability statuses (one word each, used everywhere)

| Status | Meaning | Pill (dark app) |
| --- | --- | --- |
| **Ranked** | Game runs, sessions are validated, scores rank | positive pair `#172a1d` / `#3fc07a` |
| **Practice** | Game runs here; scores stay on this device until checking goes live | neutral `#2a2a2a` / `#ffffff` |
| **Coming soon** | Open-source and licensed, not integrated yet | neutral `#2a2a2a` / `#b4b4b4` |
| **On hold** | Cannot be shown: licence or policy problem | warning pair `#2b2310` / `#f1c40f` |

No game is Ranked in this build. Fruit Ninja is **On hold**: the copy hosted on the old Galaxy
Gaming site uses Halfbrick's Fruit Ninja HD artwork and logo, which Klynt has no licence for (PRD
§15). Its catalogue entry stays, with no art and no play button. The name itself is also
Halfbrick's trademark and needs a decision before launch.

---

## 3. Visual direction

### Thesis

**Each game brings its own colours, and Klynt is the frame that holds them.** Hextris is pale slate
with yellow and red blocks, Coloron is turquoise, Radius Raid is black with cyan, Tower Blocks is
warm grey with dark slabs. On Home, those colours become whole chapters of the page, floor to
ceiling, butted together like the blocks of a tower. On the working screens the frame goes true
black and quiet, so the games' screenshots are the only colour in the room, plus one yellow for
data. The hexagon, Hextris's board and the shape of a hub, is the one motif.

### Palette

Home (light chapters). Every field has an assigned ink, and every pair is at least 4.5:1.

| Token | Value | Source | Ink on it | Contrast |
| --- | --- | --- | --- | --- |
| `--paper` | `#ecf0f1` | Hextris ground | `--ink` | 16.1 |
| `--ink` | `#111418` | | | |
| `--accent` | `#f1c40f` | Hextris yellow block | `--ink` | 11.1 |
| `--field-coloron` | `#45d6cd` | Coloron sky | `--ink` | 10.3 |
| `--field-tower` | `#d0cbc7` | Tower Blocks ground | `--ink` | 11.5 |
| `--field-red` | `#e74c3c` | Hextris red block | `--ink` | 4.8 (body text 18px+) |
| `--field-slate` | `#2c3e50` | Hextris core hexagon | `--paper` | 9.6 |
| `--field-night` | `#0b0b0b` | Radius Raid space | `--paper` | 17.2 |

The accent (Hextris yellow) goes on the primary button and on the hero hexagon, nowhere else. Two
neighbouring fields always differ in lightness: paper never sits next to tower grey.

App screens (true black). One ground everywhere; elevation by lightness alone.

```css
--ground: #000000;   --surface: #111111;   --raised: #2a2a2a;   --active: #1c1c1c;
--border: #1a1a1a;   --rule: #161616;      --control: #444444;
--text: #ffffff;     --muted: #b4b4b4;     --faint: #949494;
--primary: #ffffff;  /* inverted: white pill, black label */
--data: #f1c40f;     /* the one data hue: Hextris yellow, on data marks only, never on buttons, tabs or nav */
--positive: #3fc07a; --pill-positive-bg: #172a1d; --pill-positive-ink: #3fc07a;
--negative: #e5566f; --pill-negative-bg: #2c1a20; --pill-negative-ink: #e5566f;
--pill-warning-bg: #2b2310; --pill-warning-ink: #f1c40f;
--grid: #2b2b2b;
```

Colour share on app screens stays at or under 3%, excluding game screenshots. A game is identified
by its own screenshot thumbnail, never by an invented colour chip.

### Typefaces: one

**Chivo** (Google Fonts, 400 / 700 / 900), for everything.

- Display on Home: Chivo 900, uppercase, tracking −0.05em, leading 0.88.
- Text: Chivo 400, leading 1.35 on Home (body 17–19px) and 1.45 in the app (14px).
- Labels, navigation, buttons: Chivo 700, sentence case.
- Figures: `font-variant-numeric: tabular-nums` on every score, rank, amount and time.
- Monospace: only for wallet addresses, transaction hashes and contract fields (system `ui-monospace`).
  These are real identifiers, not decoration.

Type steps. Home uses four: small 13–14px, body 17–19px, lead 20–26px, display `clamp(40px, 6.4vw, 100px)`.
The app uses the study scale: 12 / 14 / 16 / 24, plus 32 for the one answer figure on Rewards and Profile.

### Spacing

A 4px base: `4, 8, 12, 16, 24, 32, 48, 64, 96, 128`.

- Home: 12-column grid, outer margin `clamp(16px, 3vw, 40px)` on both sides at every width, 24px
  column gap. Chapters butt together with no gap; padding inside a chapter is 96–128px on desktop
  and 64px on a phone.
- App: one gutter of 16px between cards in both directions, 20px card padding, a 29px content gutter
  from the sidebar rule and from the window edge, 34px nav pitch, 36px controls, 48px table rows
  (72px with a thumbnail).

### Shape

- Home: square corners everywhere. The primary button is the hexagon's shape cut short: a
  rectangle with chamfered left and right points (`clip-path`), 56px tall.
- App: cards radius 8, nested panels 6, controls are full pills (36px), pills 999. No borders on
  cards (lightness step only); 1px `--rule` lines inside tables and between sidebar and canvas.

### Motion

- **Home (page):** one signature move, the **shutter**: the showcase's game screenshot opens from
  its left edge with a clip-path over 1.1s while it settles from scale 1.12 to 1. Every chapter's
  parts enter once on scroll (heading, then text, then fragment), staggered 70ms, rising 24px with
  opacity, over 600ms `cubic-bezier(.2,.7,.2,1)`. The showcase screenshot drifts slowly (scale
  1 → 1.04 over 12s, alternating) as the moving picture. Buttons press to `scale(.97)` and fill-shift
  on hover. Content is visible without script; the entrance only runs when JS adds `.is-armed`.
- **App screens:** no entrances. Motion is feedback only: hover lightness steps (120ms), a sheet
  sliding up on phone (220ms), a row arriving, a pill changing state.
- **Reduced motion:** every travel and scale is dropped; opacity fades of 150ms remain.
- Transform and opacity only. Nothing animates layout.

---

## 4. Shells

### Home shell
A plain bar on the first chapter's paper: the **Klynt** wordmark (a small yellow hexagon, then
"Klynt" in Chivo 900) at left; **Games**, **Leaderboard**, **Rewards**, **Submit a game** at right,
and **Connect wallet** as a text link. On a phone: wordmark at left, "Menu" at right, which opens a
full-screen sheet on `--field-night`.

### App shell (Ruled T-frame, dark)
- Desktop (≥1101px): a 224px sidebar and a 64px top bar on one `#000` ground, divided by 1px
  `--rule` lines. Sidebar: wordmark at top; nav on a 34px pitch with 16px outline icons: **Games**,
  **Leaderboard**, **Rewards**, **Profile**; a group "Creators" with **Submit a game**; **Admin**
  shown only to allow-listed wallets. Active item: label goes from `#b4b4b4` to `#fff`, nothing else.
- Top bar: the page's breadcrumb or object name on the left (for example "Games / Hextris"); at the
  right end, behind a full-height 1px divider, the **network and wallet switcher**: a dot plus
  "BOT testnet" and the short address (`0x9f3a…c21e`), or the white **Connect wallet** pill.
- Tablet (641–1100px): the sidebar folds into the top bar (56px) with a Menu button.
- Phone (≤640px): a 56px top bar (wordmark, page name, wallet mark) and a bottom bar of five 56px
  destinations with short labels: **Games**, **Ranks**, **Rewards**, **Profile**, **More** (Submit a
  game, Admin, About the rules). The Play screen hides the bottom bar.

---

## 5. Pages, in build order, with copy

Copy here is final unless marked *(confirm)*. Headlines are at most two lines at every width.

### 5.1 Home — `/` (page, Colour chapters)

**Argument**

1. Klynt is a set of casual browser games where scores count and rewards settle on BOT Chain → hero.
2. Here are the six games, and here is honestly where each one stands → showcase.
3. A score travels from the game to the chain in four steps you can follow → how it works (the live thing).
4. Nothing is paid out yet, and we say so in the biggest type on the page → one figure.
5. The questions people actually ask before connecting a wallet → FAQ.
6. Creators can bring their own game → action tile.
7. Close → footer.

**Idea sentence.** On this page, *each game's own colours* become *the full-bleed chapters of the
page, and the hexagon of Hextris becomes the hub that holds them*.

**The live thing.** The "From game to chain" slider: drag a real range input through **Play → Check
→ Rank → Claim** and watch one example session move from the game into a claim, with the EIP-712
fields the reward contract will read. It works with a thumb and with arrow keys; without script all
four stages are listed in order.

**1. Hero — "Giant cropped shape"** on `--paper`.
A yellow hexagon about 120vh across enters from the right, cropped by the top, right and bottom edges,
its left point reaching column 7. Headline on columns 1–6, vertically centred.

- h1: **BROWSER GAMES / ON BOT CHAIN**
- Supporting line (19px): "Play casual games in your browser, rank on checked leaderboards, and
  claim capped rewards on BOT Chain when a season is funded."
- Primary: **Choose a game** → `/games`
- Secondary text link: "How scores are checked" → `#how`
- Phone: hexagon moves to the bottom (130vw, top at 56svh); headline at 11.5vw above it.

**2. Showcase — "Output index, live sheet"** (heading: **SIX GAMES**, as the first item's soft-ink
line above the list, set at list size).
Columns 1–5: the six names as buttons at `clamp(36px, 4vw, 64px)`: Hextris, Tower Blocks, Astray
Master, Radius Raid, Coloron, Fruit Ninja. The selected one is in full ink.
Columns 7–12: a stage 88svh tall in **the selected game's own colour** (Hextris `#ecf0f1` → slate
stage `#2c3e50`; Tower Blocks `#d0cbc7`; Astray `#0b0b0b`; Radius Raid `#0b0b0b`; Coloron
`#45d6cd`; Fruit Ninja `--field-tower`). On it, the game's real screenshot (16:10, square corners)
and under it the catalogue sheet as an interface fragment (`data-ui`), 440px wide:

| Field | Hextris | Tower Blocks | Astray Master | Radius Raid | Coloron | Fruit Ninja |
| --- | --- | --- | --- | --- | --- | --- |
| Type | Puzzle, high score | Stacking, high score | 3D maze, levels | Shooter, high score | Timing, high score | Slicing |
| Status | Practice | Practice | Practice | Coming soon | Coming soon | On hold |
| How it scores | Points per cleared group, with combos | One point per block placed | Levels cleared | Points per enemy | One point per bounce | — |
| Controls | ← → or tap either side | Click, Space or tap | Arrow keys (keyboard only) | Mouse and WASD | Click or tap the bars | — |
| Leaderboard | Opens with checking | Opens with checking | Opens with checking | — | — | — |
| Rewards | Off this season | Off this season | Off this season | — | — | — |

One-line descriptions, shown on the sheet:
- Hextris: "Rotate the hexagon to catch falling blocks. Three of a colour clear."
- Tower Blocks: "Drop each sliding block on the stack. Whatever overhangs is cut off."
- Astray Master: "Roll a ball through a dark maze to the exit. Each level grows."
- Radius Raid: "Hold the centre of space against wave after wave of raiders."
- Coloron: "Match each bar to the bouncing ball's colour. Red always comes first."
- Fruit Ninja: "On hold. The old hosted version uses artwork Klynt has no licence for."

Action on the sheet: **Play Hextris** (text link, → `/games/hextris`) for Practice games; "See it in
the catalogue" for the rest. Selecting a name swaps stage and sheet with a 200ms crossfade; the
screenshot opens with the shutter the first time the section enters.
Phone: names become a sideways-scrolling row at 22px with snap; the stage fills the width at 70svh.

**3. How it works — "Drag through the stages"** (`id="how"`). Left field `--field-coloron`, right
field `--field-night`, meeting on a clean vertical edge, 88svh.

| Stop | Clause (heading, two lines) | Fragment on the night field (`data-ui`, labelled "Example session") |
| --- | --- | --- |
| Play | **PLAY A ROUND / OF HEXTRIS** | Session card: `ses_7Q2K…` · Hextris · rules v1 · started 21:04:12 · ended 21:07:48 · 3 min 36 s · reported score 1,340 |
| Check | **THE SERVER / CHECKS IT** | The four checks with their result: duration above the 20 s minimum ✓ · score under the 50,000 ceiling for this length ✓ · session ID used once ✓ · no rate-limit flags ✓ → "Accepted" |
| Rank | **IT RANKS / THIS SEASON** | Leaderboard slice for Hextris, Season 1: ranks 11–13, the example run highlighted at 12 with 1,340 |
| Claim | **CLAIM IT / ON BOT CHAIN** | The attestation the contract verifies: wallet, season 1, game `hextris`, asset `GGI (unverified)`, amount, nonce, expires, chainId 968, verifying contract "not deployed" |

Stage names under the track: Play, Check, Rank, Claim. Under the fragment, one 15px line per stage:
- Play: "Practice runs need no wallet. Ranked runs start a session first."
- Check: "A client-side score is never enough on its own. Rejections come with a reason."
- Rank: "High-score games rank by best accepted score in the season."
- Claim: "One signature per claim, bound to your wallet and chain. Each nonce works once."

The thresholds in the Check stage are example values for the illustration *(confirm per game in M3)*.

**4. Rewards — "One figure owns the screen"** on `--field-tower`.
- Heading (36–44px): **PAID OUT SO FAR**
- Figure at `clamp(180px, 23vw, 380px)`: **0** with superscript unit **GGI**
- Caption (17px, 32ch): "Rewards are off. They switch on when the GGI contract is verified and
  the reward vault is funded. Until then, nothing you play is owed anything."
- Source line, bottom-right (15px): "Reward vault: not deployed · BOT Chain testnet 968". Links to
  `/rewards`.

**5. FAQ — "A band per question".** Heading band on `--field-red`: **QUESTIONS** (7vw, bottom-left,
40svh). Bands alternate `--paper` and `--field-tower`. All answers visible.

1. **Do I need a wallet to play?** No. Every game in Practice runs without one. You need a wallet
   for ranked play and for claiming, and Klynt will never ask for your seed phrase or private key.
2. **Can I earn GGI right now?** No. GGI is the token named by the original Galaxy Gaming site, and
   Klynt has not yet verified its contract or its right to distribute it. Until both are confirmed,
   rewards stay off. Any test season will use clearly labelled testnet points.
3. **How are scores checked?** Each ranked run gets a session ID from the server. When it ends, the
   server checks the time played, the score against what is possible in that time, and whether the
   session was already used. Only accepted scores rank.
4. **Is it cheat-proof?** No browser game is. Checking blocks the obvious attacks, suspicious runs
   go to review, and operators can pause rewards. We publish what the checks cover and what they
   do not.
5. **Which network is this?** BOT Chain. Testnet first: chain ID 968, explorer scan.bohr.life.
   Mainnet (chain ID 677) only after the reward contract has been reviewed.
6. **Where did these games come from?** They are open-source games, credited on each game's page.
   Klynt hosts them; their authors made them.
7. **Can I put my game on Klynt?** Yes. Submit it for review. Approved games join the catalogue;
   nothing goes live automatically.

**6. Creators — "The action tile".** Centre tile in `--field-coloron`; left tile a Radius Raid
screenshot; right tile flat `--field-slate`.
- Heading (40px): **BRING YOUR GAME**
- Text (17px): "Klynt handles the wallet, the leaderboard and the payouts. You send a playable
  browser game and confirm you own it."
- Button: **Submit a game** → `/submit-game`

**7. Footer — "The mark, built large"** on `--field-night`.
The wordmark KLYNT built from five blocks, each letter knocked out of a rectangle of a different
height (60–100% of the band), in the game colours: yellow, turquoise, red, tower grey, paper. The
blocks' bottoms share one line, like a tower.
- Columns: **Play**: Games, Leaderboard, Rewards · **Creators**: Submit a game, Integration guide
  (→ `/submit-game#requirements`) · **Chain**: BOT Chain testnet explorer (scan.bohr.life), Faucet
  (faucet.botchain.ai) · **Klynt**: Rules for scores, Rules for rewards (→ `/rewards#rules`)
- Contact lines: *(confirm: no address exists yet)*. Until one is given, the right columns carry the
  game credits line: "Hextris (GPL-3.0), Tower Blocks by ste-vg on CodePen (MIT), Astray by wwwtyro
  (public domain), Radius Raid by Jack Rugile (MIT), Coloron by greghub (Apache-2.0)."
- Last row: "© 2026 Klynt" at left; small button **Choose a game** at right.

### 5.2 Games — `/games` (app: list)

- h1: **Games**. Line under it: "6 in the catalogue · 3 playable in Practice · 0 ranked yet"
  (computed from the catalogue).
- Tabs (underline): **All 6** · **Playable 3** · **Coming soon 2** · **On hold 1**. Counts computed.
- Toolbar: a search "Search games" (316×36) on the left; "Sort: Status" on the right.
- Table, 72px rows: thumbnail (64×40 screenshot crop, radius 3) + name and one-line description ·
  Type · How it scores · Leaderboard · Rewards · Status pill · chevron. Rows link to details.
- Empty search: "No game called ‘{query}’. Try Hextris, Tower Blocks or Astray." keeps the frame.
- Phone: two-line rows: thumbnail, name and status pill on line 1; "Puzzle · high score" grey on
  line 2.

### 5.3 Game details — `/games/[gameId]` (app: detail)

- Header card (88px): cover 50×62 (screenshot crop), name as h1 (24px), meta line "Puzzle · high score
  · by Logan Engstrom, Garrett Finucane, Noah Moroze and Michael Yang · GPL-3.0", and the white
  **Play** pill on the right (absent when the game is not playable; then the status pill and its
  reason).
- Grid (6 columns, one 16px gutter):
  - **How to play** (4 cols): controls, the goal, what ends a run.
  - **Your best** (2 cols): best practice score on this device, with its date, or "—" and "No runs on
    this device yet".
  - **How it scores** (3 cols): the scoring rule; "Ranked by best accepted score in the season."
  - **Rewards** (3 cols): "Off this season. Rewards switch on when the vault is funded." and a link to
    Rewards.
  - **Leaderboard** (6 cols): the per-game board's frame with its header; offline state "Ranked play
    opens when score checking goes live. Your practice runs are under Profile."
  - **Credits** (6 cols): source repository link, licence, what Klynt changed ("Ads and analytics
    removed; a score bridge added").
- Phone: header keeps cover, name and meta, **Play** full width under it; cards stack.

### 5.4 Play — `/play/[gameId]` (app: focused)

The game owns the screen. Sidebar and bottom bar are hidden; a 56px bar remains.

- Bar: "← Hextris" (back to details), then the session state in words: **Practice run · not
  submitted**; at right **Restart** (outlined) and **End run** (outlined).
- Stage: the game in an iframe, letterboxed on `#000`, keeping the game's aspect; full width on a
  phone, with a "Rotate for a bigger board" hint in portrait for Astray.
- States, shown as a panel over the bottom of the stage (never over the game while it runs):
  - **Loading**: "Loading Hextris…", the panel at its final size.
  - **Running**: nothing but the bar.
  - **Run ended**: "Run over · 1,340" (the real score from the bridge) · "3 min 36 s" · "Best on this
    device: 2,115". Buttons: **Play again** (white pill), **Back to Hextris**.
  - **Submit (ranked, when the service is live)**: Submitting → "Checking your score…" →
    **Accepted** (positive pill, rank shown) or **Rejected** with the reason in words ("This run
    ended faster than the game allows.").
  - **Submit (today)**: the submit step reads "Not submitted. Ranked play opens when score checking
    goes live. This run is saved on this device."
  - **Not playable**: Coming soon / On hold games show the reason and a link back to the catalogue.
  - **Game failed to load**: "Hextris didn't load. Check your connection and try again." + Retry.

### 5.5 Leaderboard — `/leaderboard` (app: list)

- h1: **Leaderboard**. Line: "Season 1 has not started. Ranks appear here when score checking goes
  live."
- Scope row: a segmented control **Hextris · Tower Blocks · Astray Master** (games with boards), and
  a season select **Season 1** (only real seasons appear).
- Main (two-thirds): the board's frame and header — Rank · Player · Best score · Runs · Last run —
  with the offline sentence spanning it.
- Rail (384px): **Your practice bests on this device**, one row per game with best, date and
  "Play" text action; and **How ranks work**: "Best accepted score in the season. Ties go to the
  earlier run. Games are ranked separately; Klynt never adds Hextris points to Tower Blocks blocks."
- When live: rank numbers are data ("1", "2"), the viewer's own row takes `--active`, 25 rows then
  **Load more** with "1–25 of N".
- Phone: two-line rows (rank and player, score right; runs and date grey); the rail moves below.

### 5.6 Rewards — `/rewards` (app: wallet)

- h1: **Rewards**. Line: "Rewards are off this season."
- Lead card, the answer figure (32px): **Claimable 0 GGI** with sublines "Pending 0 · Claimed 0" and
  the white **Claim** pill disabled with its reason beside it in words: "Nothing to claim. Rewards are
  off."
- **Season 1** card: Pool "Not funded" · Asset "GGI (unverified)" · Decimals "—" · Chain "BOT Chain
  testnet (968)" · Contract "Not deployed" · Per-wallet cap "—" · Minimum claim "None set".
- **Before rewards switch on** (`id="rules"`): the PRD §9 gate as a checklist with real states, each
  item ticked or not: GGI contract verified on the explorer ✗ · Permission to distribute confirmed ✗
  · Reward vault deployed and verified ✗ · Vault funded ✗ · Budget, caps and pause tested on testnet
  ✗.
- **How rewards will work**: five plain lines: a stated pool per season; a cap per wallet per day;
  only accepted runs count; no fixed earning rate and no promise of income; a paused season stops
  new claims and keeps old ones.
- **Claim history**: frame and header (Date · Season · Game · Amount · Transaction), "No claims yet."
- Claim flow when live: **Review claim** sheet listing asset, amount, decimals, chain and contract →
  wallet signature → "Waiting for confirmation" with the hash linked to scan.bohr.life → "Claimed"
  only after confirmation. Wrong network: "Switch to BOT Chain testnet to claim" with **Switch
  network**.

### 5.7 Profile — `/profile` (app: overview)

- Disconnected: h1 **Profile**, line "Connect a wallet to see ranked runs and rewards. Practice runs
  on this device are below." The white **Connect wallet** pill. The practice section still renders.
- Connected: h1 is the short address `0x9f3a…c21e` with a copy button; line "BOT Chain testnet ·
  first seen on this device {date}".
- KPI strip (one container, divided): **Ranked runs 0** · **Practice runs** {n} · **Games played**
  {n} · **BOT balance** {real, from chain, 4 decimals}.
- **Best by game** (main): one row per playable game: thumbnail, name, best practice score, date,
  "Play" text action. Missing values are "—".
- **Recent runs** (rail): last 5 practice runs: game, score, duration, relative date. "View all"
  expands in place.
- **Placements** and **Rewards**: frames with "No ranked runs yet" and "Nothing earned. Rewards are
  off."
- Wrong network: a notice "Your wallet is on chain {id}. Klynt uses BOT Chain testnet (968)." with
  **Switch network**.

### 5.8 Submit game — `/submit-game` (app: settings form)

- h1: **Submit a game**. Line: "Send a browser game for review. Nothing goes live until an operator
  approves it."
- Two-column sections (label column 380px with help text, panel beside it):
  1. **The game**: Game name · Category (select: Puzzle, Arcade, Shooter, Stacking, Maze, Timing,
     Other) · Description (textarea, 280 characters, live count).
  2. **Where it lives**: Demo URL · Repository URL (optional) · Hosting (select: "Klynt hosts the
     files", "I host it, Klynt embeds it") · Integration (select: "Score bridge (postMessage)",
     "Not sure yet").
  3. **You**: Developer or team name · Contact (email or Telegram handle) · Wallet address (optional,
     validated as a 0x address).
  4. **Rights**: checkbox "I own or have a licence for all code, art, audio and names in this game."
     and checkbox "I understand Klynt may remove a game that breaks these rules."
- Right column summary on desktop: **What happens next**: Pending review → Changes requested or
  Approved → Added to the catalogue in Coming soon → Practice → Ranked.
- **Requirements** (`id="requirements"`): runs in a desktop and phone browser without plugins; loads
  in under 10 seconds on 4G *(confirm)*; reports the final score through the bridge; no ads, trackers
  or outside payments; you hold the rights.
- Submit: **Send for review** (white pill). Validation inline under each field, in words. Success
  state: "Sent. Your submission is Pending review." with the submission ID. Today, with no service:
  "Submissions open when the review service launches. Your draft is saved on this device." and the
  button reads **Save draft**.

### 5.9 Admin — `/admin` (app: list + settings, protected)

- Not allow-listed (or no wallet): h1 **Admin**, "This area is for Klynt operators. Connect an
  operator wallet." The page renders nothing else. Server-side enforcement is required (PRD §6.9);
  the frontend gate only hides.
- Operator: tabs **Submissions** · **Games** · **Seasons** · **Score review** · **Health**.
  - Submissions: queue table (Game · Developer · Submitted · Integration · Status) with row actions
    **Approve**, **Request changes**, **Reject** (the reject confirm names the game).
  - Games: the six games with an availability select per row (Ranked, Practice, Coming soon, On
    hold) and the reason field for On hold.
  - Seasons: Season 1 settings panel: start, end, pool, asset, per-wallet daily cap, minimum claim,
    and a **Pause claims** switch with its consequence: "New claims stop. Claims already confirmed
    stay valid."
  - Score review: flagged runs table (Player · Game · Score · Duration · Flag reason · Action).
  - Health: KPI strip from real logs only: wallets connected, runs started, runs completed, scores
    rejected, claims. Offline: each value is "—" with "Service not connected".
- Every write control is disabled while the service is offline, with the reason next to it.

---

## 6. Components

| Component | Desktop | Phone |
| --- | --- | --- |
| **Wordmark** | Yellow hexagon (14px) + "Klynt" 900, 20px | Same, 18px |
| **Primary button (Home)** | Chamfered hexagon shape, 56px, `--accent` fill, ink label 700 | Full width, 52px |
| **Primary pill (app)** | White 36px pill, black label 700 | 44px tall, full width in sheets |
| **Secondary (app)** | 36px pill, 1px `--control` outline, white label | 44px |
| **Text action** | Ink/white 700, underline on hover only | Same, 44px hit area |
| **Wallet switcher** | Top-bar right, behind divider: dot + network + short address; menu: copy address, view on explorer, disconnect | Wallet mark in the top bar; opens a bottom sheet |
| **Network notice** | Inline notice inside the affected card, with **Switch network** | Same |
| **Status pill** | 20px, 12px/700, pale pair per §2 | Same; never squeezed (`flex: none`) |
| **Game thumbnail** | Real screenshot crop, radius 3, 64×40 in lists, 50×62 in headers | Same |
| **Showcase index (Home)** | Six name buttons, stage swaps | Snap-scrolling row |
| **Stage slider (Home)** | Range input, 8px track, 32px square yellow thumb | 40px thumb |
| **Data table** | 12px grey sentence-case header, no fill; 48/72px rows; 1px `--rule`; numbers right, tabular | Two-line rows below 640px |
| **Underline tabs** | Full-width 1px rule, 2px white indicator | Scroll sideways in their own row |
| **Segmented control** | As wide as its options, 36px | Scrolls sideways if wider than the screen |
| **KPI strip** | One `--surface` container split by 1px dividers; 14px label over 24px value | 2-column grid |
| **Empty state** | Frame and header kept; one sentence spanning the block | Same |
| **Loading** | Final layout with flat `--raised` bars at real size; no shimmer | Same |
| **Error** | Inside the failed block: what failed + **Retry** | Same |
| **Sheet / dialog** | Centred dialog 480px on `--surface`, the one shadow `0 12px 28px rgba(0,0,0,.5)` | Bottom sheet, full width |
| **Game frame** | Iframe letterboxed on black, 16px from the bar | Full width; landscape hint where needed |
| **Form field** | Label above (14/700), 40px input on `--raised`, 1px `--control`, radius 10 | Stacked, 16px between pairs |

---

## 7. Imagery

- **Game screenshots**, captured from the open-source games running locally in Chrome: Hextris,
  Tower Blocks, Astray, Radius Raid, Coloron. They are the product's own pictures and the only
  colour on the app screens. Stored in `public/shots/`.
- **No art for Fruit Ninja.** Its entry uses a flat `--field-tower` tile with its name.
- **Interface fragments** on Home (the catalogue sheet, the four stage fragments) are built in HTML
  with `data-ui`, at true size.
- No stock photography, no illustrations, no 3D coins, no rockets. The old site's coin and rocket
  graphics are not carried over.

---

## 8. Avoid

- Neon-on-black "Web3 gaming" styling: glows, gradients, glass panels, purple, cyber grids.
- Coin icons, rocket ships, "earn" badges, any copy that implies income ("play to earn", "free
  money", APY).
- Invented numbers: player counts, total paid, "10,000+ gamers", sample leaderboards, sample balances.
- Eyebrow labels and pill badges above headings ("NEW", "GameFi"), tiny uppercase tracked labels.
- Rows of identical icon-topped feature cards; a hero, three features, testimonials, CTA sequence.
- Monospace as decoration, 01/02/03 numbering, hairline grids and crosshairs.
- KPI tiles with an icon in a tinted circle, sparklines, green "+12%" on a new account.
- The accent colour on app buttons, tabs or nav.
- Shadows on resting cards; a second typeface.
- A disabled control without its reason; a loading spinner where the layout can hold its shape.

---

## 9. Build notes

- Next.js (App Router) + TypeScript, plain CSS with tokens (`src/styles/tokens.css`,
  `home.css`, `app.css`). No CSS framework.
- Wallet: wagmi + viem, injected connector (MetaMask and compatible). BOT Chain testnet config in
  `src/lib/chain.ts` from env, defaults from the official quick guide (checked 2026-10-19).
- Vendored games live in `public/games/<id>/` with their licence files. A `klynt-bridge.js` added to
  each posts `{ type: 'klynt:run-end', score, durationMs }` to the parent on game over.
- Checks per page: the skill's `lint.mjs` and `inspect.mjs` (Home as a page, the rest with `--app`)
  at 1440, 768 and 390.

## 10. Draw record

- Page: `colour-chapters`, seed 52465672. Redrawn: **stats** → *One figure owns the screen* (the
  dealt bar chart needs ten or more true values; there are none, and the PRD forbids inventing
  them). **footer** → *The mark, built large* (the dealt footer is built on a contact address;
  none exists). **features** dropped: after the stage slider, no claim was left for it.
- Palette: the dealt proportions kept (one ground, one ink, one accent, four to six fields); the
  colours taken from the games themselves instead of the dealt blush, sage and slate.
- App: `true-black-flat`, seed 453854796. Face: the one data hue is Hextris yellow instead of the
  dealt lime, and game screenshots are the identity marks. Signature element: the score's path
  (session → check → rank → claim) shown as a strip on Play and Profile.
