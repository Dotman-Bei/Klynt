// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script, console2} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {KlyntRewardVault} from "../src/KlyntRewardVault.sol";
import {KlyntTestPoints} from "../src/KlyntTestPoints.sol";

/// Deploys the reward vault and, unless REWARD_TOKEN is set, testnet points to pay out.
///
/// Environment (never commit these):
///   DEPLOYER_PRIVATE_KEY   key that pays gas and becomes the owner (use a hardware wallet in production)
///   ATTESTOR_ADDRESS       public address of the score service's signing key
///   REWARD_TOKEN           optional: an existing, verified ERC-20. Empty deploys KTP-TEST (testnet only)
///   SEASON_BUDGET          optional, whole tokens: create and fund Season 1 with this budget
///   SEASON_WALLET_CAP      optional, whole tokens per wallet (default: budget / 100)
///   SEASON_DAYS            optional, claim window in days (default 30)
contract Deploy is Script {
    function run() external {
        uint256 key = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address owner = vm.addr(key);
        address attestor = vm.envAddress("ATTESTOR_ADDRESS");
        address token = vm.envOr("REWARD_TOKEN", address(0));
        uint256 budget = vm.envOr("SEASON_BUDGET", uint256(0));

        if (token == address(0) && block.chainid == 677) revert("Refusing to deploy test points on BOT Chain mainnet");

        vm.startBroadcast(key);
        KlyntRewardVault vault = new KlyntRewardVault(owner);
        if (token == address(0)) {
            KlyntTestPoints points = new KlyntTestPoints(owner);
            token = address(points);
            if (budget > 0) points.mint(owner, budget * 1e18);
            console2.log("KlyntTestPoints (no value):", token);
        }
        vault.setTokenApproved(token, true);
        vault.setSigner(attestor, true);

        if (budget > 0) {
            uint256 cap = vm.envOr("SEASON_WALLET_CAP", budget / 100);
            uint256 days_ = vm.envOr("SEASON_DAYS", uint256(30));
            vault.createSeason(1, token, uint64(block.timestamp), uint64(block.timestamp + days_ * 1 days), uint128(budget * 1e18), uint128(cap * 1e18));
            IERC20(token).approve(address(vault), budget * 1e18);
            vault.fund(1, budget * 1e18);
        }
        vm.stopBroadcast();

        console2.log("KlyntRewardVault:", address(vault));
        console2.log("Owner:", owner);
        console2.log("Attestor:", attestor);
        console2.log("Reward token:", token);
        console2.log("Chain id:", block.chainid);
    }
}
