/**
 * Manual SPL Token instruction builder - no @solana/spl-token dependency.
 * Avoids bigint-buffer vulnerability. Uses only @solana/web3.js.
 *
 * SPL Token Program: TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA
 * Associated Token Program: ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL
 */
const { PublicKey, TransactionInstruction } = require("@solana/web3.js");

const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");
const SYSTEM_PROGRAM_ID = new PublicKey("11111111111111111111111111111111");
const SYSVAR_RENT_ID = new PublicKey("SysvarRent111111111111111111111111111111111");

/**
 * Derive associated token account address for owner + mint
 * @param {PublicKey} owner - Wallet owner
 * @param {PublicKey} mint - Token mint
 * @returns {PublicKey}
 */
function getAssociatedTokenAddress(owner, mint) {
	const [address] = PublicKey.findProgramAddressSync(
		[owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
		ASSOCIATED_TOKEN_PROGRAM_ID
	);
	return address;
}

/**
 * Create Transfer instruction (discriminator 3) - legacy, no decimals
 * @param {PublicKey} source - Source token account
 * @param {PublicKey} destination - Destination token account
 * @param {PublicKey} owner - Owner of source account
 * @param {number} amount - Amount in smallest unit
 * @returns {TransactionInstruction}
 */
function createTransferInstruction(source, destination, owner, amount) {
	const data = Buffer.alloc(9);
	data.writeUInt8(3, 0); // Transfer discriminator
	data.writeBigUInt64LE(BigInt(amount), 1);

	return new TransactionInstruction({
		keys: [
			{ pubkey: source, isSigner: false, isWritable: true },
			{ pubkey: destination, isSigner: false, isWritable: true },
			{ pubkey: owner, isSigner: true, isWritable: false },
		],
		programId: TOKEN_PROGRAM_ID,
		data,
	});
}

/**
 * Create TransferChecked instruction (discriminator 12)
 * Data: [12, amount(8 bytes LE), decimals(1 byte)]
 * @param {PublicKey} source - Source token account
 * @param {PublicKey} mint - Token mint
 * @param {PublicKey} destination - Destination token account
 * @param {PublicKey} owner - Owner of source account
 * @param {number} amount - Amount in smallest unit
 * @param {number} decimals - Token decimals
 * @returns {TransactionInstruction}
 */
function createTransferCheckedInstruction(source, mint, destination, owner, amount, decimals) {
	const data = Buffer.alloc(10);
	data.writeUInt8(12, 0); // TransferChecked discriminator
	data.writeBigUInt64LE(BigInt(amount), 1); // Amount as u64 LE
	data.writeUInt8(decimals, 9);

	return new TransactionInstruction({
		keys: [
			{ pubkey: source, isSigner: false, isWritable: true },
			{ pubkey: mint, isSigner: false, isWritable: false },
			{ pubkey: destination, isSigner: false, isWritable: true },
			{ pubkey: owner, isSigner: true, isWritable: false },
		],
		programId: TOKEN_PROGRAM_ID,
		data,
	});
}

/**
 * Create Associated Token Account instruction
 * Accounts: payer, ata, owner, mint, system, token, rent
 * Instruction data: empty (Create instruction)
 * @param {PublicKey} payer - Payer for account creation
 * @param {PublicKey} associatedToken - ATA address to create
 * @param {PublicKey} owner - Owner of the new ATA
 * @param {PublicKey} mint - Token mint
 * @returns {TransactionInstruction}
 */
function createAssociatedTokenAccountInstruction(payer, associatedToken, owner, mint) {
	return new TransactionInstruction({
		keys: [
			{ pubkey: payer, isSigner: true, isWritable: true },
			{ pubkey: associatedToken, isSigner: false, isWritable: true },
			{ pubkey: owner, isSigner: false, isWritable: false },
			{ pubkey: mint, isSigner: false, isWritable: false },
			{ pubkey: SYSTEM_PROGRAM_ID, isSigner: false, isWritable: false },
			{ pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
			{ pubkey: SYSVAR_RENT_ID, isSigner: false, isWritable: false },
		],
		programId: ASSOCIATED_TOKEN_PROGRAM_ID,
		data: Buffer.alloc(0),
	});
}

/**
 * Get or create associated token account. Returns { address, amount }.
 * If account doesn't exist, creates it and returns amount 0.
 * @param {import("@solana/web3.js").Connection} connection
 * @param {import("@solana/web3.js").Keypair} payer - Payer for creation if needed
 * @param {PublicKey} mint - Token mint
 * @param {PublicKey} owner - Owner of the ATA
 * @returns {Promise<{ address: PublicKey, amount: number }>}
 */
async function getOrCreateAssociatedTokenAccount(connection, payer, mint, owner) {
	const address = getAssociatedTokenAddress(owner, mint);
	const accountInfo = await connection.getAccountInfo(address);

	if (accountInfo) {
		// Parse token account (amount at offset 64, 8 bytes LE)
		const amount = accountInfo.data.readBigUInt64LE(64);
		return { address, amount: Number(amount) };
	}

	// Create the account (HTTP-only confirmation to avoid WebSocket signatureSubscribe storms)
	const createIx = createAssociatedTokenAccountInstruction(payer.publicKey, address, owner, mint);
	const { Transaction } = require("@solana/web3.js");
	const { sendAndConfirmViaPolling } = require("./solana-tx");
	const tx = new Transaction().add(createIx);
	await sendAndConfirmViaPolling(connection, tx, [payer], { commitment: "confirmed" });

	return { address, amount: 0 };
}

module.exports = {
	TOKEN_PROGRAM_ID,
	ASSOCIATED_TOKEN_PROGRAM_ID,
	getAssociatedTokenAddress,
	createTransferInstruction,
	createTransferCheckedInstruction,
	createAssociatedTokenAccountInstruction,
	getOrCreateAssociatedTokenAccount,
};
