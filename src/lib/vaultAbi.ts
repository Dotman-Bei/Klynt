// ABI for contracts/src/KlyntRewardVault.sol (the parts Klynt calls), shared by server and browser.
const claimTuple = {
  type: 'tuple',
  name: 'c',
  components: [
    { name: 'wallet', type: 'address' },
    { name: 'seasonId', type: 'uint256' },
    { name: 'gameId', type: 'bytes32' },
    { name: 'token', type: 'address' },
    { name: 'amount', type: 'uint256' },
    { name: 'nonce', type: 'bytes32' },
    { name: 'expiry', type: 'uint64' },
  ],
} as const;

export const vaultAbi = [
  {
    type: 'function', name: 'seasons', stateMutability: 'view', inputs: [{ name: 'seasonId', type: 'uint256' }],
    outputs: [
      { name: 'token', type: 'address' }, { name: 'startsAt', type: 'uint64' }, { name: 'claimsUntil', type: 'uint64' },
      { name: 'exists', type: 'bool' }, { name: 'paused', type: 'bool' }, { name: 'budget', type: 'uint128' },
      { name: 'funded', type: 'uint128' }, { name: 'claimed', type: 'uint128' }, { name: 'perWalletCap', type: 'uint128' },
    ],
  },
  { type: 'function', name: 'claimedBy', stateMutability: 'view', inputs: [{ name: 'seasonId', type: 'uint256' }, { name: 'wallet', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'remaining', stateMutability: 'view', inputs: [{ name: 'seasonId', type: 'uint256' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'nonceUsed', stateMutability: 'view', inputs: [{ name: 'nonce', type: 'bytes32' }], outputs: [{ type: 'bool' }] },
  { type: 'function', name: 'isSigner', stateMutability: 'view', inputs: [{ name: 'signer', type: 'address' }], outputs: [{ type: 'bool' }] },
  { type: 'function', name: 'paused', stateMutability: 'view', inputs: [], outputs: [{ type: 'bool' }] },
  { type: 'function', name: 'hashClaim', stateMutability: 'view', inputs: [claimTuple], outputs: [{ type: 'bytes32' }] },
  { type: 'function', name: 'claim', stateMutability: 'nonpayable', inputs: [claimTuple, { name: 'signature', type: 'bytes' }], outputs: [] },
  {
    type: 'event', name: 'Claimed', anonymous: false,
    inputs: [
      { name: 'seasonId', type: 'uint256', indexed: true }, { name: 'wallet', type: 'address', indexed: true },
      { name: 'gameId', type: 'bytes32', indexed: true }, { name: 'token', type: 'address', indexed: false },
      { name: 'amount', type: 'uint256', indexed: false }, { name: 'nonce', type: 'bytes32', indexed: false },
    ],
  },
  // Errors, so wallets and the UI can name a revert
  ...['NoSuchSeason', 'SeasonIsPaused', 'OutsideClaimWindow', 'NotYourClaim', 'WrongToken', 'ClaimExpired', 'ZeroAmount', 'NonceAlreadyUsed', 'BadSignature', 'PoolExhausted', 'WalletCapReached', 'EnforcedPause'].map(
    (name) => ({ type: 'error', name, inputs: [] }) as const,
  ),
] as const;

export const erc20Abi = [
  { type: 'function', name: 'decimals', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint8' }] },
  { type: 'function', name: 'symbol', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
  { type: 'function', name: 'balanceOf', stateMutability: 'view', inputs: [{ name: 'a', type: 'address' }], outputs: [{ type: 'uint256' }] },
] as const;

/** Plain words for each revert, shown to the player. */
export const revertWords: Record<string, string> = {
  NoSuchSeason: 'This season does not exist on the vault.',
  SeasonIsPaused: 'Claims for this season are paused.',
  EnforcedPause: 'All claims are paused.',
  OutsideClaimWindow: 'This season is not open for claims right now.',
  NotYourClaim: 'This claim belongs to another wallet.',
  WrongToken: 'This claim is for a different reward token.',
  ClaimExpired: 'This claim expired. Ask for a new one.',
  ZeroAmount: 'There is nothing to claim.',
  NonceAlreadyUsed: 'This claim was already paid.',
  BadSignature: 'The claim signature was not accepted.',
  PoolExhausted: 'The reward pool has run out.',
  WalletCapReached: 'You have reached this season’s cap.',
};
