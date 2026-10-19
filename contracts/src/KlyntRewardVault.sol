// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/// @title Klynt reward vault
/// @notice Holds a funded pool of an approved ERC-20 per season and pays out claims signed by an
///         authorised attestor. It never mints. Each claim authorisation is bound to one wallet,
///         season, game, token, amount, nonce, expiry, chain and this contract, and works once.
/// @dev Trust assumption: the off-chain attestor decides who earned what. The contract enforces
///      budgets, caps, replay protection and pauses; it cannot judge whether a score was honest.
contract KlyntRewardVault is EIP712, Ownable2Step, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct Season {
        IERC20 token;
        uint64 startsAt;
        uint64 claimsUntil;
        bool exists;
        bool paused;
        uint128 budget; // most this season can ever pay out
        uint128 funded; // tokens actually received for this season
        uint128 claimed; // tokens paid out
        uint128 perWalletCap; // most one wallet can claim this season
    }

    struct Claim {
        address wallet;
        uint256 seasonId;
        bytes32 gameId;
        address token;
        uint256 amount;
        bytes32 nonce;
        uint64 expiry;
    }

    bytes32 public constant CLAIM_TYPEHASH = keccak256(
        "Claim(address wallet,uint256 seasonId,bytes32 gameId,address token,uint256 amount,bytes32 nonce,uint64 expiry)"
    );

    mapping(uint256 seasonId => Season) public seasons;
    mapping(uint256 seasonId => mapping(address wallet => uint256)) public claimedBy;
    mapping(bytes32 nonce => bool) public nonceUsed;
    mapping(address signer => bool) public isSigner;
    mapping(address token => bool) public tokenApproved;

    event TokenApproval(address indexed token, bool approved);
    event SignerSet(address indexed signer, bool active);
    event SeasonCreated(uint256 indexed seasonId, address indexed token, uint64 startsAt, uint64 claimsUntil, uint128 budget, uint128 perWalletCap);
    event SeasonPaused(uint256 indexed seasonId, bool paused);
    event SeasonFunded(uint256 indexed seasonId, address indexed from, uint256 amount, uint256 funded);
    event Claimed(uint256 indexed seasonId, address indexed wallet, bytes32 indexed gameId, address token, uint256 amount, bytes32 nonce);
    event UnclaimedWithdrawn(uint256 indexed seasonId, address indexed to, uint256 amount);

    error ZeroAddress();
    error TokenNotApproved();
    error SeasonExists();
    error NoSuchSeason();
    error BadSeasonConfig();
    error SeasonIsPaused();
    error OutsideClaimWindow();
    error NotYourClaim();
    error WrongToken();
    error ClaimExpired();
    error NonceAlreadyUsed();
    error BadSignature();
    error ZeroAmount();
    error PoolExhausted();
    error WalletCapReached();
    error OverBudget();
    error UnsupportedToken();
    error ClaimsStillOpen();
    error RenounceDisabled();

    constructor(address owner_) EIP712("Klynt Reward Vault", "1") Ownable(owner_) {}

    // ---------------------------------------------------------------- admin

    function setTokenApproved(address token, bool approved) external onlyOwner {
        if (token == address(0)) revert ZeroAddress();
        tokenApproved[token] = approved;
        emit TokenApproval(token, approved);
    }

    /// @notice Adds, rotates or revokes an attestor key. Revoking takes effect for every unspent claim it signed.
    function setSigner(address signer, bool active) external onlyOwner {
        if (signer == address(0)) revert ZeroAddress();
        isSigner[signer] = active;
        emit SignerSet(signer, active);
    }

    function createSeason(
        uint256 seasonId,
        address token,
        uint64 startsAt,
        uint64 claimsUntil,
        uint128 budget,
        uint128 perWalletCap
    ) external onlyOwner {
        if (seasons[seasonId].exists) revert SeasonExists();
        if (!tokenApproved[token]) revert TokenNotApproved();
        if (claimsUntil <= startsAt || budget == 0 || perWalletCap == 0 || perWalletCap > budget) revert BadSeasonConfig();
        seasons[seasonId] = Season({
            token: IERC20(token),
            startsAt: startsAt,
            claimsUntil: claimsUntil,
            exists: true,
            paused: false,
            budget: budget,
            funded: 0,
            claimed: 0,
            perWalletCap: perWalletCap
        });
        emit SeasonCreated(seasonId, token, startsAt, claimsUntil, budget, perWalletCap);
    }

    /// @notice Moves tokens into the season's pool. Rejects tokens that deliver less than sent.
    function fund(uint256 seasonId, uint256 amount) external onlyOwner nonReentrant {
        Season storage s = seasons[seasonId];
        if (!s.exists) revert NoSuchSeason();
        if (amount == 0) revert ZeroAmount();
        if (uint256(s.funded) + amount > s.budget) revert OverBudget();
        uint256 before = s.token.balanceOf(address(this));
        s.token.safeTransferFrom(msg.sender, address(this), amount);
        if (s.token.balanceOf(address(this)) - before != amount) revert UnsupportedToken();
        s.funded += uint128(amount);
        emit SeasonFunded(seasonId, msg.sender, amount, s.funded);
    }

    /// @notice Stops new claims for one season. Claims already paid are unaffected.
    function setSeasonPaused(uint256 seasonId, bool paused_) external onlyOwner {
        if (!seasons[seasonId].exists) revert NoSuchSeason();
        seasons[seasonId].paused = paused_;
        emit SeasonPaused(seasonId, paused_);
    }

    /// @notice Stops every claim in every season.
    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    /// @notice Returns what was never claimed, once the season's claim window has closed.
    function withdrawUnclaimed(uint256 seasonId, address to) external onlyOwner nonReentrant {
        Season storage s = seasons[seasonId];
        if (!s.exists) revert NoSuchSeason();
        if (to == address(0)) revert ZeroAddress();
        if (block.timestamp <= s.claimsUntil) revert ClaimsStillOpen();
        uint256 amount = s.funded - s.claimed;
        if (amount == 0) revert ZeroAmount();
        s.funded = s.claimed;
        s.token.safeTransfer(to, amount);
        emit UnclaimedWithdrawn(seasonId, to, amount);
    }

    function renounceOwnership() public pure override {
        revert RenounceDisabled();
    }

    // ---------------------------------------------------------------- claims

    function hashClaim(Claim calldata c) public view returns (bytes32) {
        return _hashTypedDataV4(
            keccak256(abi.encode(CLAIM_TYPEHASH, c.wallet, c.seasonId, c.gameId, c.token, c.amount, c.nonce, c.expiry))
        );
    }

    /// @notice Pays a signed claim to its wallet. Only that wallet can submit it.
    function claim(Claim calldata c, bytes calldata signature) external nonReentrant whenNotPaused {
        Season storage s = seasons[c.seasonId];
        // Checks
        if (!s.exists) revert NoSuchSeason();
        if (s.paused) revert SeasonIsPaused();
        if (block.timestamp < s.startsAt || block.timestamp > s.claimsUntil) revert OutsideClaimWindow();
        if (msg.sender != c.wallet) revert NotYourClaim();
        if (c.token != address(s.token)) revert WrongToken();
        if (block.timestamp > c.expiry) revert ClaimExpired();
        if (c.amount == 0) revert ZeroAmount();
        if (nonceUsed[c.nonce]) revert NonceAlreadyUsed();
        (address signer, ECDSA.RecoverError err,) = ECDSA.tryRecover(hashClaim(c), signature);
        if (err != ECDSA.RecoverError.NoError || !isSigner[signer]) revert BadSignature();
        if (uint256(s.claimed) + c.amount > s.funded) revert PoolExhausted();
        if (claimedBy[c.seasonId][c.wallet] + c.amount > s.perWalletCap) revert WalletCapReached();

        // Effects
        nonceUsed[c.nonce] = true;
        s.claimed += uint128(c.amount);
        claimedBy[c.seasonId][c.wallet] += c.amount;

        // Interaction
        s.token.safeTransfer(c.wallet, c.amount);
        emit Claimed(c.seasonId, c.wallet, c.gameId, c.token, c.amount, c.nonce);
    }

    /// @notice Tokens a season can still pay out.
    function remaining(uint256 seasonId) external view returns (uint256) {
        Season storage s = seasons[seasonId];
        return s.funded - s.claimed;
    }
}
