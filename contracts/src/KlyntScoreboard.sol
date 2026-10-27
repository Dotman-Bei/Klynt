// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/// @title Klynt scoreboard
/// @notice Public, verifiable records of ranked runs. After the score service accepts a run, it signs a
///         record; the player submits it here and pays the gas. Each run can be recorded once, only by
///         the wallet that played it, and the contract keeps every wallet's best score per game and season.
/// @dev Holds no funds and pays nothing. Trust assumption, as for rewards: the off-chain score service
///      decides which runs were accepted; this contract makes its decisions public and tamper-evident.
contract KlyntScoreboard is EIP712, Ownable2Step {
    struct Record {
        address wallet;
        uint256 seasonId;
        bytes32 gameId;
        uint64 score;
        bytes32 runId;
        uint64 expiry;
    }

    bytes32 public constant RECORD_TYPEHASH =
        keccak256("Record(address wallet,uint256 seasonId,bytes32 gameId,uint64 score,bytes32 runId,uint64 expiry)");

    mapping(address signer => bool) public isSigner;
    mapping(bytes32 runId => bool) public recorded;
    mapping(uint256 seasonId => mapping(bytes32 gameId => mapping(address wallet => uint64))) public bestScore;
    mapping(uint256 seasonId => mapping(bytes32 gameId => mapping(address wallet => uint32))) public runsRecorded;

    event SignerSet(address indexed signer, bool active);
    event ScoreRecorded(
        uint256 indexed seasonId, bytes32 indexed gameId, address indexed wallet, uint64 score, bytes32 runId, bool newBest
    );

    error ZeroAddress();
    error NotYourRecord();
    error RecordExpired();
    error AlreadyRecorded();
    error BadSignature();
    error RenounceDisabled();

    constructor(address owner_) EIP712("Klynt Scoreboard", "1") Ownable(owner_) {}

    /// @notice Adds, rotates or revokes a score-service key.
    function setSigner(address signer, bool active) external onlyOwner {
        if (signer == address(0)) revert ZeroAddress();
        isSigner[signer] = active;
        emit SignerSet(signer, active);
    }

    function renounceOwnership() public pure override {
        revert RenounceDisabled();
    }

    function hashRecord(Record calldata r) public view returns (bytes32) {
        return _hashTypedDataV4(
            keccak256(abi.encode(RECORD_TYPEHASH, r.wallet, r.seasonId, r.gameId, r.score, r.runId, r.expiry))
        );
    }

    /// @notice Records one accepted run. Only the wallet that played it can submit it, once.
    function record(Record calldata r, bytes calldata signature) external {
        if (msg.sender != r.wallet) revert NotYourRecord();
        if (block.timestamp > r.expiry) revert RecordExpired();
        if (recorded[r.runId]) revert AlreadyRecorded();
        (address signer, ECDSA.RecoverError err,) = ECDSA.tryRecover(hashRecord(r), signature);
        if (err != ECDSA.RecoverError.NoError || !isSigner[signer]) revert BadSignature();

        recorded[r.runId] = true;
        unchecked {
            runsRecorded[r.seasonId][r.gameId][r.wallet] += 1;
        }
        bool newBest = r.score > bestScore[r.seasonId][r.gameId][r.wallet];
        if (newBest) bestScore[r.seasonId][r.gameId][r.wallet] = r.score;
        emit ScoreRecorded(r.seasonId, r.gameId, r.wallet, r.score, r.runId, newBest);
    }
}
