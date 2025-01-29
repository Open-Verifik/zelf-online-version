const solanaWeb3 = require("@solana/web3.js");
const splToken = require("@solana/spl-token");
const config = require("../../../Core/config");
const ReferralRewardModel = require("../models/referral-rewards.model");
const PurchaseRewardModel = require("../models/purchase-rewards.model");
const MongoORM = require("../../../Core/mongo-orm");

// Connect to Solana devnet or mainnet
// const connection = new solanaWeb3.Connection(solanaWeb3.clusterApiUrl("mainnet-beta"), "confirmed");
let connection;
(async () => {
	connection = new solanaWeb3.Connection("https://sparkling-special-mound.solana-mainnet.quiknode.pro/810558fcdec3e18eaf3701136d38bd6aa8d61b77/");
	console.log(await connection.getSlot());
})();

// Token mint address (ZNS token address)
const tokenMintAddress = new solanaWeb3.PublicKey("GfF6PSkH8bKLkws5RMFdzgASwcVbgCfhhKfp8zeoFBkx"); // Replace with actual token mint address

const giveTokensAfterPurchase = async (reward) => {
	try {
		const senderKey = Uint8Array.from(JSON.parse(config.solana.sender));
		const senderWallet = solanaWeb3.Keypair.fromSecretKey(senderKey);

		// Compute Budget Program Instruction (to increase gas fees)
		const computeBudgetInstruction = solanaWeb3.ComputeBudgetProgram.setComputeUnitPrice({
			microLamports: 100000, // Adjust this value to set a higher priority fee
		});

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
		const amountToSend = reward.zelfNamePriceSum * 0.25 * 10 ** 8; // 1 ZNS token (assuming 8 decimals)

		if (tokenBalance.value.amount < amountToSend) {
			throw new Error("Insufficient balance in sender's token account.");
		}

		// Receiver's public key
		const receiverPublicKey = new solanaWeb3.PublicKey(reward.referralSolanaAddress);

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

			const createTransaction = new solanaWeb3.Transaction().add(computeBudgetInstruction, createReceiverAccountInstruction);

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

		const transferTransaction = new solanaWeb3.Transaction().add(computeBudgetInstruction, transferInstruction);

		// Use sendWithRetry for reliable token transfer
		const transferSignature = await sendWithRetry(transferTransaction, [senderWallet]);

		console.log("Transaction successful, signature:", transferSignature, { transferTransaction });

		return transferSignature;
	} catch (error) {
		console.error("Error sending token:", { error });
		throw error;
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

const addReferralReward = async (zelfNameObject) => {
	if (!zelfNameObject) return null;

	try {
		const referralReward = new ReferralRewardModel({
			zelfName: zelfNameObject.zelfName,
			ethAddress: zelfNameObject.ethAddress,
			solanaAddress: zelfNameObject.solanaAddress,
			referralZelfName: zelfNameObject.referralZelfName,
			referralSolanaAddress: zelfNameObject.referralSolanaAddress,
			zelfNamePrice: zelfNameObject.zelfNamePrice,
			status: "pending",
			attempts: 0,
			payload: {},
			ipfsHash: zelfNameObject.ipfsHash,
			arweaveId: zelfNameObject.arweaveId,
		});

		await referralReward.save();

		return referralReward;
	} catch (error) {
		console.error("Error adding purchase:", error);
		throw error; // Re-throw for higher-level error handling if needed
	}
};

const addPurchaseReward = async (zelfNameObject) => {
	if (!zelfNameObject) return null;

	try {
		const referralReward = new PurchaseRewardModel({
			zelfName: zelfNameObject.zelfName,
			ethAddress: zelfNameObject.ethAddress,
			solanaAddress: zelfNameObject.solanaAddress,
			zelfNamePrice: zelfNameObject.zelfNamePrice,
			status: "pending",
			attempts: 0,
			payload: {},
			ipfsHash: zelfNameObject.ipfsHash,
			arweaveId: zelfNameObject.arweaveId,
		});

		await referralReward.save();

		return referralReward;
	} catch (error) {
		console.error("Error adding purchase:", error);
		throw error; // Re-throw for higher-level error handling if needed
	}
};

const releaseReferralRewards = async (authUser) => {
	let referralRewards = null;
	let firstGroup = null;

	try {
		referralRewards = await MongoORM.groupAggregate(ReferralRewardModel, {
			wheres: { status: "pending" }, // Match condition
			groupBy: "referralZelfName", // Group by field
			sum: "zelfNamePrice", // Field to sum
			includeFields: ["referralZelfName", "referralSolanaAddress", "status"],
		});

		// Ensure there is at least one group to process
		if (!referralRewards || referralRewards.length === 0) {
			return { nothingToProcess: true };
		}

		firstGroup = referralRewards[0];

		await giveTokensAfterPurchase(firstGroup);

		// Update all records in this group with a single updateMany
		await ReferralRewardModel.updateMany(
			{
				referralZelfName: firstGroup._id, // Match the grouped field
				status: "pending", // Ensure only pending rewards are updated
			},
			{
				$set: {
					status: "completed",
					completedAt: new Date(),
				},
				$inc: { attempts: 1 }, // Increment the attempts counter
			}
		);

		return firstGroup;
	} catch (error) {
		console.error("Error releasing reward:", error);

		if (referralRewards.length) {
			await ReferralRewardModel.updateMany(
				{
					referralZelfName: firstGroup._id, // Match the grouped field
					status: "pending", // Ensure only pending rewards are updated
				},
				{
					$set: {},
					$inc: { attempts: 1 }, // Increment the attempts counter
				}
			);
		}

		throw error; // Re-throw for higher-level error handling if needed
	}
};

const releasePurchaseRewards = async (authUser) => {
	const purchaseReward = await MongoORM.buildQuery({ where_status: "pending", findOne: true }, PurchaseRewardModel, null);

	try {
		if (!purchaseReward) {
			return { nothingToProcess: true };
		}

		// if attempts is 5 then mark it as failed
		if (purchaseReward.attempts === 5) {
			purchaseReward.status = "failed";

			purchaseReward.completedAt = new Date();

			await purchaseReward.save();

			return purchaseReward;
		}

		await giveTokensAfterPurchase(firstGroup);

		purchaseReward.status = "completed";
		purchaseReward.completedAt = new Date();
		purchaseReward.attempts += 1;

		await purchaseReward.save();

		return purchaseReward;
	} catch (error) {
		console.error("Error releasing reward:", error);

		purchaseReward.status = "pending";

		purchaseReward.attempts += 1;

		await purchaseReward.save();

		throw error; // Re-throw for higher-level error handling if needed
	}
};

module.exports = {
	addReferralReward,
	addPurchaseReward,
	releaseReferralRewards,
	releasePurchaseRewards,
	giveTokensAfterPurchase,
};
