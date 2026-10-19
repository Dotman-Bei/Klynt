// Reads the reward vault and signs claim authorisations. The attestor key lives only in the
// server's environment (ATTESTOR_PRIVATE_KEY) and is never sent anywhere or logged.
import { createPublicClient, decodeEventLog, http, isAddressEqual, type Address, type Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { botChain } from '../lib/chain.ts';
import { erc20Abi, vaultAbi } from '../lib/vaultAbi.ts';
import { claimTypes, vaultDomain, type ClaimStruct } from './rewards.ts';

export type VaultConfig = { vault: Address; attestorKey: Hex; rpcUrl: string; chainId: number };

export function vaultConfig(): VaultConfig | null {
  const vault = process.env.NEXT_PUBLIC_REWARD_VAULT as Address | undefined;
  const attestorKey = process.env.ATTESTOR_PRIVATE_KEY as Hex | undefined;
  if (!vault || !attestorKey) return null;
  return { vault, attestorKey, rpcUrl: process.env.REWARD_RPC_URL || botChain.rpcUrls.default.http[0], chainId: botChain.id };
}

export function vaultClient(cfg: VaultConfig) {
  const client = createPublicClient({ transport: http(cfg.rpcUrl) });
  const attestor = privateKeyToAccount(cfg.attestorKey);

  return {
    attestorAddress: attestor.address,

    async season(seasonId: number) {
      const [token, startsAt, claimsUntil, exists, paused, budget, funded, claimed, perWalletCap] = await client.readContract({
        address: cfg.vault, abi: vaultAbi, functionName: 'seasons', args: [BigInt(seasonId)],
      });
      return { token, startsAt, claimsUntil, exists, paused, budget, funded, claimed, perWalletCap };
    },

    async globalPaused() {
      return client.readContract({ address: cfg.vault, abi: vaultAbi, functionName: 'paused' });
    },

    async claimedBy(seasonId: number, wallet: Address) {
      return client.readContract({ address: cfg.vault, abi: vaultAbi, functionName: 'claimedBy', args: [BigInt(seasonId), wallet] });
    },

    async nonceUsed(nonce: Hex) {
      return client.readContract({ address: cfg.vault, abi: vaultAbi, functionName: 'nonceUsed', args: [nonce] });
    },

    async attestorActive() {
      return client.readContract({ address: cfg.vault, abi: vaultAbi, functionName: 'isSigner', args: [attestor.address] });
    },

    async tokenDecimals(token: Address) {
      return client.readContract({ address: token, abi: erc20Abi, functionName: 'decimals' });
    },

    async tokenSymbol(token: Address) {
      return client.readContract({ address: token, abi: erc20Abi, functionName: 'symbol' });
    },

    /** The contract's own digest for a claim; used to prove server and contract hash alike. */
    async hashOnChain(claim: ClaimStruct) {
      return client.readContract({ address: cfg.vault, abi: vaultAbi, functionName: 'hashClaim', args: [claim] });
    },

    signClaim(claim: ClaimStruct) {
      return attestor.signTypedData({ domain: vaultDomain(cfg.chainId, cfg.vault), types: claimTypes, primaryType: 'Claim', message: claim });
    },

    /** True only for a successful transaction to this vault that emitted Claimed for this nonce and wallet. */
    async claimTxMatches(txHash: Hex, nonce: Hex, wallet: Address) {
      const receipt = await client.getTransactionReceipt({ hash: txHash }).catch(() => null);
      if (!receipt || receipt.status !== 'success' || !receipt.to || !isAddressEqual(receipt.to, cfg.vault)) return false;
      for (const log of receipt.logs) {
        if (!isAddressEqual(log.address, cfg.vault)) continue;
        try {
          const ev = decodeEventLog({ abi: vaultAbi, data: log.data, topics: log.topics });
          if (ev.eventName === 'Claimed' && ev.args.nonce === nonce && isAddressEqual(ev.args.wallet, wallet)) return true;
        } catch {
          // not a vault event we know
        }
      }
      return false;
    },
  };
}
