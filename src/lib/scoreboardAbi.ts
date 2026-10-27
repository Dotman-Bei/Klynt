// ABI for contracts/src/KlyntScoreboard.sol (the parts Klynt calls), shared by server and browser.
const recordTuple = {
  type: 'tuple',
  name: 'r',
  components: [
    { name: 'wallet', type: 'address' },
    { name: 'seasonId', type: 'uint256' },
    { name: 'gameId', type: 'bytes32' },
    { name: 'score', type: 'uint64' },
    { name: 'runId', type: 'bytes32' },
    { name: 'expiry', type: 'uint64' },
  ],
} as const;

export const scoreboardAbi = [
  { type: 'function', name: 'record', stateMutability: 'nonpayable', inputs: [recordTuple, { name: 'signature', type: 'bytes' }], outputs: [] },
  { type: 'function', name: 'hashRecord', stateMutability: 'view', inputs: [recordTuple], outputs: [{ type: 'bytes32' }] },
  { type: 'function', name: 'recorded', stateMutability: 'view', inputs: [{ name: 'runId', type: 'bytes32' }], outputs: [{ type: 'bool' }] },
  { type: 'function', name: 'isSigner', stateMutability: 'view', inputs: [{ name: 'signer', type: 'address' }], outputs: [{ type: 'bool' }] },
  {
    type: 'function', name: 'bestScore', stateMutability: 'view',
    inputs: [{ name: 'seasonId', type: 'uint256' }, { name: 'gameId', type: 'bytes32' }, { name: 'wallet', type: 'address' }],
    outputs: [{ type: 'uint64' }],
  },
  {
    type: 'event', name: 'ScoreRecorded',
    inputs: [
      { name: 'seasonId', type: 'uint256', indexed: true },
      { name: 'gameId', type: 'bytes32', indexed: true },
      { name: 'wallet', type: 'address', indexed: true },
      { name: 'score', type: 'uint64', indexed: false },
      { name: 'runId', type: 'bytes32', indexed: false },
      { name: 'newBest', type: 'bool', indexed: false },
    ],
  },
  { type: 'error', name: 'NotYourRecord', inputs: [] },
  { type: 'error', name: 'RecordExpired', inputs: [] },
  { type: 'error', name: 'AlreadyRecorded', inputs: [] },
  { type: 'error', name: 'BadSignature', inputs: [] },
] as const;

export const scoreboardRevertWords: Record<string, string> = {
  NotYourRecord: 'This run belongs to another wallet. Switch to the wallet that played it.',
  RecordExpired: 'This record expired. Ask for a new one.',
  AlreadyRecorded: 'This run is already on BOT Chain.',
  BadSignature: 'The score service’s signature was not accepted.',
};
