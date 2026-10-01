/**
 * Referral reward transfer whose outcome can always be decided from the chain.
 *
 * The generic reward sender (tags-token.module giveTokensAfterPurchase) first creates the
 * receiver's token account in its own transaction, without a priority fee, and then retries
 * the transfer by re-signing it with a fresh blockhash. On 2026-10-01 the account-creation
 * transaction for qa99.zelf (signature 5tbM4Nn…) never landed, the transfer was never sent,
 * and the claim stayed "processing" with nothing to reconcile it from (#515). Re-signing a
 * transfer that may still land is also how a reward gets paid twice.
 *
 * Here the idempotent account creation and the transfer travel in ONE transaction, signed
 * ONCE. Its signature and last valid block height go to the caller before the broadcast, so
 * the caller can store them first. A transaction that is not found once every block it could
 * land in is finalized never landed, which makes a stuck claim safe to release.
 */
const solanaWeb3 = require("@solana/web3.js");
const bs58 = require("bs58").default || require("bs58");
const config = require("../../../Core/config");
const spl = require("../../../Core/spl-token-manual");

const ZNS_DECIMALS = 8;
const PRIORITY_FEE_MICROLAMPORTS = 100000;
/** Keeps the whole claim request under nginx's 60 s proxy_read_timeout. */
const DEFAULT_CONFIRM_WAIT_MS = 30000;
const POLL_INTERVAL_MS = 2000;
/**
 * Status history is only trusted for recent transactions. Older stuck claims (about 16 h at
 * 400 ms per block) stay for manual reconciliation instead of being released automatically.
 */
const MAX_AUTO_RECONCILE_BLOCKS = 150000;

let connection;

const getConnection = () => {
	if (!connection) connection = new solanaWeb3.Connection(config.solana.rpcUrl, "confirmed");
	return connection;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Associated Token Program instruction 1 (CreateIdempotent): a no-op when the account exists. */
const createAssociatedTokenAccountIdempotentInstruction = (payer, associatedToken, owner, mint) => {
	const instruction = spl.createAssociatedTokenAccountInstruction(payer, associatedToken, owner, mint);
	instruction.data = Buffer.from([1]);
	return instruction;
};

/** Referral rewards are always expressed in whole ZNS (registration 10, purchase 10% of price). */
const toBaseUnits = (amount) => {
	const value = Math.round(Number(amount) * 10 ** ZNS_DECIMALS);
	if (!Number.isSafeInteger(value) || value <= 0) throw new Error("invalid_reward_amount");
	return value;
};

const isConfirmed = (status) => ["confirmed", "finalized"].includes(status?.confirmationStatus);

/**
 * Sends `amount` ZNS to `receiverSolanaAddress`.
 *
 * Throws only before anything is broadcast (bad input, rewards wallet without balance, RPC
 * down, or `onSigned` failing to persist the signature). After `onSigned` resolves it never
 * throws and returns one of:
 * - `{ state: "confirmed", signature, lastValidBlockHeight }`
 * - `{ state: "failed", ... }`: the transaction executed and failed, nothing was transferred
 * - `{ state: "pending", ... }`: the outcome is not known yet; decide it later with
 *   getRewardTransferOutcome
 */
const sendRewardTransfer = async (amount, receiverSolanaAddress, options = {}) => {
	const { onSigned, waitMs = DEFAULT_CONFIRM_WAIT_MS, pollIntervalMs = POLL_INTERVAL_MS } = options;
	const conn = getConnection();
	const sender = solanaWeb3.Keypair.fromSecretKey(Uint8Array.from(JSON.parse(config.solana.sender)));
	const mint = new solanaWeb3.PublicKey(config.solana.tokenMintAddress);
	const receiver = new solanaWeb3.PublicKey(receiverSolanaAddress);
	const amountToSend = toBaseUnits(amount);

	const senderTokenAccount = spl.getAssociatedTokenAddress(sender.publicKey, mint);
	const senderAccountInfo = await conn.getAccountInfo(senderTokenAccount);
	if (!senderAccountInfo) throw new Error("rewards_wallet_token_account_missing");
	if (Number(senderAccountInfo.data.readBigUInt64LE(64)) < amountToSend) throw new Error("rewards_wallet_insufficient_balance");

	const receiverTokenAccount = spl.getAssociatedTokenAddress(receiver, mint);
	const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash("confirmed");

	const transaction = new solanaWeb3.Transaction({ feePayer: sender.publicKey, blockhash, lastValidBlockHeight }).add(
		solanaWeb3.ComputeBudgetProgram.setComputeUnitPrice({ microLamports: PRIORITY_FEE_MICROLAMPORTS }),
		createAssociatedTokenAccountIdempotentInstruction(sender.publicKey, receiverTokenAccount, receiver, mint),
		spl.createTransferCheckedInstruction(senderTokenAccount, mint, receiverTokenAccount, sender.publicKey, amountToSend, ZNS_DECIMALS)
	);
	transaction.sign(sender);

	const rawTransaction = transaction.serialize();
	const signature = bs58.encode(transaction.signature);

	// From the broadcast on, this signature is the only way to learn what happened.
	if (onSigned) await onSigned({ signature, lastValidBlockHeight });

	try {
		await conn.sendRawTransaction(rawTransaction, { skipPreflight: false, preflightCommitment: "confirmed", maxRetries: 5 });
	} catch (error) {
		// The node may have forwarded it before failing to answer: unknown, not failed.
		return { state: "pending", signature, lastValidBlockHeight, error: error?.message || "send_failed" };
	}

	const deadline = Date.now() + waitMs;
	while (Date.now() < deadline) {
		await sleep(pollIntervalMs);
		let status;
		try {
			status = (await conn.getSignatureStatuses([signature]))?.value?.[0];
		} catch (error) {
			continue;
		}
		if (status?.err) return { state: "failed", signature, lastValidBlockHeight, error: JSON.stringify(status.err) };
		if (isConfirmed(status)) return { state: "confirmed", signature, lastValidBlockHeight };
	}

	return { state: "pending", signature, lastValidBlockHeight };
};

/**
 * Decides a transfer sent by sendRewardTransfer:
 * - "confirmed": it landed and succeeded
 * - "failed": it landed and failed (a failed transaction moves no tokens)
 * - "expired": it never landed and no longer can
 * - "pending": it may still land, or it is too old to decide automatically
 */
const getRewardTransferOutcome = async ({ signature, lastValidBlockHeight }) => {
	const conn = getConnection();
	// Read the height first: once every block it could land in is finalized, a lookup that
	// still finds nothing proves it never landed.
	const finalizedHeight = await conn.getBlockHeight("finalized");
	const status = (await conn.getSignatureStatuses([signature], { searchTransactionHistory: true }))?.value?.[0];

	if (status?.err) return { state: "failed", error: JSON.stringify(status.err) };
	if (isConfirmed(status)) return { state: "confirmed" };
	if (status) return { state: "pending" };

	const lastValid = Number(lastValidBlockHeight);
	if (!Number.isFinite(lastValid) || finalizedHeight <= lastValid) return { state: "pending" };
	if (finalizedHeight - lastValid > MAX_AUTO_RECONCILE_BLOCKS) return { state: "pending", reason: "too_old_to_reconcile" };
	return { state: "expired" };
};

module.exports = {
	sendRewardTransfer,
	getRewardTransferOutcome,
	toBaseUnits,
	createAssociatedTokenAccountIdempotentInstruction,
	MAX_AUTO_RECONCILE_BLOCKS,
};
