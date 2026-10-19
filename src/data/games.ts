// The game catalogue. Availability is stated honestly (PRD 6.1): a game is only `ranked`
// when its sessions are validated by the score service, which is not live yet.

export type Availability = 'ranked' | 'practice' | 'coming-soon' | 'on-hold';

export type Game = {
  id: string;
  name: string;
  type: string;
  line: string;
  howToPlay: string[];
  scoring: string;
  controls: string;
  availability: Availability;
  /** Why the game is in its state, when it is not playable. */
  reason?: string;
  /** Path of the hosted build under /public, when Klynt hosts it. */
  src?: string;
  shot?: string;
  /** Focal point of the screenshot, for small crops (CSS object-position). */
  focus?: string;
  /** A muted gameplay loop recorded from the game itself. */
  clip?: string;
  /** The game's own colours, used for its chapter on Home. */
  field: string;
  fieldInk: string;
  credit?: { authors: string; licence: string; source: string; changes?: string };
  keyboardOnly?: boolean;
};

export const games: Game[] = [
  {
    id: 'hextris',
    name: 'Hextris',
    type: 'Puzzle, high score',
    line: 'Rotate the hexagon to catch falling blocks. Three of a colour clear.',
    howToPlay: [
      'Blocks fall towards the hexagon from all six sides.',
      'Rotate it with the left and right arrow keys, or tap either side of the screen.',
      'Land three or more blocks of one colour together to clear them. Clears in a row build a combo.',
      'The run ends when a stack reaches the outer edge.',
    ],
    scoring: 'Points for every cleared group, multiplied by your combo.',
    controls: '← → or tap either side',
    availability: 'practice',
    src: '/games/hextris/index.html',
    shot: '/shots/hextris.png',
    clip: '/clips/hextris.webm',
    field: '#2c3e50',
    fieldInk: '#ecf0f1',
    credit: {
      authors: 'Logan Engstrom, Garrett Finucane, Noah Moroze and Michael Yang',
      licence: 'GPL-3.0',
      source: 'https://github.com/Hextris/hextris',
      changes: 'Ads, analytics and remote scripts removed; the Klynt score bridge added.',
    },
  },
  {
    id: 'tower-blocks',
    name: 'Tower Blocks',
    type: 'Stacking, high score',
    line: 'Drop each sliding block on the stack. Whatever overhangs is cut off.',
    howToPlay: [
      'A block slides back and forth above the tower.',
      'Click, press Space or tap to drop it.',
      'Any part that misses the block below is sliced off, so the tower narrows.',
      'The run ends when a block misses the stack entirely.',
    ],
    scoring: 'One point for every block placed.',
    controls: 'Click, Space or tap',
    availability: 'practice',
    src: '/games/tower-blocks/index.html',
    shot: '/shots/tower-blocks.png',
    focus: '50% 78%',
    field: '#d0cbc7',
    fieldInk: '#111418',
    credit: {
      authors: 'ste-vg',
      licence: 'MIT (CodePen)',
      source: 'https://codepen.io/ste-vg/pen/ppLQNW',
      changes: 'The old Galaxy Gaming coin calls removed; the Klynt score bridge added.',
    },
  },
  {
    id: 'astray',
    name: 'Astray Master',
    type: '3D maze, levels',
    line: 'Roll a ball through a dark maze to the exit. Each level grows.',
    howToPlay: [
      'Steer the ball with the arrow keys, or H, J, K and L.',
      'Only the walls near the ball are lit. Find the exit square.',
      'Every exit opens a larger maze.',
      'End the run whenever you like; your score is the levels you cleared.',
    ],
    scoring: 'One point for every level cleared.',
    controls: 'Arrow keys (keyboard only)',
    availability: 'practice',
    src: '/games/astray/index.html',
    shot: '/shots/astray.png',
    field: '#0b0b0b',
    fieldInk: '#ecf0f1',
    keyboardOnly: true,
    credit: {
      authors: 'wwwtyro',
      licence: 'Public domain (Unlicense)',
      source: 'https://github.com/wwwtyro/Astray',
      changes: 'Texture paths fixed for hosting under /games; the Klynt score bridge added.',
    },
  },
  {
    id: 'radius-raid',
    name: 'Radius Raid',
    type: 'Shooter, high score',
    line: 'Hold the centre of space against wave after wave of raiders.',
    howToPlay: [
      'Move with W, A, S and D. Aim with the mouse and hold the button to fire.',
      'Raiders close in from every side; pick up power-ups as they drop.',
      'The run ends when your health runs out.',
    ],
    scoring: 'Points for every raider destroyed.',
    controls: 'Mouse and WASD',
    availability: 'coming-soon',
    reason: 'Open source and licensed. Integration with the score bridge is the next milestone.',
    shot: '/shots/radius-raid.png',
    field: '#0b0b0b',
    fieldInk: '#ecf0f1',
    credit: { authors: 'Jack Rugile', licence: 'MIT', source: 'https://github.com/jackrugile/radius-raid-js13k' },
  },
  {
    id: 'coloron',
    name: 'Coloron',
    type: 'Timing, high score',
    line: 'Match each bar to the bouncing ball’s colour. Red always comes first.',
    howToPlay: [
      'A ball bounces along a row of bars and changes colour as it goes.',
      'Tap or click a bar to switch its colour between red, yellow and purple.',
      'Every bounce must land on a bar of the ball’s colour.',
    ],
    scoring: 'One point for every bounce.',
    controls: 'Click or tap the bars',
    availability: 'coming-soon',
    reason: 'Open source and licensed. Integration with the score bridge is the next milestone.',
    shot: '/shots/coloron.png',
    focus: '82% 70%',
    field: '#45d6cd',
    fieldInk: '#111418',
    credit: { authors: 'greghub', licence: 'Apache-2.0', source: 'https://github.com/greghub/coloron' },
  },
  {
    id: 'fruit-ninja',
    name: 'Fruit Ninja',
    type: 'Slicing',
    line: 'On hold. The old hosted version uses artwork Klynt has no licence for.',
    howToPlay: [],
    scoring: '—',
    controls: '—',
    availability: 'on-hold',
    reason:
      'The copy on the old Galaxy Gaming site uses Halfbrick’s Fruit Ninja HD artwork and logo. Klynt will not host it without a licence or original art.',
    field: '#d0cbc7',
    fieldInk: '#111418',
  },
];

export const statusLabel: Record<Availability, string> = {
  ranked: 'Ranked',
  practice: 'Practice',
  'coming-soon': 'Coming soon',
  'on-hold': 'On hold',
};

export const isPlayable = (g: Game) => g.availability === 'ranked' || g.availability === 'practice';

export const getGame = (id: string) => games.find((g) => g.id === id);

export const catalogueCounts = () => ({
  total: games.length,
  playable: games.filter(isPlayable).length,
  ranked: games.filter((g) => g.availability === 'ranked').length,
  comingSoon: games.filter((g) => g.availability === 'coming-soon').length,
  onHold: games.filter((g) => g.availability === 'on-hold').length,
});
