// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {KlyntRewardVault} from "../src/KlyntRewardVault.sol";
import {KlyntTestPoints} from "../src/KlyntTestPoints.sol";

/// A token that keeps 1% of every transfer, which the vault must refuse.
contract FeeToken is ERC20 {
    constructor() ERC20("Fee", "FEE") {
        _mint(msg.sender, 1e30);
    }

    function _update(address from, address to, uint256 value) internal override {
        if (from != address(0) && to != address(0)) {
            uint256 fee = value / 100;
            super._update(from, address(0xdead), fee);
            value -= fee;
        }
        super._update(from, to, value);
    }
}

contract KlyntRewardVaultTest is Test {
    KlyntRewardVault vault;
    KlyntTestPoints points;

    address owner = makeAddr("owner");
    address player = makeAddr("player");
    address other = makeAddr("other");
    uint256 signerKey = 0xA11CE;
    address signer;

    uint256 constant SEASON = 1;
    bytes32 constant HEXTRIS = keccak256("hextris");
    uint128 constant BUDGET = 1_000e18;
    uint128 constant CAP = 100e18;
    uint64 start;
    uint64 until;

    function setUp() public {
        vm.warp(1_760_000_000);
        start = uint64(block.timestamp);
        until = uint64(block.timestamp + 30 days);
        signer = vm.addr(signerKey);
        vault = new KlyntRewardVault(owner);
        points = new KlyntTestPoints(owner);

        vm.startPrank(owner);
        points.mint(owner, BUDGET);
        vault.setTokenApproved(address(points), true);
        vault.setSigner(signer, true);
        vault.createSeason(SEASON, address(points), start, until, BUDGET, CAP);
        points.approve(address(vault), BUDGET);
        vault.fund(SEASON, BUDGET);
        vm.stopPrank();
    }

    // ---------------------------------------------------------------- helpers

    function _claim(uint256 amount, bytes32 nonce) internal view returns (KlyntRewardVault.Claim memory c) {
        c = KlyntRewardVault.Claim({
            wallet: player,
            seasonId: SEASON,
            gameId: HEXTRIS,
            token: address(points),
            amount: amount,
            nonce: nonce,
            expiry: uint64(block.timestamp + 1 days)
        });
    }

    function _sign(KlyntRewardVault.Claim memory c, uint256 key) internal view returns (bytes memory) {
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(key, vault.hashClaim(c));
        return abi.encodePacked(r, s, v);
    }

    // ---------------------------------------------------------------- the happy path

    function test_claimPaysTheWalletAndRecordsIt() public {
        KlyntRewardVault.Claim memory c = _claim(40e18, "n1");
        bytes memory sig0 = _sign(c, signerKey);
        vm.expectEmit(address(vault));
        emit KlyntRewardVault.Claimed(SEASON, player, HEXTRIS, address(points), 40e18, "n1");
        vm.prank(player);
        vault.claim(c, sig0);
        assertEq(points.balanceOf(player), 40e18);
        assertEq(vault.claimedBy(SEASON, player), 40e18);
        assertEq(vault.remaining(SEASON), BUDGET - 40e18);
        assertTrue(vault.nonceUsed("n1"));
    }

    // ---------------------------------------------------------------- replay, expiry, recipients

    function test_sameAuthorisationCannotBeClaimedTwice() public {
        KlyntRewardVault.Claim memory c = _claim(10e18, "n1");
        bytes memory sig = _sign(c, signerKey);
        vm.startPrank(player);
        vault.claim(c, sig);
        vm.expectRevert(KlyntRewardVault.NonceAlreadyUsed.selector);
        vault.claim(c, sig);
        vm.stopPrank();
    }

    function test_expiredClaimReverts() public {
        KlyntRewardVault.Claim memory c = _claim(10e18, "n1");
        bytes memory sig = _sign(c, signerKey);
        vm.warp(c.expiry + 1);
        vm.prank(player);
        vm.expectRevert(KlyntRewardVault.ClaimExpired.selector);
        vault.claim(c, sig);
    }

    function test_onlyTheNamedWalletCanClaim() public {
        KlyntRewardVault.Claim memory c = _claim(10e18, "n1");
        bytes memory sig = _sign(c, signerKey);
        vm.prank(other);
        vm.expectRevert(KlyntRewardVault.NotYourClaim.selector);
        vault.claim(c, sig);
    }

    function test_changingTheRecipientBreaksTheSignature() public {
        KlyntRewardVault.Claim memory c = _claim(10e18, "n1");
        bytes memory sig = _sign(c, signerKey);
        c.wallet = other;
        vm.prank(other);
        vm.expectRevert(KlyntRewardVault.BadSignature.selector);
        vault.claim(c, sig);
    }

    function test_changingTheAmountBreaksTheSignature() public {
        KlyntRewardVault.Claim memory c = _claim(10e18, "n1");
        bytes memory sig = _sign(c, signerKey);
        c.amount = 90e18;
        vm.prank(player);
        vm.expectRevert(KlyntRewardVault.BadSignature.selector);
        vault.claim(c, sig);
    }

    // ---------------------------------------------------------------- signatures

    function test_signatureFromAnUnauthorisedKeyReverts() public {
        KlyntRewardVault.Claim memory c = _claim(10e18, "n1");
        bytes memory sig = _sign(c, 0xBAD);
        vm.prank(player);
        vm.expectRevert(KlyntRewardVault.BadSignature.selector);
        vault.claim(c, sig);
    }

    function test_malformedSignatureReverts() public {
        KlyntRewardVault.Claim memory c = _claim(10e18, "n1");
        vm.prank(player);
        vm.expectRevert(KlyntRewardVault.BadSignature.selector);
        vault.claim(c, hex"1234");
    }

    function test_revokedSignerStopsUnspentClaims() public {
        KlyntRewardVault.Claim memory c = _claim(10e18, "n1");
        bytes memory sig = _sign(c, signerKey);
        vm.prank(owner);
        vault.setSigner(signer, false);
        vm.prank(player);
        vm.expectRevert(KlyntRewardVault.BadSignature.selector);
        vault.claim(c, sig);
    }

    function test_signatureForAnotherVaultReverts() public {
        KlyntRewardVault otherVault = new KlyntRewardVault(owner);
        KlyntRewardVault.Claim memory c = _claim(10e18, "n1");
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerKey, otherVault.hashClaim(c));
        vm.prank(player);
        vm.expectRevert(KlyntRewardVault.BadSignature.selector);
        vault.claim(c, abi.encodePacked(r, s, v));
    }

    function test_signatureForAnotherChainReverts() public {
        KlyntRewardVault.Claim memory c = _claim(10e18, "n1");
        bytes memory sig = _sign(c, signerKey); // signed for this chain
        vm.chainId(677);
        vm.prank(player);
        vm.expectRevert(KlyntRewardVault.BadSignature.selector);
        vault.claim(c, sig);
    }

    function test_wrongTokenReverts() public {
        KlyntRewardVault.Claim memory c = _claim(10e18, "n1");
        c.token = address(0xBEEF);
        bytes memory sig = _sign(c, signerKey);
        vm.prank(player);
        vm.expectRevert(KlyntRewardVault.WrongToken.selector);
        vault.claim(c, sig);
    }

    // ---------------------------------------------------------------- budgets and caps

    function test_walletCapIsEnforced() public {
        KlyntRewardVault.Claim memory a = _claim(CAP, "n1");
        KlyntRewardVault.Claim memory b = _claim(1, "n2");
        bytes memory sigA = _sign(a, signerKey);
        bytes memory sigB = _sign(b, signerKey);
        vm.startPrank(player);
        vault.claim(a, sigA);
        vm.expectRevert(KlyntRewardVault.WalletCapReached.selector);
        vault.claim(b, sigB);
        vm.stopPrank();
    }

    function test_exhaustedPoolReverts() public {
        // A season funded with less than one wallet's cap runs dry first.
        vm.startPrank(owner);
        points.mint(owner, 50e18);
        vault.createSeason(2, address(points), start, until, 500e18, 100e18);
        points.approve(address(vault), 50e18);
        vault.fund(2, 50e18);
        vm.stopPrank();

        KlyntRewardVault.Claim memory c = _claim(60e18, "n1");
        c.seasonId = 2;
        bytes memory sig = _sign(c, signerKey);
        vm.prank(player);
        vm.expectRevert(KlyntRewardVault.PoolExhausted.selector);
        vault.claim(c, sig);
    }

    function test_fundingCannotExceedTheBudget() public {
        vm.startPrank(owner);
        points.mint(owner, 1);
        points.approve(address(vault), 1);
        vm.expectRevert(KlyntRewardVault.OverBudget.selector);
        vault.fund(SEASON, 1);
        vm.stopPrank();
    }

    function test_feeOnTransferTokensAreRefused() public {
        vm.startPrank(owner);
        FeeToken fee = new FeeToken();
        vault.setTokenApproved(address(fee), true);
        vault.createSeason(3, address(fee), start, until, 1_000e18, 100e18);
        fee.approve(address(vault), 100e18);
        vm.expectRevert(KlyntRewardVault.UnsupportedToken.selector);
        vault.fund(3, 100e18);
        vm.stopPrank();
    }

    function test_zeroAmountClaimReverts() public {
        KlyntRewardVault.Claim memory c = _claim(0, "n1");
        bytes memory sig = _sign(c, signerKey);
        vm.prank(player);
        vm.expectRevert(KlyntRewardVault.ZeroAmount.selector);
        vault.claim(c, sig);
    }

    // ---------------------------------------------------------------- pausing and windows

    function test_seasonPauseStopsNewClaimsAndKeepsOldOnes() public {
        KlyntRewardVault.Claim memory a = _claim(10e18, "n1");
        KlyntRewardVault.Claim memory b = _claim(10e18, "n2");
        bytes memory sigA = _sign(a, signerKey);
        vm.prank(player);
        vault.claim(a, sigA);

        vm.prank(owner);
        vault.setSeasonPaused(SEASON, true);
        bytes memory sigB = _sign(b, signerKey);
        vm.prank(player);
        vm.expectRevert(KlyntRewardVault.SeasonIsPaused.selector);
        vault.claim(b, sigB);
        assertEq(points.balanceOf(player), 10e18, "paid claim survives the pause");
        assertEq(vault.claimedBy(SEASON, player), 10e18);

        vm.prank(owner);
        vault.setSeasonPaused(SEASON, false);
        vm.prank(player);
        vault.claim(b, sigB);
        assertEq(points.balanceOf(player), 20e18);
    }

    function test_globalPauseStopsClaims() public {
        KlyntRewardVault.Claim memory c = _claim(10e18, "n1");
        bytes memory sig = _sign(c, signerKey);
        vm.prank(owner);
        vault.pause();
        vm.prank(player);
        vm.expectRevert(Pausable.EnforcedPause.selector);
        vault.claim(c, sig);
    }

    function test_claimsOutsideTheWindowRevert() public {
        KlyntRewardVault.Claim memory c = _claim(10e18, "n1");
        c.expiry = until + 10 days;
        bytes memory sig = _sign(c, signerKey);
        vm.warp(until + 1);
        vm.prank(player);
        vm.expectRevert(KlyntRewardVault.OutsideClaimWindow.selector);
        vault.claim(c, sig);
    }

    function test_unclaimedFundsReturnOnlyAfterTheWindow() public {
        vm.prank(owner);
        vm.expectRevert(KlyntRewardVault.ClaimsStillOpen.selector);
        vault.withdrawUnclaimed(SEASON, owner);

        KlyntRewardVault.Claim memory c = _claim(10e18, "n1");
        bytes memory sig = _sign(c, signerKey);
        vm.prank(player);
        vault.claim(c, sig);

        vm.warp(until + 1);
        vm.prank(owner);
        vault.withdrawUnclaimed(SEASON, owner);
        assertEq(points.balanceOf(owner), BUDGET - 10e18);
        assertEq(vault.remaining(SEASON), 0);
    }

    // ---------------------------------------------------------------- admin access

    function test_onlyTheOwnerCanAdminister() public {
        bytes memory notOwner = abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, other);
        vm.startPrank(other);
        vm.expectRevert(notOwner);
        vault.setSigner(other, true);
        vm.expectRevert(notOwner);
        vault.setTokenApproved(address(points), false);
        vm.expectRevert(notOwner);
        vault.createSeason(9, address(points), start, until, 1, 1);
        vm.expectRevert(notOwner);
        vault.fund(SEASON, 1);
        vm.expectRevert(notOwner);
        vault.setSeasonPaused(SEASON, true);
        vm.expectRevert(notOwner);
        vault.pause();
        vm.expectRevert(notOwner);
        vault.withdrawUnclaimed(SEASON, other);
        vm.stopPrank();
    }

    function test_ownershipCannotBeRenounced() public {
        vm.prank(owner);
        vm.expectRevert(KlyntRewardVault.RenounceDisabled.selector);
        vault.renounceOwnership();
    }

    function test_ownershipMovesInTwoSteps() public {
        vm.prank(owner);
        vault.transferOwnership(other);
        assertEq(vault.owner(), owner, "unchanged until accepted");
        vm.prank(other);
        vault.acceptOwnership();
        assertEq(vault.owner(), other);
    }

    function test_seasonsNeedAnApprovedTokenAndSaneConfig() public {
        vm.startPrank(owner);
        vm.expectRevert(KlyntRewardVault.TokenNotApproved.selector);
        vault.createSeason(4, address(0xBEEF), start, until, 1, 1);
        vm.expectRevert(KlyntRewardVault.BadSeasonConfig.selector);
        vault.createSeason(4, address(points), until, start, 1, 1);
        vm.expectRevert(KlyntRewardVault.BadSeasonConfig.selector);
        vault.createSeason(4, address(points), start, until, 10, 11);
        vm.expectRevert(KlyntRewardVault.SeasonExists.selector);
        vault.createSeason(SEASON, address(points), start, until, 1, 1);
        vm.stopPrank();
    }

    function test_testPointsRefuseMainnet() public {
        vm.chainId(677);
        vm.expectRevert(KlyntTestPoints.MainnetNotAllowed.selector);
        new KlyntTestPoints(owner);
    }

    // ---------------------------------------------------------------- fuzz

    /// No sequence of signed claims ever pays a wallet past its cap or the pool past what was funded.
    function testFuzz_capsHold(uint96[6] memory amounts) public {
        uint256 paid;
        for (uint256 i; i < amounts.length; i++) {
            uint256 amt = bound(amounts[i], 1, 60e18);
            KlyntRewardVault.Claim memory c = _claim(amt, keccak256(abi.encode(i)));
            bytes memory sig = _sign(c, signerKey);
            vm.prank(player);
            try vault.claim(c, sig) {
                paid += amt;
            } catch {}
        }
        assertLe(vault.claimedBy(SEASON, player), CAP);
        assertEq(points.balanceOf(player), paid);
        assertEq(vault.remaining(SEASON), BUDGET - paid);
    }
}
