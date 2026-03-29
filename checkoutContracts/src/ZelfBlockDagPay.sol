// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ZelfBlockDagPay
 * @notice Accepts native BDAG only; forwards to a fixed treasury. Emits Paid for off-chain verification.
 * @dev BlockDAG tag checkout stays native-only until USDC/USDT are available on chain.
 */
contract ZelfBlockDagPay {
    address public immutable treasury;

    event Paid(bytes32 indexed paymentId, address indexed payer, uint256 amount, string tagFull);

    error ZeroValue();
    error ForwardFailed();

    constructor(address _treasury) {
        require(_treasury != address(0), "treasury");
        treasury = _treasury;
    }

    /**
     * @param paymentId Server-issued binding (keccak256 over session data), must match JWT smartContractBDAG.paymentId
     * @param tagFull Human-readable tag e.g. "name.zelf"
     */
    function pay(bytes32 paymentId, string calldata tagFull) external payable {
        if (msg.value == 0) revert ZeroValue();

        (bool ok, ) = treasury.call{value: msg.value}("");
        if (!ok) revert ForwardFailed();

        emit Paid(paymentId, msg.sender, msg.value, tagFull);
    }
}
