// Integration check: the server's claim signatures against a deployed vault on a local chain.
// 1. anvil   2. forge script contracts/script/Deploy.s.sol (see README)   3. run with env:
//    NEXT_PUBLIC_CHAIN_ID=31337 REWARD_RPC_URL=http://127.0.0.1:8545 NEXT_PUBLIC_REWARD_VAULT=<vault>
//    ATTESTOR_PRIVATE_KEY=<anvil key 1> PLAYER_PRIVATE_KEY=<anvil key 2>
//    node --experimental-strip-types --no-warnings scripts/check-vault.ts
// Uses only throwaway development keys. Never point it at a real network with real keys.
import { createWalletClient, defineChain, http, keccak256, toHex, type Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { hashTypedData } from 'viem';
import { erc20Abi, vaultAbi } from '../src/lib/vaultAbi.ts';
import { claimTypes, vaultDomain, type ClaimStruct } from '../src/server/rewards.ts';
import { vaultClient, vaultConfig } from '../src/server/vault.ts';

const cfg = vaultConfig();
if (!cfg) throw new Error('Set NEXT_PUBLIC_REWARD_VAULT and ATTESTOR_PRIVATE_KEY');
const v = vaultClient(cfg);
const player = privateKeyToAccount(process.env.PLAYER_PRIVATE_KEY as Hex);
const chain = defineChain({ id: cfg.chainId, name: 'local', nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 }, rpcUrls: { default: { http: [cfg.rpcUrl] } } });
const wallet = createWalletClient({ account: player, chain, transport: http(cfg.rpcUrl) });

let failed = 0;
const check = (label: string, ok: boolean, detail?: unknown) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${detail === undefined ? '' : ` — ${String(detail)}`}`);
  if (!ok) failed++;
};

const season = await v.season(1);
check('season 1 exists and is funded', season.exists && season.funded > 0n, season.funded);
check('attestor key is an active signer on the vault', await v.attestorActive());

const claim: ClaimStruct = {
  wallet: player.address,
  seasonId: 1n,
  gameId: keccak256(toHex('klynt:all-games')),
  token: season.token,
  amount: 5n * 10n ** 18n,
  nonce: keccak256(toHex(`check-${Date.now()}`)),
  expiry: BigInt(Math.floor(Date.now() / 1000) + 3600),
};

const local = hashTypedData({ domain: vaultDomain(cfg.chainId, cfg.vault), types: claimTypes, primaryType: 'Claim', message: claim });
const onChain = await v.hashOnChain(claim);
check('server digest equals the contract digest', local === onChain, `${local} vs ${onChain}`);

const signature = await v.signClaim(claim);
const before = await (await import('viem')).createPublicClient({ transport: http(cfg.rpcUrl) }).readContract({ address: season.token, abi: erc20Abi, functionName: 'balanceOf', args: [player.address] });
const tx = await wallet.writeContract({ address: cfg.vault, abi: vaultAbi, functionName: 'claim', args: [claim, signature] });
const pc = (await import('viem')).createPublicClient({ transport: http(cfg.rpcUrl) });
await pc.waitForTransactionReceipt({ hash: tx });
const after = await pc.readContract({ address: season.token, abi: erc20Abi, functionName: 'balanceOf', args: [player.address] });
check('server-signed claim pays the player', after - before === claim.amount, after - before);
check('nonce marked used on-chain', await v.nonceUsed(claim.nonce));
check('receipt check accepts the real claim', await v.claimTxMatches(tx, claim.nonce, player.address));
check('receipt check rejects a different nonce', !(await v.claimTxMatches(tx, keccak256(toHex('other')), player.address)));
check('receipt check rejects a different wallet', !(await v.claimTxMatches(tx, claim.nonce, '0x0000000000000000000000000000000000000001')));

try {
  await pc.simulateContract({ account: player, address: cfg.vault, abi: vaultAbi, functionName: 'claim', args: [claim, signature] });
  check('replaying the claim reverts', false);
} catch (e) {
  check('replaying the claim reverts with NonceAlreadyUsed', /NonceAlreadyUsed/.test(String(e)));
}

if (failed) process.exitCode = 1;
