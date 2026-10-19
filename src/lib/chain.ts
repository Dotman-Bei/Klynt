import { defineChain } from 'viem';

// Reference values from the BOT Chain quick guide (checked 2026-10-19). Override per deployment with env.
const id = Number(process.env.NEXT_PUBLIC_CHAIN_ID || 968);
const rpc = process.env.NEXT_PUBLIC_RPC_URL || 'https://rpc.bohr.life';
const explorer = process.env.NEXT_PUBLIC_EXPLORER_URL || 'https://scan.bohr.life';

export const botChain = defineChain({
  id,
  name: id === 677 ? 'BOT Chain' : 'BOT Chain testnet',
  nativeCurrency: { name: 'BOT', symbol: 'BOT', decimals: 18 },
  rpcUrls: { default: { http: [rpc] } },
  blockExplorers: { default: { name: 'BOT Scan', url: explorer } },
  testnet: id !== 677,
});

export const explorerUrl = explorer;
export const faucetUrl = 'https://faucet.botchain.ai/';

export const txUrl = (hash: string) => `${explorer}/tx/${hash}`;
export const addressUrl = (address: string) => `${explorer}/address/${address}`;

export const shortAddress = (a?: string) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : '');

/** Config that is not live yet reads as null; the interface shows its offline state. */
export const service = {
  api: process.env.NEXT_PUBLIC_KLYNT_API || null,
  rewardVault: process.env.NEXT_PUBLIC_REWARD_VAULT || null,
  adminWallets: (process.env.NEXT_PUBLIC_ADMIN_WALLETS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean),
};
