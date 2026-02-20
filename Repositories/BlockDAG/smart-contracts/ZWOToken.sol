// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title ZWO Token
 * @dev ERC20 token for Zelf Web3 Organization
 * Multi-chain native token with anti-whale mechanisms
 */
contract ZWOToken is ERC20, ERC20Burnable, ERC20Permit, Ownable, Pausable {
    // Constants
    uint256 public constant TOTAL_SUPPLY = 1_000_000_000 * 10**18; // 1B tokens
    uint256 public constant TRANSFER_FEE_PERCENT = 1; // 0.1% transfer fee
    uint256 public constant MAX_WALLET_PERCENT_INITIAL = 10; // 1% of supply initially

    // State variables
    mapping(address => bool) public isExcludedFromFee;
    mapping(address => bool) public isExcludedFromMaxWallet;
    mapping(address => bool) public isBlacklisted;

    address public ecosystemWallet;
    uint256 public maxWalletPercent = MAX_WALLET_PERCENT_INITIAL;

    // Events
    event EcosystemFeeCollected(address indexed from, uint256 amount);
    event MaxWalletPercentUpdated(uint256 oldPercent, uint256 newPercent);
    event EcosystemWalletUpdated(address oldWallet, address newWallet);
    event AddressExcludedFromFee(address indexed account, bool excluded);
    event AddressExcludedFromMaxWallet(address indexed account, bool excluded);
    event AddressBlacklisted(address indexed account, bool blacklisted);

    // Modifiers
    modifier notBlacklisted(address account) {
        require(!isBlacklisted[account], "ZWOToken: Account is blacklisted");
        _;
    }

    modifier validAddress(address account) {
        require(account != address(0), "ZWOToken: Invalid address");
        _;
    }

    /**
     * @dev Constructor
     */
    constructor(address initialOwner)
        ERC20("Zelf Web3 Organization", "ZWO")
        ERC20Permit("Zelf Web3 Organization")
        Ownable(initialOwner)
    {
        require(initialOwner != address(0), "ZWOToken: Invalid owner address");

        // Mint total supply to owner
        _mint(initialOwner, TOTAL_SUPPLY);

        // Exclude owner and contract from fees initially
        isExcludedFromFee[initialOwner] = true;
        isExcludedFromFee[address(this)] = true;
        isExcludedFromMaxWallet[initialOwner] = true;
    }

    /**
     * @dev Set ecosystem wallet for fee collection
     */
    function setEcosystemWallet(address _ecosystemWallet)
        external
        onlyOwner
        validAddress(_ecosystemWallet)
    {
        address oldWallet = ecosystemWallet;
        ecosystemWallet = _ecosystemWallet;
        emit EcosystemWalletUpdated(oldWallet, _ecosystemWallet);
    }

    /**
     * @dev Update max wallet percentage (in basis points, 1000 = 10%)
     */
    function setMaxWalletPercent(uint256 _maxWalletPercent) external onlyOwner {
        require(_maxWalletPercent >= 100, "ZWOToken: Min 1% max wallet"); // Min 1%
        require(_maxWalletPercent <= 10000, "ZWOToken: Max 100% max wallet"); // Max 100%

        uint256 oldPercent = maxWalletPercent;
        maxWalletPercent = _maxWalletPercent;
        emit MaxWalletPercentUpdated(oldPercent, _maxWalletPercent);
    }

    /**
     * @dev Exclude/include address from transfer fees
     */
    function setExcludedFromFee(address account, bool excluded) external onlyOwner {
        isExcludedFromFee[account] = excluded;
        emit AddressExcludedFromFee(account, excluded);
    }

    /**
     * @dev Exclude/include address from max wallet limit
     */
    function setExcludedFromMaxWallet(address account, bool excluded) external onlyOwner {
        isExcludedFromMaxWallet[account] = excluded;
        emit AddressExcludedFromMaxWallet(account, excluded);
    }

    /**
     * @dev Blacklist/unblacklist address
     */
    function setBlacklisted(address account, bool blacklisted) external onlyOwner {
        isBlacklisted[account] = blacklisted;
        emit AddressBlacklisted(account, blacklisted);
    }

    /**
     * @dev Batch blacklist addresses
     */
    function batchBlacklist(address[] calldata accounts, bool blacklisted) external onlyOwner {
        for (uint256 i = 0; i < accounts.length; i++) {
            isBlacklisted[accounts[i]] = blacklisted;
            emit AddressBlacklisted(accounts[i], blacklisted);
        }
    }

    /**
     * @dev Pause/unpause token transfers
     */
    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @dev Override transfer function with fees and restrictions
     */
    function _transfer(
        address sender,
        address recipient,
        uint256 amount
    ) internal override notBlacklisted(sender) notBlacklisted(recipient) whenNotPaused {
        require(amount > 0, "ZWOToken: Transfer amount must be greater than zero");

        // Max wallet check (skip for excluded addresses)
        if (!isExcludedFromMaxWallet[recipient]) {
            uint256 maxWalletAmount = (TOTAL_SUPPLY * maxWalletPercent) / 10000;
            require(
                balanceOf(recipient) + amount <= maxWalletAmount,
                "ZWOToken: Transfer exceeds max wallet limit"
            );
        }

        // Fee calculation (skip for excluded addresses)
        uint256 fee = 0;
        if (!isExcludedFromFee[sender] && !isExcludedFromFee[recipient]) {
            fee = (amount * TRANSFER_FEE_PERCENT) / 1000; // 0.1%
        }

        uint256 transferAmount = amount - fee;

        // Execute transfers
        super._transfer(sender, recipient, transferAmount);

        // Send fee to ecosystem wallet if applicable
        if (fee > 0 && ecosystemWallet != address(0)) {
            super._transfer(sender, ecosystemWallet, fee);
            emit EcosystemFeeCollected(sender, fee);
        }
    }

    /**
     * @dev Override mint function to respect max wallet limits
     */
    function _mint(address account, uint256 amount) internal override notBlacklisted(account) {
        if (!isExcludedFromMaxWallet[account]) {
            uint256 maxWalletAmount = (TOTAL_SUPPLY * maxWalletPercent) / 10000;
            require(
                balanceOf(account) + amount <= maxWalletAmount,
                "ZWOToken: Mint exceeds max wallet limit"
            );
        }
        super._mint(account, amount);
    }

    /**
     * @dev Get max wallet amount for current settings
     */
    function getMaxWalletAmount() external view returns (uint256) {
        return (TOTAL_SUPPLY * maxWalletPercent) / 10000;
    }

    /**
     * @dev Get transfer fee for amount
     */
    function getTransferFee(uint256 amount) external view returns (uint256) {
        return (amount * TRANSFER_FEE_PERCENT) / 1000;
    }

    /**
     * @dev Check if transfer would exceed limits
     */
    function checkTransferLimits(address sender, address recipient, uint256 amount)
        external
        view
        returns (bool canTransfer, string memory reason)
    {
        if (paused()) {
            return (false, "Token transfers are paused");
        }

        if (isBlacklisted[sender]) {
            return (false, "Sender is blacklisted");
        }

        if (isBlacklisted[recipient]) {
            return (false, "Recipient is blacklisted");
        }

        if (amount == 0) {
            return (false, "Transfer amount must be greater than zero");
        }

        if (!isExcludedFromMaxWallet[recipient]) {
            uint256 maxWalletAmount = (TOTAL_SUPPLY * maxWalletPercent) / 10000;
            if (balanceOf(recipient) + amount > maxWalletAmount) {
                return (false, "Transfer exceeds max wallet limit");
            }
        }

        return (true, "");
    }
}