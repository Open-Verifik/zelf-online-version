const solanaWeb3 = require("@solana/web3.js");
const splToken = require("@solana/spl-token");
const Solana = require("../../Wallet/modules/solana");
const config = require("../../../Core/config");

// Connect to Solana devnet or mainnet
// const connection = new solanaWeb3.Connection(solanaWeb3.clusterApiUrl("mainnet-beta"), "confirmed");
let connection;
(async () => {
	connection = new solanaWeb3.Connection("https://sparkling-special-mound.solana-mainnet.quiknode.pro/810558fcdec3e18eaf3701136d38bd6aa8d61b77/");
	console.log(await connection.getSlot());
})();

// Token mint address (ZNS token address)
const tokenMintAddress = new solanaWeb3.PublicKey("GfF6PSkH8bKLkws5RMFdzgASwcVbgCfhhKfp8zeoFBkx"); // Replace with actual token mint address

// Receiver's public key
const receiverPublicKey = new solanaWeb3.PublicKey("Gxc6245Pwod5pfGWrFoQ1YYTezUCuXeF1jWqfjMKphLt"); // Replace with actual receiver address

const _giveTokensAfterPurchase = async (zelfNameObject) => {
	try {
		const senderKey = Uint8Array.from(JSON.parse(config.solana.sender));
		const senderWallet = solanaWeb3.Keypair.fromSecretKey(senderKey);

		// Get or create the sender's associated token account
		const senderTokenAccount = await splToken.getOrCreateAssociatedTokenAccount(
			connection,
			senderWallet,
			tokenMintAddress,
			senderWallet.publicKey
		);

		const tokenBalance = await connection.getTokenAccountBalance(senderTokenAccount.address);
		console.log("Sender Token Account Balance:", tokenBalance.value.uiAmount);

		// Ensure sender has enough tokens to send
		const amountToSend = 1 * 10 ** 8; // 1 ZNS token (assuming 8 decimals)
		if (tokenBalance.value.amount < amountToSend) {
			throw new Error("Insufficient balance in sender's token account.");
		}

		console.log("PRE - > Checking Receiver's Token Account");

		// Check if the receiver's associated token account exists
		const associatedTokenAddress = await splToken.getAssociatedTokenAddress(tokenMintAddress, receiverPublicKey);

		const receiverAccountInfo = await connection.getAccountInfo(associatedTokenAddress);

		if (!receiverAccountInfo) {
			console.log("Receiver Token Account does not exist. Creating...");

			// Manually create the receiver's associated token account
			const createReceiverAccountInstruction = splToken.createAssociatedTokenAccountInstruction(
				senderWallet.publicKey, // Payer
				associatedTokenAddress, // Associated token account to be created
				receiverPublicKey, // Receiver's public key
				tokenMintAddress // Token mint address
			);

			const createTransaction = new solanaWeb3.Transaction().add(createReceiverAccountInstruction);

			// Sign and send the transaction to create the receiver's token account
			await solanaWeb3.sendAndConfirmTransaction(connection, createTransaction, [senderWallet]);

			console.log("Receiver Token Account created successfully:", associatedTokenAddress.toBase58());
		} else {
			console.log("Receiver Token Account exists:", associatedTokenAddress.toBase58());
		}

		// Proceed with the token transfer
		console.log("PRE - > Creating Transfer Instruction");

		const transferInstruction = splToken.createTransferCheckedInstruction(
			senderTokenAccount.address, // Sender's token account
			tokenMintAddress, // Token mint address
			associatedTokenAddress, // Receiver's token account
			senderWallet.publicKey, // Owner of the sender's token account
			amountToSend, // Amount to send (in smallest unit)
			8 // Decimals of the token
		);

		console.log("PRE - > Building Transaction");
		const transaction = new solanaWeb3.Transaction().add(transferInstruction);

		console.log("PRE - > Sending Transaction");
		const signature = await solanaWeb3.sendAndConfirmTransaction(connection, transaction, [senderWallet]);

		console.log("Transaction successful, signature:", signature);
	} catch (error) {
		console.error("Error sending token:", { error });
	}
};

const __giveTokensAfterPurchase = async (zelfNameObject) => {
	try {
		const senderKey = Uint8Array.from(JSON.parse(config.solana.sender));
		const senderWallet = solanaWeb3.Keypair.fromSecretKey(senderKey);

		// Create sender's associated token account
		const senderTokenAccount = await splToken.getOrCreateAssociatedTokenAccount(
			connection,
			senderWallet,
			tokenMintAddress,
			senderWallet.publicKey
		);

		// Log sender's token balance
		const tokenBalance = await connection.getTokenAccountBalance(senderTokenAccount.address);
		console.log("Sender Token Account Balance:", tokenBalance.value.uiAmount);

		// Ensure receiver's associated token account is created
		console.log("Checking or creating receiver's token account...");
		const receiverTokenAccount = await splToken.getOrCreateAssociatedTokenAccount(
			connection,
			senderWallet, // Payer
			tokenMintAddress,
			receiverPublicKey
		);

		// Define the amount to transfer (1 ZNS token in smallest units)
		const amountToSend = 1 * 10 ** 8; // Adjust decimals as per the token

		// Log and create the transfer instruction
		console.log("Creating transfer instruction...");
		const transferInstruction = splToken.createTransferCheckedInstruction(
			senderTokenAccount.address, // Sender's token account
			tokenMintAddress, // Token mint address
			receiverTokenAccount.address, // Receiver's token account
			senderWallet.publicKey, // Owner of the sender's token account
			amountToSend, // Amount to transfer
			8 // Token decimals
		);

		// Build and send the transaction
		console.log("Building transaction...");
		const transaction = new solanaWeb3.Transaction().add(transferInstruction);

		console.log("Sending transaction...");
		const signature = await solanaWeb3.sendAndConfirmTransaction(connection, transaction, [senderWallet]);

		console.log("Transaction successful! Signature:", signature);
		return signature;
	} catch (error) {
		console.error("Error during token transfer:", error);
		throw error; // Re-throw for higher-level error handling if needed
	}
};

const giveTokensAfterPurchase = async (zelfNameObject) => {
	try {
		const senderKey = Uint8Array.from(JSON.parse(config.solana.sender));
		const senderWallet = solanaWeb3.Keypair.fromSecretKey(senderKey);

		// Get or create the sender's associated token account
		const senderTokenAccount = await splToken.getOrCreateAssociatedTokenAccount(
			connection,
			senderWallet,
			tokenMintAddress,
			senderWallet.publicKey
		);

		const tokenBalance = await connection.getTokenAccountBalance(senderTokenAccount.address);
		console.log("Sender Token Account Balance:", tokenBalance.value.uiAmount);

		// Ensure sender has enough tokens to send
		const amountToSend = 1 * 10 ** 8; // 1 ZNS token (assuming 8 decimals)
		if (tokenBalance.value.amount < amountToSend) {
			throw new Error("Insufficient balance in sender's token account.");
		}

		// Get the receiver's associated token account address
		const associatedTokenAddress = await splToken.getAssociatedTokenAddress(tokenMintAddress, receiverPublicKey);

		// Check if the receiver's token account exists
		const receiverAccountInfo = await connection.getAccountInfo(associatedTokenAddress);

		if (!receiverAccountInfo) {
			console.log("Receiver Token Account does not exist. Creating...");

			// Create the receiver's associated token account
			const createReceiverAccountInstruction = splToken.createAssociatedTokenAccountInstruction(
				senderWallet.publicKey, // Payer
				associatedTokenAddress, // Associated token account to be created
				receiverPublicKey, // Receiver's public key
				tokenMintAddress // Token mint address
			);

			const createTransaction = new solanaWeb3.Transaction().add(createReceiverAccountInstruction);

			// Use sendWithRetry for reliable account creation
			const createSignature = await sendWithRetry(createTransaction, [senderWallet], 3);

			console.log("Receiver Token Account created successfully:", createSignature);

			// Confirm the creation before proceeding
			await connection.confirmTransaction(createSignature, "finalized");
		}

		// Proceed with the token transfer
		console.log("PRE - > Creating Transfer Instruction");

		const transferInstruction = splToken.createTransferCheckedInstruction(
			senderTokenAccount.address, // Sender's token account
			tokenMintAddress, // Token mint address
			associatedTokenAddress, // Receiver's token account
			senderWallet.publicKey, // Owner of the sender's token account
			amountToSend, // Amount to send (in smallest unit)
			8 // Decimals of the token
		);

		const transferTransaction = new solanaWeb3.Transaction().add(transferInstruction);

		// Use sendWithRetry for reliable token transfer
		const transferSignature = await sendWithRetry(transferTransaction, [senderWallet]);

		console.log("Transaction successful, signature:", transferSignature, { transferTransaction });
	} catch (error) {
		console.error("Error sending token:", { error });
	}
};

// Utility function for retrying transactions
const sendWithRetry = async (transaction, signers, retries = 3) => {
	for (let attempt = 1; attempt <= retries; attempt++) {
		try {
			const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();

			transaction.recentBlockhash = blockhash;
			transaction.lastValidBlockHeight = lastValidBlockHeight + 200;

			const signature = await solanaWeb3.sendAndConfirmTransaction(connection, transaction, signers, {
				commitment: "confirmed",
			});

			return signature; // Successful transaction
		} catch (error) {
			console.error(`Transaction attempt ${attempt} failed:`, error);
			if (attempt === retries) throw error; // Rethrow if max retries reached
		}
	}
};

module.exports = {
	giveTokensAfterPurchase,
};
