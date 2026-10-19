// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title Klynt testnet points
/// @notice A testnet-only stand-in reward asset for development and demos, used while the GGI token
///         is unverified (PRD §3.5, §9). It has no value, is not GGI and is not a Klynt token.
///         Never deploy it to mainnet.
contract KlyntTestPoints is ERC20, Ownable {
    error MainnetNotAllowed();

    constructor(address owner_) ERC20("Klynt Testnet Points (no value)", "KTP-TEST") Ownable(owner_) {
        if (block.chainid == 677) revert MainnetNotAllowed(); // BOT Chain mainnet
    }

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}
