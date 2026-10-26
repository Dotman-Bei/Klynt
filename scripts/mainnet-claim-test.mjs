// Internal test of the reward vault with a real token: a small, capped WBOT season (id 900) and
// 11 claims from 7 test wallets. Not player activity; every transaction is listed in the output file.
//
//   node scripts/mainnet-claim-test.mjs setup  [rpc]   owner wraps BOT, approves WBOT, creates and funds season 900
//   node scripts/mainnet-claim-test.mjs claims [rpc]   7 wallets make 11 server-signed claims
//
// Keys are read from git-ignored files only: contracts/.env (owner), .env.local (attestor),
// .data/mainnet-test-wallets.json (test wallets). Nothing secret is printed.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createPublicClient, createWalletClient, defineChain, http, keccak256, parseEther, toHex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

const [phase, rpc = 'https://rpc.botchain.ai'] = process.argv.slice(2);
const VAULT = '0x9c2DF28F67554794E8ddaEE5f3E058ecDcEe04c1';
const WBOT = '0xD5452816194a3784dBa983426cCe7c122F4abd30';
const SEASON = 900n;
const PER_CLAIM = parseEther('0.001');
const BUDGET = parseEther('0.011');
const CAP = parseEther('0.002');
const GAME = keccak256(toHex('klynt:mainnet-test'));
// Wallets 1-4 claim twice, 5-7 once: 11 claims.
const SCHEDULE = [1, 2, 3, 4, 5, 6, 7, 1, 2, 3, 4];

const envVal = (file, name) => (readFileSync(file, 'utf8').match(new RegExp(`^${name}=(0x[0-9a-fA-F]{64})`, 'm')) || [])[1];
const owner = privateKeyToAccount(envVal('contracts/.env', 'DEPLOYER_PRIVATE_KEY'));
const attestor = privateKeyToAccount(envVal('.env.local', 'ATTESTOR_PRIVATE_KEY'));
const wallets = JSON.parse(readFileSync('.data/mainnet-test-wallets.json', 'utf8'));

const pub = createPublicClient({ transport: http(rpc) });
const chainId = await pub.getChainId();
const chain = defineChain({ id: chainId, name: 'bot', nativeCurrency: { name: 'BOT', symbol: 'BOT', decimals: 18 }, rpcUrls: { default: { http: [rpc] } } });
const walletClient = (account) => createWalletClient({ account, chain, transport: http(rpc) });

const vaultAbi = [
  { type: 'function', name: 'setTokenApproved', stateMutability: 'nonpayable', inputs: [{ name: 't', type: 'address' }, { name: 'a', type: 'bool' }], outputs: [] },
  { type: 'function', name: 'createSeason', stateMutability: 'nonpayable', inputs: [{ name: 'id', type: 'uint256' }, { name: 'token', type: 'address' }, { name: 'startsAt', type: 'uint64' }, { name: 'claimsUntil', type: 'uint64' }, { name: 'budget', type: 'uint128' }, { name: 'cap', type: 'uint128' }], outputs: [] },
  { type: 'function', name: 'fund', stateMutability: 'nonpayable', inputs: [{ name: 'id', type: 'uint256' }, { name: 'amount', type: 'uint256' }], outputs: [] },
  { type: 'function', name: 'remaining', stateMutability: 'view', inputs: [{ name: 'id', type: 'uint256' }], outputs: [{ type: 'uint256' }] },
  {
    type: 'function', name: 'claim', stateMutability: 'nonpayable',
    inputs: [{ type: 'tuple', name: 'c', components: [
      { name: 'wallet', type: 'address' }, { name: 'seasonId', type: 'uint256' }, { name: 'gameId', type: 'bytes32' }, { name: 'token', type: 'address' },
      { name: 'amount', type: 'uint256' }, { name: 'nonce', type: 'bytes32' }, { name: 'expiry', type: 'uint64' }] }, { name: 'signature', type: 'bytes' }],
    outputs: [],
  },
];
const wbotAbi = [
  { type: 'function', name: 'deposit', stateMutability: 'payable', inputs: [], outputs: [] },
  { type: 'function', name: 'approve', stateMutability: 'nonpayable', inputs: [{ name: 's', type: 'address' }, { name: 'a', type: 'uint256' }], outputs: [{ type: 'bool' }] },
  { type: 'function', name: 'balanceOf', stateMutability: 'view', inputs: [{ name: 'a', type: 'address' }], outputs: [{ type: 'uint256' }] },
];

const log = [];
async function send(label, account, req) {
  // Flat 20 gwei (BOT Chain's base fee is 0) and a gas limit 10% over the estimate, so the balance a
  // wallet needs is exactly predictable: gas limit x gas price.
  const gas = (await pub.estimateContractGas({ ...req, account })) * 11n / 10n;
  const hash = await walletClient(account).writeContract({ ...req, chain, gas, gasPrice: process.env.GAS_PRICE ? BigInt(process.env.GAS_PRICE) : await pub.getGasPrice() });
  const r = await pub.waitForTransactionReceipt({ hash });
  if (r.status !== 'success') throw new Error(`${label} failed: ${hash}`);
  log.push({ label, from: account.address, hash, gasUsed: Number(r.gasUsed), effectiveGasPrice: r.effectiveGasPrice.toString() });
  console.log(`ok  ${label.padEnd(34)} gas ${String(r.gasUsed).padStart(7)}  ${hash}`);
  return r;
}

if (phase === 'setup') {
  const now = BigInt(Math.floor(Date.now() / 1000));
  await send('wrap 0.011 BOT into WBOT', owner, { address: WBOT, abi: wbotAbi, functionName: 'deposit', value: BUDGET });
  await send('approve WBOT on the vault', owner, { address: VAULT, abi: vaultAbi, functionName: 'setTokenApproved', args: [WBOT, true] });
  await send('create test season 900', owner, { address: VAULT, abi: vaultAbi, functionName: 'createSeason', args: [SEASON, WBOT, now - 60n, now + 7n * 86400n, BUDGET, CAP] });
  await send('allow the vault to take 0.011 WBOT', owner, { address: WBOT, abi: wbotAbi, functionName: 'approve', args: [VAULT, BUDGET] });
  await send('fund season 900 with 0.011 WBOT', owner, { address: VAULT, abi: vaultAbi, functionName: 'fund', args: [SEASON, BUDGET] });
} else if (phase === 'claims') {
  const domain = { name: 'Klynt Reward Vault', version: '1', chainId, verifyingContract: VAULT };
  const types = { Claim: [
    { name: 'wallet', type: 'address' }, { name: 'seasonId', type: 'uint256' }, { name: 'gameId', type: 'bytes32' }, { name: 'token', type: 'address' },
    { name: 'amount', type: 'uint256' }, { name: 'nonce', type: 'bytes32' }, { name: 'expiry', type: 'uint64' }] };
  for (const [i, n] of SCHEDULE.entries()) {
    const w = privateKeyToAccount(wallets[n - 1].key);
    const claim = { wallet: w.address, seasonId: SEASON, gameId: GAME, token: WBOT, amount: PER_CLAIM,
      nonce: keccak256(toHex(`klynt-mainnet-test-${i + 1}-${w.address}`)), expiry: BigInt(Math.floor(Date.now() / 1000) + 3600) };
    const signature = await attestor.signTypedData({ domain, types, primaryType: 'Claim', message: claim });
    await send(`claim ${i + 1} by wallet ${n}`, w, { address: VAULT, abi: vaultAbi, functionName: 'claim', args: [claim, signature] });
  }
  console.log('season 900 left:', (await pub.readContract({ address: VAULT, abi: vaultAbi, functionName: 'remaining', args: [SEASON] })).toString());
} else {
  throw new Error('phase must be setup or claims');
}

const isLocal = /127.0.0.1|localhost/.test(rpc);
const out = `.data/mainnet-test-${isLocal ? 'rehearsal' : 'mainnet'}.json`;
const prev = existsSync(out) ? JSON.parse(readFileSync(out, 'utf8')) : [];
writeFileSync(out, JSON.stringify([...prev, ...log], null, 1));
console.log('gas total', log.reduce((t, x) => t + x.gasUsed, 0), '→', out);
