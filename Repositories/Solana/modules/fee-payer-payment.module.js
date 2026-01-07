const { Connection, PublicKey, Transaction, Keypair } = require("@solana/web3.js");
const { getAssociatedTokenAddress, createTransferInstruction } = require("@solana/spl-token");
const bs58Middleware = require("bs58");
const bs58 = bs58Middleware.default || bs58Middleware;
const axios = require("axios");
const config = require("../../../Core/config");
const zelfProofModule = require("../../ZelfProof/modules/zelf-proof.module");
const IPFSModule = require("../../IPFS/modules/ipfs.module");
const { createSolanaWallet } = require("../../Wallet/modules/solana");

/**
 * Solana Payment Service - Fee Payer Pattern with Biometric Verification
 * User authenticates with face + password, backend signs and pays gas
 */

const SOLANA_RPC = process.env.SOLANA_RPC_URL || process.env.SOLANA_RPC_ENDPOINT || "https://api.mainnet-beta.solana.com";
const ZNS_TOKEN_MINT = "GfF6PSkH8bKLkws5RMFdzgASwcVbgCfhhKfp8zeoFBkx";
const SENDER_KEY = process.env.SENDER_KEY;

/**
 * Create and submit payment transaction with biometric verification
 * All in one - verify user, decrypt wallet, sign, and submit
 */
const createAndSubmitPayment = async (payload, authUser) => {
	const { amount, faceBase64, masterPassword } = payload;

	if (!amount || !faceBase64) {
		throw new Error("400:missing_required_fields:amount and faceBase64 are required");
	}

	// Validate amount
	const paymentAmount = parseFloat(amount);
	if (isNaN(paymentAmount) || paymentAmount <= 0) {
		throw new Error("400:invalid_amount:Amount must be a positive number");
	}

	// Get user's zelfAccount from IPFS
	const emailRecord = await IPFSModule.get({ key: "accountEmail", value: authUser.email });
	if (!emailRecord || emailRecord.length === 0) {
		throw new Error("404:account_not_found");
	}

	const zelfAccount = emailRecord[0];
	const accountJSON = await axios.get(zelfAccount.url);

	if (!accountJSON.data?.zelfProof) {
		throw new Error("409:account_doesnt_contain_zelf_proof");
	}

	// Decrypt zelfProof to get mnemonic (biometric verification)
	const decryptedZelfAccount = await zelfProofModule.decrypt({
		zelfProof: accountJSON.data.zelfProof,
		faceBase64,
		verifierKey: config.zelfEncrypt.serverKey,
		password: masterPassword || undefined,
	});

	if (!decryptedZelfAccount) {
		throw new Error("401:biometric_verification_failed");
	}

	// Get mnemonic from decrypted data
	const mnemonic = decryptedZelfAccount.metadata.mnemonic;
	if (!mnemonic) {
		throw new Error("500:mnemonic_not_found");
	}

	// Create Solana wallet from mnemonic
	const userSolanaWallet = await createSolanaWallet(mnemonic);
	const userKeypair = Keypair.fromSecretKey(bs58.decode(userSolanaWallet.secretKey));

	// Initialize Solana connection
	const connection = new Connection(SOLANA_RPC, "confirmed");

	// Service wallet (fee payer)
	// Service wallet (fee payer)
	const serviceWallet = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(SENDER_KEY)));

	// ZNS token mint
	const mintPublicKey = new PublicKey(ZNS_TOKEN_MINT);

	// Get token accounts
	const userTokenAccount = await getAssociatedTokenAddress(mintPublicKey, userKeypair.publicKey);
	const serviceTokenAccount = await getAssociatedTokenAddress(mintPublicKey, serviceWallet.publicKey);

	// Convert amount to smallest unit (9 decimals for ZNS)
	const amountInSmallestUnit = Math.floor(paymentAmount * 1_000_000_000);

	// Create transfer instruction
	const transferInstruction = createTransferInstruction(
		userTokenAccount, // Source (user's token account)
		serviceTokenAccount, // Destination (service's token account)
		userKeypair.publicKey, // Owner of source account (user)
		amountInSmallestUnit // Amount
	);

	// Create transaction
	const transaction = new Transaction().add(transferInstruction);

	// Set service wallet as fee payer (WE pay the gas!)
	transaction.feePayer = serviceWallet.publicKey;

	// Get recent blockhash
	const { blockhash } = await connection.getLatestBlockhash();
	transaction.recentBlockhash = blockhash;

	// Sign transaction with BOTH wallets
	transaction.partialSign(userKeypair); // User signs the transfer
	transaction.partialSign(serviceWallet); // Service signs to pay fees

	// Submit transaction
	let signature;

	try {
		signature = await connection.sendRawTransaction(transaction.serialize(), {
			skipPreflight: false,
			preflightCommitment: "confirmed",
		});
	} catch (error) {
		console.error("Solana Transaction Error:", error);
		const logs = error.logs || [];
		if (logs.some((log) => log.includes("insufficient funds") || log.includes("0x1"))) {
			throw new Error("400:insufficient_funds:Your wallet does not have enough ZNS tokens.");
		}
		throw error;
	}

	// Wait for confirmation
	// Wait for confirmation (OPTIONAL: Removing this speeds up response significantly)
	// const confirmation = await connection.confirmTransaction(signature, "confirmed");

	// if (confirmation.value.err) {
	// 	throw new Error("400:transaction_failed:Transaction was rejected by the network");
	// }

	return {
		success: true,
		transactionHash: signature,
		amount: paymentAmount,
		token: "ZNS",
		chain: "solana",
		from: userKeypair.publicKey.toString(),
		to: serviceWallet.publicKey.toString(),
		message: "Payment successful! Use this transaction hash for your API request.",
		explorerUrl: `https://solscan.io/tx/${signature}`,
	};
};

/**
 * Get service wallet address for payments
 */
const getServiceWallet = async () => {
	const serviceWallet = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(SENDER_KEY)));

	return {
		success: true,
		serviceWallet: serviceWallet.publicKey.toString(),
		token: "ZNS",
		tokenMint: ZNS_TOKEN_MINT,
		chain: "solana",
	};
};

module.exports = {
	createAndSubmitPayment,
	getServiceWallet,
};
