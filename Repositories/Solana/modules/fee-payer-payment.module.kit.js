/**
 * Option A: Fee Payer Payment - @solana-program/token + @solana/kit (0 vulnerabilities)
 * Test via SOLANA_USE_KIT=true. For now uses same manual SPL as Option B.
 */
const { Connection, PublicKey, Transaction, Keypair } = require("@solana/web3.js");
const splManual = require("../../../Core/spl-token-manual");
const bs58Middleware = require("bs58");
const bs58 = bs58Middleware.default || bs58Middleware;
const axios = require("axios");
const config = require("../../../Core/config");
const zelfProofModule = require("../../ZelfProof/modules/zelf-proof.module");
const IPFSModule = require("../../IPFS/modules/ipfs.module");
const { createSolanaWallet } = require("../../Wallet/modules/solana");

const SOLANA_RPC = process.env.SOLANA_RPC_URL || process.env.SOLANA_RPC_ENDPOINT || "https://api.mainnet-beta.solana.com";
const ZNS_TOKEN_MINT = "GfF6PSkH8bKLkws5RMFdzgASwcVbgCfhhKfp8zeoFBkx";
const SENDER_KEY = process.env.SENDER_KEY;

const createAndSubmitPayment = async (payload, authUser) => {
	const { amount, faceBase64, masterPassword } = payload;

	if (!amount || !faceBase64) {
		throw new Error("400:missing_required_fields:amount and faceBase64 are required");
	}

	const paymentAmount = parseFloat(amount);
	if (isNaN(paymentAmount) || paymentAmount <= 0) {
		throw new Error("400:invalid_amount:Amount must be a positive number");
	}

	const emailRecord = await IPFSModule.get({ key: "accountEmail", value: authUser.email });
	if (!emailRecord || emailRecord.length === 0) {
		throw new Error("404:account_not_found");
	}

	const zelfAccount = emailRecord[0];
	const accountJSON = await axios.get(zelfAccount.url);

	if (!accountJSON.data?.zelfProof) {
		throw new Error("409:account_doesnt_contain_zelf_proof");
	}

	const decryptedZelfAccount = await zelfProofModule.decrypt({
		zelfProof: accountJSON.data.zelfProof,
		faceBase64,
		verifierKey: config.zelfEncrypt.serverKey,
		password: masterPassword || undefined,
	});

	if (!decryptedZelfAccount) {
		throw new Error("401:biometric_verification_failed");
	}

	const mnemonic = decryptedZelfAccount.metadata.mnemonic;
	if (!mnemonic) {
		throw new Error("500:mnemonic_not_found");
	}

	const userSolanaWallet = await createSolanaWallet(mnemonic);
	const userKeypair = Keypair.fromSecretKey(bs58.decode(userSolanaWallet.secretKey));

	const connection = new Connection(SOLANA_RPC, "confirmed");

	const serviceWallet = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(SENDER_KEY)));

	const mintPublicKey = new PublicKey(ZNS_TOKEN_MINT);

	const userTokenAccount = splManual.getAssociatedTokenAddress(userKeypair.publicKey, mintPublicKey);
	const serviceTokenAccount = splManual.getAssociatedTokenAddress(serviceWallet.publicKey, mintPublicKey);

	const amountInSmallestUnit = Math.floor(paymentAmount * 1_000_000_000);

	const transferInstruction = splManual.createTransferInstruction(
		userTokenAccount,
		serviceTokenAccount,
		userKeypair.publicKey,
		amountInSmallestUnit
	);

	const transaction = new Transaction().add(transferInstruction);

	transaction.feePayer = serviceWallet.publicKey;

	const { blockhash } = await connection.getLatestBlockhash();
	transaction.recentBlockhash = blockhash;

	transaction.partialSign(userKeypair);
	transaction.partialSign(serviceWallet);

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
