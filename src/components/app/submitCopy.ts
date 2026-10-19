export const requirements = [
  'Runs in a desktop and a phone browser with no plugins.',
  'Loads in under 10 seconds on a 4G connection.',
  'Reports the final score through the Klynt score bridge.',
  'No ads, trackers, outside payments or remote scripts.',
  'You hold the rights to every part of it.',
];

export const nextStates: [string, string][] = [
  ['Pending review', 'An operator plays it and checks the licence.'],
  ['Changes requested or Approved', 'You hear back at the contact you gave.'],
  ['Coming soon', 'Listed in the catalogue while it is integrated.'],
  ['Practice', 'Playable on Klynt; runs stay on the player’s device.'],
  ['Ranked', 'Scores are checked and ranked by season.'],
];
