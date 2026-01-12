const { ethers } = require("ethers");
const config = require("../../../Core/config");

/**
 * Base Payment Verification Module
 * Verifies ZNS token payments on Base (Coinbase L2)
 *
 * ZNS Token Address: TBD - Update when deployed to Base
 */

// Base configuration
const BASE_CONFIG = {
	rpcEndpoint: process.env.BASE_RPC_ENDPOINT || "https://mainnet.base.org",
	znsTokenAddress: process.env.BASE_ZNS_TOKEN || "0x...", // TODO: Add ZNS token address on Base
	serviceWallet: process.env.BASE_SERVICE_WALLET || "", // Your service wallet address
	confirmations: 2, // Number of confirmations required (Base is fast!)
	chainId: 8453, // Base mainnet
};

// Initialize provider
const provider = new ethers.JsonRpcProvider(BASE_CONFIG.rpcEndpoint);

// ERC20 ABI for token transfers
const ERC20_ABI = [
	"function balanceOf(address owner) view returns (uint256)",
	"function decimals() view returns (uint8)",
	"function symbol() view returns (string)",
	"function transfer(address to, uint amount) returns (bool)",
	"event Transfer(address indexed from, address indexed to, uint amount)",
];

/**
 * Verify a payment transaction on Base
 * @param {Object} params - Payment verification parameters
 * @param {string} params.txHash - Transaction hash
 * @param {number} params.expectedAmount - Expected payment amount in ZNS tokens
 * @param {string} params.proof - Payment proof (optional additional verification)
 * @param {string} params.userWallet - User's wallet address
 * @returns {Object} Verification result
 */
const verifyPayment = async ({ txHash, expectedAmount, proof, userWallet }) => {
	try {
		// Validate inputs
		if (!txHash) {
			return {
				valid: false,
				reason: "Transaction hash is required",
			};
		}

		if (!expectedAmount || expectedAmount <= 0) {
			return {
				valid: false,
				reason: "Invalid expected amount",
			};
		}

		// Fetch transaction receipt
		const receipt = await provider.getTransactionReceipt(txHash);

		if (!receipt) {
			return {
				valid: false,
				reason: "Transaction not found on Base blockchain",
				details: {
					txHash,
					chain: "base",
				},
			};
		}

		// Check transaction status
		if (receipt.status !== 1) {
			return {
				valid: false,
				reason: "Transaction failed on blockchain",
				details: {
					status: receipt.status,
				},
			};
		}

		// Verify confirmations
		const currentBlock = await provider.getBlockNumber();
		const confirmations = currentBlock - receipt.blockNumber;

		if (confirmations < BASE_CONFIG.confirmations) {
			return {
				valid: false,
				reason: `Insufficient confirmations (${confirmations}/${BASE_CONFIG.confirmations})`,
				details: {
					currentConfirmations: confirmations,
					requiredConfirmations: BASE_CONFIG.confirmations,
				},
			};
		}

		// Create contract interface to parse logs
		const tokenContract = new ethers.Contract(BASE_CONFIG.znsTokenAddress, ERC20_ABI, provider);

		// Find Transfer event in logs
		const transferEvent = receipt.logs
			.map((log) => {
				try {
					return tokenContract.interface.parseLog(log);
				} catch {
					return null;
				}
			})
			.find((event) => event && event.name === "Transfer");

		if (!transferEvent) {
			return {
				valid: false,
				reason: "No token transfer found in transaction",
			};
		}

		// Extract transfer details
		const from = transferEvent.args.from;
		const to = transferEvent.args.to;
		const amount = transferEvent.args.amount;

		// Get token decimals
		const decimals = await tokenContract.decimals();
		const actualAmount = parseFloat(ethers.formatUnits(amount, decimals));

		// Verify recipient is the service wallet
		if (to.toLowerCase() !== BASE_CONFIG.serviceWallet.toLowerCase()) {
			return {
				valid: false,
				reason: "Payment was not sent to the service wallet",
				details: {
					expectedRecipient: BASE_CONFIG.serviceWallet,
					actualRecipient: to,
				},
			};
		}

		// Verify sender matches user wallet (if provided)
		if (userWallet && from.toLowerCase() !== userWallet.toLowerCase()) {
			return {
				valid: false,
				reason: "Payment source does not match user wallet",
				details: {
					expectedSender: userWallet,
					actualSender: from,
				},
			};
		}

		// Verify amount
		if (actualAmount < expectedAmount) {
			return {
				valid: false,
				reason: "Insufficient payment amount",
				details: {
					expectedAmount,
					actualAmount,
					shortfall: expectedAmount - actualAmount,
				},
			};
		}

		// Get transaction timestamp
		const block = await provider.getBlock(receipt.blockNumber);

		// All checks passed!

		return {
			valid: true,
			details: {
				txHash,
				chain: "base",
				amount: actualAmount,
				token: "ZNS",
				from,
				to,
				confirmations,
				timestamp: block.timestamp,
				blockNumber: receipt.blockNumber,
			},
		};
	} catch (error) {
		console.error("Base payment verification error:", error);
		return {
			valid: false,
			reason: "Error verifying payment",
			details: {
				error: error.message,
			},
		};
	}
};

/**
 * Get ZNS token balance for a wallet on Base
 * @param {string} walletAddress - Wallet address to check
 * @returns {number} Token balance
 */
const getZNSBalance = async (walletAddress) => {
	try {
		const tokenContract = new ethers.Contract(BASE_CONFIG.znsTokenAddress, ERC20_ABI, provider);

		const balance = await tokenContract.balanceOf(walletAddress);
		const decimals = await tokenContract.decimals();

		return parseFloat(ethers.formatUnits(balance, decimals));
	} catch (error) {
		console.error("Error getting ZNS balance on Base:", error);
		return 0;
	}
};

/**
 * Generate payment instructions for users
 * @param {number} amount - Amount of ZNS tokens required
 * @returns {Object} Payment instructions
 */
const getPaymentInstructions = (amount) => {
	return {
		chain: "base",
		token: "ZNS",
		tokenAddress: BASE_CONFIG.znsTokenAddress,
		amount,
		recipient: BASE_CONFIG.serviceWallet,
		instructions: [
			"1. Open your Base-compatible wallet (MetaMask, Coinbase Wallet, etc.)",
			"2. Make sure you're connected to Base network",
			`3. Send ${amount} ZNS tokens to: ${BASE_CONFIG.serviceWallet}`,
			"4. Wait for transaction confirmation (2 blocks)",
			"5. Copy the transaction hash",
			"6. Include the hash in the 'x-payment-tx' header",
			"7. Include 'base' in the 'x-payment-chain' header",
			"8. Retry your API request",
		],
		estimatedConfirmationTime: "~4 seconds (2 blocks)",
		networkInfo: {
			chainId: BASE_CONFIG.chainId,
			rpcUrl: BASE_CONFIG.rpcEndpoint,
			name: "Base",
			nativeCurrency: {
				name: "Ethereum",
				symbol: "ETH",
				decimals: 18,
			},
		},
	};
};

module.exports = {
	verifyPayment,
	getZNSBalance,
	getPaymentInstructions,
	BASE_CONFIG,
};
