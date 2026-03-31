/**
 * Option A: Tags Token Module - @solana-program/token + @solana/kit (0 vulnerabilities)
 * Test via SOLANA_USE_KIT=true. For now uses same manual SPL as Option B.
 */
const solanaWeb3 = require("@solana/web3.js");
const splManual = require("../../../Core/spl-token-manual");
const { sendWithRetry } = require("../../../Core/solana-tx");
const config = require("../../../Core/config");
const ReferralRewardModel = require("../models/referral-rewards.model");
const PurchaseRewardModel = require("../models/purchase-rewards.model");
const MongoORM = require("../../../Core/mongo-orm");

let connection;

const initConnection = async () => {
	if (connection) return connection;

	connection = new solanaWeb3.Connection(config.solana.rpcUrl);

	await connection.getSlot();
};

const tokenMintAddress = new solanaWeb3.PublicKey(config.solana.tokenMintAddress);

const giveTokensAfterPurchase = async (amount, receiverSolanaAddress) => {
	try {
		await initConnection();

		const senderKey = Uint8Array.from(JSON.parse(config.solana.sender));
		const senderWallet = solanaWeb3.Keypair.fromSecretKey(senderKey);

		const computeBudgetInstruction = solanaWeb3.ComputeBudgetProgram.setComputeUnitPrice({
			microLamports: 100000,
		});

		const senderTokenAccount = await splManual.getOrCreateAssociatedTokenAccount(
			connection,
			senderWallet,
			tokenMintAddress,
			senderWallet.publicKey
		);

		const amountToSend =
			typeof amount === "number" && amount < 1000
				? Math.round(amount * 10 ** 8)
				: Math.round(amount);

		if (senderTokenAccount.amount < amountToSend) {
			throw new Error("Insufficient balance in sender's token account.");
		}

		const receiverPublicKey = new solanaWeb3.PublicKey(receiverSolanaAddress);

		const receiverTokenAccount = await splManual.getOrCreateAssociatedTokenAccount(
			connection,
			senderWallet,
			tokenMintAddress,
			receiverPublicKey
		);

		const transferInstruction = splManual.createTransferCheckedInstruction(
			senderTokenAccount.address,
			tokenMintAddress,
			receiverTokenAccount.address,
			senderWallet.publicKey,
			amountToSend,
			8
		);

		const transferTransaction = new solanaWeb3.Transaction().add(computeBudgetInstruction, transferInstruction);

		const transferSignature = await sendWithRetry(connection, transferTransaction, [senderWallet]);

		return transferSignature;
	} catch (error) {
		console.error("Error sending token:", { error });
		throw error;
	}
};

// sendWithRetry is imported from Core/solana-tx.js (HTTP-only polling, no WebSocket signatureSubscribe)

const addReferralReward = async (tagObject, authUser, domain = "zelf") => {
	if (!tagObject) return null;

	try {
		const referralReward = new ReferralRewardModel({
			tagName: tagObject.tagName,
			domain: domain,
			ethAddress: tagObject.ethAddress,
			solanaAddress: tagObject.solanaAddress,
			referralTagName: tagObject.referralTagName,
			referralDomain: tagObject.referralDomain || domain,
			referralSolanaAddress: tagObject.referralSolanaAddress,
			tagPrice: tagObject.tagPrice || 0,
			status: "pending",
			attempts: 0,
			payload: {},
			ipfsHash: tagObject.ipfsHash,
			arweaveId: tagObject.arweaveId,
		});

		await referralReward.save();

		return referralReward;
	} catch (error) {
		console.error("Error adding referral reward:", error);
	}
};

const addPurchaseReward = async (authUser, domain = "zelf", tagPrice = 0) => {
	if (!authUser) return null;

	try {
		const purchaseReward = new PurchaseRewardModel({
			tagName: `${authUser.email}_${domain}_${Date.now()}`,
			domain: domain,
			ethAddress: authUser.ethAddress || "",
			solanaAddress: authUser.solanaAddress || "",
			tagPrice: tagPrice,
			tokenAmount: 250,
			status: "pending",
			attempts: 0,
			payload: {},
			ipfsHash: "",
			arweaveId: "not_set",
		});

		return await purchaseReward.save();
	} catch (error) {
		console.error("Error adding purchase reward:", error);
		throw error;
	}
};

const releaseReferralRewards = async (authUser) => {
	let referralRewards = null;
	let firstGroup = null;

	try {
		referralRewards = await MongoORM.groupAggregate(ReferralRewardModel, {
			wheres: { status: "pending" },
			groupBy: "referralTagName",
			sum: "tagPrice",
			includeFields: ["referralTagName", "referralSolanaAddress", "status"],
		});

		if (!referralRewards || referralRewards.length === 0) {
			return { nothingToProcess: true };
		}

		firstGroup = referralRewards[0];

		const rewardTokens = Math.round(firstGroup.totalSum * 0.05 * 100) / 100;

		await giveTokensAfterPurchase(rewardTokens, firstGroup.referralSolanaAddress);

		await ReferralRewardModel.updateMany(
			{
				referralTagName: firstGroup._id,
				status: "pending",
			},
			{
				$set: {
					status: "completed",
					completedAt: new Date(),
				},
				$inc: { attempts: 1 },
			}
		);

		return firstGroup;
	} catch (error) {
		console.error("Error releasing referral reward:", error);

		if (referralRewards.length) {
			await ReferralRewardModel.updateMany(
				{
					referralTagName: firstGroup._id,
					status: "pending",
				},
				{
					$set: {},
					$inc: { attempts: 1 },
				}
			);
		}

		throw error;
	}
};

const releasePurchaseRewards = async (authUser) => {
	const purchaseReward = await MongoORM.buildQuery({ where_status: "pending", findOne: true }, PurchaseRewardModel, null);

	if (!purchaseReward) {
		return { nothingToProcess: true };
	}

	if (purchaseReward.attempts === 5) {
		purchaseReward.status = "failed";
		purchaseReward.completedAt = new Date();
		await purchaseReward.save();
		return purchaseReward;
	}

	try {
		const signature = await giveTokensAfterPurchase(250, purchaseReward.solanaAddress);

		purchaseReward.status = "completed";
		purchaseReward.completedAt = new Date();
		purchaseReward.attempts += 1;
		purchaseReward.payload = { signature };

		await purchaseReward.save();

		return purchaseReward;
	} catch (error) {
		console.error("Error releasing purchase reward:", error);

		purchaseReward.status = "pending";
		purchaseReward.attempts += 1;

		await purchaseReward.save();

		throw error;
	}
};

const getPurchaseReward = async (tagName, afterDate) => {
	if (!tagName) return null;

	const queryParams = {
		where_tagName: tagName,
		findOne: true,
	};

	if (afterDate) queryParams["where>=_createdAt"] = afterDate;

	try {
		const purchaseReward = await MongoORM.buildQuery(queryParams, PurchaseRewardModel, null);

		if (!purchaseReward) return null;

		return purchaseReward;
	} catch (error) {
		console.error("Error getting purchase reward:", error);
		throw error;
	}
};

module.exports = {
	getPurchaseReward,
	addReferralReward,
	addPurchaseReward,
	releaseReferralRewards,
	releasePurchaseRewards,
	giveTokensAfterPurchase,
};
