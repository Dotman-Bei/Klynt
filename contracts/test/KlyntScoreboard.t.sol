// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {KlyntScoreboard} from "../src/KlyntScoreboard.sol";

contract KlyntScoreboardTest is Test {
    KlyntScoreboard board;
    address owner = makeAddr("owner");
    address player = makeAddr("player");
    address other = makeAddr("other");
    uint256 signerKey = 0x5C0BE;
    bytes32 constant HEXTRIS = keccak256("hextris");

    function setUp() public {
        vm.warp(1_760_000_000);
        board = new KlyntScoreboard(owner);
        vm.prank(owner);
        board.setSigner(vm.addr(signerKey), true);
    }

    function _rec(uint64 score, bytes32 runId) internal view returns (KlyntScoreboard.Record memory) {
        return KlyntScoreboard.Record({
            wallet: player, seasonId: 1, gameId: HEXTRIS, score: score, runId: runId, expiry: uint64(block.timestamp + 1 hours)
        });
    }

    function _sign(KlyntScoreboard.Record memory r, uint256 key) internal view returns (bytes memory) {
        (uint8 v, bytes32 rr, bytes32 s) = vm.sign(key, board.hashRecord(r));
        return abi.encodePacked(rr, s, v);
    }

    function test_recordsARunAndKeepsTheBest() public {
        KlyntScoreboard.Record memory a = _rec(1340, "run1");
        bytes memory sa = _sign(a, signerKey);
        vm.expectEmit(address(board));
        emit KlyntScoreboard.ScoreRecorded(1, HEXTRIS, player, 1340, "run1", true);
        vm.prank(player);
        board.record(a, sa);

        KlyntScoreboard.Record memory b = _rec(900, "run2");
        bytes memory sb = _sign(b, signerKey);
        vm.expectEmit(address(board));
        emit KlyntScoreboard.ScoreRecorded(1, HEXTRIS, player, 900, "run2", false);
        vm.prank(player);
        board.record(b, sb);

        assertEq(board.bestScore(1, HEXTRIS, player), 1340);
        assertEq(board.runsRecorded(1, HEXTRIS, player), 2);
        assertTrue(board.recorded("run1"));
    }

    function test_aRunCanBeRecordedOnce() public {
        KlyntScoreboard.Record memory a = _rec(10, "run1");
        bytes memory s = _sign(a, signerKey);
        vm.startPrank(player);
        board.record(a, s);
        vm.expectRevert(KlyntScoreboard.AlreadyRecorded.selector);
        board.record(a, s);
        vm.stopPrank();
    }

    function test_onlyThePlayerCanRecord() public {
        KlyntScoreboard.Record memory a = _rec(10, "run1");
        bytes memory s = _sign(a, signerKey);
        vm.prank(other);
        vm.expectRevert(KlyntScoreboard.NotYourRecord.selector);
        board.record(a, s);
    }

    function test_editedScoreBreaksTheSignature() public {
        KlyntScoreboard.Record memory a = _rec(10, "run1");
        bytes memory s = _sign(a, signerKey);
        a.score = 99_999;
        vm.prank(player);
        vm.expectRevert(KlyntScoreboard.BadSignature.selector);
        board.record(a, s);
    }

    function test_unknownOrRevokedSignerIsRefused() public {
        KlyntScoreboard.Record memory a = _rec(10, "run1");
        bytes memory bad = _sign(a, 0xBAD);
        vm.prank(player);
        vm.expectRevert(KlyntScoreboard.BadSignature.selector);
        board.record(a, bad);

        bytes memory good = _sign(a, signerKey);
        vm.prank(owner);
        board.setSigner(vm.addr(signerKey), false);
        vm.prank(player);
        vm.expectRevert(KlyntScoreboard.BadSignature.selector);
        board.record(a, good);
    }

    function test_expiredRecordIsRefused() public {
        KlyntScoreboard.Record memory a = _rec(10, "run1");
        bytes memory s = _sign(a, signerKey);
        vm.warp(a.expiry + 1);
        vm.prank(player);
        vm.expectRevert(KlyntScoreboard.RecordExpired.selector);
        board.record(a, s);
    }

    function test_signatureForAnotherChainIsRefused() public {
        KlyntScoreboard.Record memory a = _rec(10, "run1");
        bytes memory s = _sign(a, signerKey);
        vm.chainId(968);
        vm.prank(player);
        vm.expectRevert(KlyntScoreboard.BadSignature.selector);
        board.record(a, s);
    }

    function test_onlyOwnerManagesSigners() public {
        vm.prank(other);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, other));
        board.setSigner(other, true);
        vm.prank(owner);
        vm.expectRevert(KlyntScoreboard.RenounceDisabled.selector);
        board.renounceOwnership();
    }

    function testFuzz_bestIsTheMaximum(uint64[5] memory scores) public {
        uint64 max;
        for (uint256 i; i < scores.length; i++) {
            KlyntScoreboard.Record memory r = _rec(scores[i], keccak256(abi.encode(i)));
            bytes memory s = _sign(r, signerKey);
            vm.prank(player);
            board.record(r, s);
            if (scores[i] > max) max = scores[i];
        }
        assertEq(board.bestScore(1, HEXTRIS, player), max);
        assertEq(board.runsRecorded(1, HEXTRIS, player), 5);
    }
}
