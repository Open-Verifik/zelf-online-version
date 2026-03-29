// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

/**
 * @title ZelfEthPay
 * @notice Accepts native ETH or USDC / USDT (ERC-20), forwards to a fixed treasury. Emits Paid for off-chain verification.
 * @dev Paid.amount is wei (18 decimals) for pay(), and stablecoin base units per token decimals for payUsdc / payUsdt.
 */
contract ZelfEthPay {
    address public immutable treasury;
    IERC20 public immutable usdc;
    IERC20 public immutable usdt;

    event Paid(bytes32 indexed paymentId, address indexed payer, uint256 amount, string tagFull);

    error ZeroValue();
    error ForwardFailed();
    error TransferFailed();

    constructor(address _treasury, address _usdc, address _usdt) {
        require(_treasury != address(0), "treasury");
        require(_usdc != address(0), "usdc");
        require(_usdt != address(0), "usdt");
        treasury = _treasury;
        usdc = IERC20(_usdc);
        usdt = IERC20(_usdt);
    }

    /**
     * @param paymentId Server-issued binding (keccak256 over session data), must match JWT smartContractETH.paymentId
     * @param tagFull Human-readable tag e.g. "name.zelf"
     */
    function pay(bytes32 paymentId, string calldata tagFull) external payable {
        if (msg.value == 0) revert ZeroValue();

        (bool ok, ) = treasury.call{value: msg.value}("");
        if (!ok) revert ForwardFailed();

        emit Paid(paymentId, msg.sender, msg.value, tagFull);
    }

    function payUsdc(bytes32 paymentId, string calldata tagFull, uint256 amount) external {
        if (amount == 0) revert ZeroValue();

        bool ok = usdc.transferFrom(msg.sender, treasury, amount);
        if (!ok) revert TransferFailed();

        emit Paid(paymentId, msg.sender, amount, tagFull);
    }

    function payUsdt(bytes32 paymentId, string calldata tagFull, uint256 amount) external {
        if (amount == 0) revert ZeroValue();

        bool ok = usdt.transferFrom(msg.sender, treasury, amount);
        if (!ok) revert TransferFailed();

        emit Paid(paymentId, msg.sender, amount, tagFull);
    }
}
