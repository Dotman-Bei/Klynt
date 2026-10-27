// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script, console2} from "forge-std/Script.sol";
import {KlyntScoreboard} from "../src/KlyntScoreboard.sol";

/// Deploys the scoreboard and registers the score service's signing key. It holds no funds.
///
/// Environment (never commit these):
///   DEPLOYER_PRIVATE_KEY   key that pays gas and becomes the owner
///   ATTESTOR_ADDRESS       public address of the score service's signing key (the same one the vault uses)
contract DeployScoreboard is Script {
    function run() external {
        uint256 key = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address owner = vm.addr(key);
        address attestor = vm.envAddress("ATTESTOR_ADDRESS");

        vm.startBroadcast(key);
        KlyntScoreboard board = new KlyntScoreboard(owner);
        board.setSigner(attestor, true);
        vm.stopBroadcast();

        console2.log("KlyntScoreboard:", address(board));
        console2.log("Owner:", owner);
        console2.log("Attestor:", attestor);
        console2.log("Chain id:", block.chainid);
    }
}
