# Mainnet claim test (internal)

**This is an internal test of the reward vault, not player activity.** Seven test wallets controlled by
the Klynt team claimed from a separate test season on BOT Chain mainnet to check the production contract
with a real token. Run on 2026-10-26.

| | |
| --- | --- |
| Network | BOT Chain mainnet (chain 677) |
| Vault | [0x9c2DF28F67554794E8ddaEE5f3E058ecDcEe04c1](https://scan.botchain.ai/address/0x9c2DF28F67554794E8ddaEE5f3E058ecDcEe04c1) |
| Token | Wrapped BOT (WBOT) [0xD5452816194a3784dBa983426cCe7c122F4abd30](https://scan.botchain.ai/address/0xD5452816194a3784dBa983426cCe7c122F4abd30) |
| Season | 900 (test season; Season 1 is reserved for GGI) |
| Budget | 0.011 WBOT, cap 0.002 WBOT per wallet, 0.001 WBOT per claim |
| Claims | 11 from 7 wallets, each signed by the score service's attestor key |
| Result | All 22 transactions succeeded; season 900 paid out exactly 0.011 WBOT and is empty |

## What it confirmed

- A claim signed by the server is accepted by the deployed contract on mainnet (same EIP-712 domain and digest).
- The per-wallet cap and the season budget hold: four wallets claimed twice (0.002, the cap), three once.
- The pool accounts exactly: funded 0.011, claimed 0.011, remaining 0.
- Each wallet's WBOT balance equals what the vault recorded for it.

## Transactions

Total gas paid: 0.035306 BOT at 20 gwei.

| # | Step | From | Gas | BOT | Transaction |
| --- | --- | --- | --- | --- | --- |
| 1 | hand-off 0.006 BOT wallet 1 -> wallet 2 | `0xeBa2…3794` | 21,000 | 0.000420 | [0x4408f002…](https://scan.botchain.ai/tx/0x4408f002d18103b0f4585447de43358903a7eab8029304beab3356f4d07fb1c7) |
| 2 | hand-off 0.006 BOT wallet 1 -> wallet 3 | `0xeBa2…3794` | 21,000 | 0.000420 | [0x5fe3c498…](https://scan.botchain.ai/tx/0x5fe3c49816e822994b78ec3e2b78e312dd0b52bfc887e8352c71f6f3f8882b50) |
| 3 | hand-off 0.006 BOT wallet 1 -> wallet 4 | `0xeBa2…3794` | 21,000 | 0.000420 | [0x42f5c4a0…](https://scan.botchain.ai/tx/0x42f5c4a02368259b4f5c0d9bcc44f7fc21908b7c98f1bc27f6d382990501009d) |
| 4 | hand-off 0.0035 BOT wallet 1 -> wallet 5 | `0xeBa2…3794` | 21,000 | 0.000420 | [0x19c63d60…](https://scan.botchain.ai/tx/0x19c63d60dba3780ad840b6f93c30b60de2a55737391fcfb3cc2d3b38b7f5ab3f) |
| 5 | hand-off 0.0035 BOT wallet 1 -> wallet 6 | `0xeBa2…3794` | 21,000 | 0.000420 | [0xdc307d6c…](https://scan.botchain.ai/tx/0xdc307d6c24cbab182004e43b6019b96fbe50d6991c1d38261b6f1ed4a3dbd71e) |
| 6 | hand-off 0.0035 BOT wallet 1 -> wallet 7 | `0xeBa2…3794` | 21,000 | 0.000420 | [0xf85d2fa8…](https://scan.botchain.ai/tx/0xf85d2fa896442c6d6bbc9df56b705bc72e696c2f71ef7be15a65dde2495b8be8) |
| 7 | wrap 0.011 BOT into WBOT | `0xFC1C…5BDb` | 44,866 | 0.000897 | [0xd4bca9a7…](https://scan.botchain.ai/tx/0xd4bca9a717a8f5017114b2d247a04dcb7cf4cbbae99b9960b10b19f206bb1541) |
| 8 | approve WBOT on the vault | `0xFC1C…5BDb` | 47,899 | 0.000958 | [0x21851e9d…](https://scan.botchain.ai/tx/0x21851e9d096c863f4edc852319fb960e57d7033d957cc073ed432f41be9b2c07) |
| 9 | create test season 900 | `0xFC1C…5BDb` | 101,679 | 0.002034 | [0xec5c49e0…](https://scan.botchain.ai/tx/0xec5c49e035a658fe94cefc477b29901ef793a70cc653d338bb514a3d3118aecc) |
| 10 | allow the vault to take 0.011 WBOT | `0xFC1C…5BDb` | 46,031 | 0.000921 | [0x697cc2ee…](https://scan.botchain.ai/tx/0x697cc2eeb4c0ccf70bbfffc2b7e575637483a2f9f4dceda7f53cdfc4b566c362) |
| 11 | fund season 900 with 0.011 WBOT | `0xFC1C…5BDb` | 86,357 | 0.001727 | [0xddee3eb0…](https://scan.botchain.ai/tx/0xddee3eb020f78e8a47287840b98de4bca23e3e16560795ea8f5773d3f56b352e) |
| 12 | claim 1 by wallet 1 | `0xeBa2…3794` | 132,192 | 0.002644 | [0x13f165bc…](https://scan.botchain.ai/tx/0x13f165bcdf68edddaff43a1f49d7a980ba8de9c47fa0844a4b3eb9ab6dc94ff9) |
| 13 | claim 2 by wallet 2 | `0x0dF4…9a32` | 132,192 | 0.002644 | [0x6694a307…](https://scan.botchain.ai/tx/0x6694a3073d68eb238fd7e7dfc993a1fa20a11b6eac1dd224ecf872600dd4c6fc) |
| 14 | claim 3 by wallet 3 | `0x6DA4…a8d8` | 132,180 | 0.002644 | [0xe4a84e28…](https://scan.botchain.ai/tx/0xe4a84e28228f8d1b5e8eeb6e0d74532f1ca7f4b408e9fd08b20af6bf51b842a0) |
| 15 | claim 4 by wallet 4 | `0xCd0e…30eb` | 132,180 | 0.002644 | [0x4af3d8f4…](https://scan.botchain.ai/tx/0x4af3d8f4eab3ba0cd21a90ce49108d6b2f8878459001a6e998885f5b91cd3fab) |
| 16 | claim 5 by wallet 5 | `0xF978…4B54` | 132,192 | 0.002644 | [0xc3ec3955…](https://scan.botchain.ai/tx/0xc3ec395585566377aae556d3e1976890672ffbce51885672f975b68ec60e8ce8) |
| 17 | claim 6 by wallet 6 | `0x69d0…1bf8` | 132,192 | 0.002644 | [0x5707598b…](https://scan.botchain.ai/tx/0x5707598bac476fd1660652bb4f6f5590b3d697c248cf72fc1b17539d12e8f7f6) |
| 18 | claim 7 by wallet 7 | `0x199d…dD4b` | 132,192 | 0.002644 | [0x9bb0eb76…](https://scan.botchain.ai/tx/0x9bb0eb76004c813943f55df2b0b9a09f28b901ae449c9152d76424e7f8ff9a9b) |
| 19 | claim 8 by wallet 1 | `0xeBa2…3794` | 97,980 | 0.001960 | [0x5a6c0bb6…](https://scan.botchain.ai/tx/0x5a6c0bb63d85ffed7f3fd4c74cb20887b49d6aec249d3c106f79e4eea4017c2e) |
| 20 | claim 9 by wallet 2 | `0x0dF4…9a32` | 97,992 | 0.001960 | [0x531da312…](https://scan.botchain.ai/tx/0x531da3124b8d7cd99c0bae0b436c004390a5af98b80d7f5c92cc3e015a379a21) |
| 21 | claim 10 by wallet 3 | `0x6DA4…a8d8` | 97,992 | 0.001960 | [0x3428372c…](https://scan.botchain.ai/tx/0x3428372c387da031a7d10f071628ab34fc4a8481bbc42de02bb0aca07437199c) |
| 22 | claim 11 by wallet 4 | `0xCd0e…30eb` | 93,192 | 0.001864 | [0x68050121…](https://scan.botchain.ai/tx/0x6805012193a28d639a4bc9fd2f0c0b92b44e7c27074d8a58c188bbbe2e8f7363) |

Script: `scripts/mainnet-claim-test.mjs` (rehearsed first on a local fork of mainnet). Raw log: `mainnet-claim-test.json`.
