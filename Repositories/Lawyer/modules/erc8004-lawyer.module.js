const { ethers } = require("ethers");
const config = require("../../../Core/config");
const IPFSModule = require("../../IPFS/modules/ipfs.module");

/**
 * ERC8004 Lawyer Integration Module
 * Handles lawyer identity, reputation, and validation on-chain
 * Based on the proven verifik-backend ERC8004 pattern
 */

const IDENTITY_REGISTRY_ABI = [
	"function registerAgent(address agentAddress, string memory name, string memory description, string memory agentCardURI, string[] memory capabilities) external returns (uint256)",
	"function getAgentTokenId(address agentAddress) external view returns (uint256)",
	"function isAgentRegistered(address agentAddress) external view returns (bool, bool, uint256)",
	"function getAgentIdentity(uint256 tokenId) external view returns (tuple(string name, string description, string agentCardURI, string[] capabilities, address agentAddress, uint256 createdAt, bool active))",
	"function updateAgent(uint256 tokenId, string memory agentCardURI, string[] memory capabilities) external",
];

const REPUTATION_REGISTRY_ABI = [
	"function submitFeedback(uint256 agentTokenId, uint8 rating, string[] memory tags, string memory comment, bytes32 paymentProof) external returns (uint256)",
	"function getReputationSummary(uint256 agentTokenId) external view returns (uint256, uint256, uint256)",
	"function getAgentFeedbacks(uint256 agentTokenId) external view returns (uint256[])",
	"function getFeedback(uint256 feedbackId) external view returns (tuple(address client, uint256 agentTokenId, uint8 rating, string[] tags, string comment, bytes32 paymentProof, uint256 timestamp, bool verified))",
	"function getTagCount(uint256 agentTokenId, string memory tag) external view returns (uint256)",
];

const VALIDATION_REGISTRY_ABI = [
	"function recordValidation(uint256 agentTokenId, string memory taskId, bytes32 outputHash, bytes32 proofHash, address validator, uint8 validationType, bool isValid, string memory metadataURI) external returns (uint256)",
	"function getValidationStats(uint256 agentTokenId) external view returns (uint256, uint256, uint256)",
	"function getValidation(uint256 validationId) external view returns (tuple(uint256 agentTokenId, string taskId, bytes32 outputHash, bytes32 proofHash, address validator, uint8 validationType, bool isValid, uint256 timestamp, string metadataURI))",
	"function getAgentValidations(uint256 agentTokenId) external view returns (uint256[])",
];

let provider = null;
let signer = null;
let identityRegistry = null;
let reputationRegistry = null;
let validationRegistry = null;

/**
 * Initialize ERC8004 contracts (lazy)
 */
const initialize = () => {
	const erc8004Config = config.erc8004 || {};
	const rpcUrl = erc8004Config.rpcUrl || "https://api.avax-test.network/ext/bc/C/rpc";

	provider = new ethers.JsonRpcProvider(rpcUrl);

	const identityAddress = erc8004Config.identityRegistryAddress;
	const reputationAddress = erc8004Config.reputationRegistryAddress;
	const validationAddress = erc8004Config.validationRegistryAddress;

	if (!identityAddress || !reputationAddress || !validationAddress) {
		console.warn("[ERC8004-Lawyer] Contract addresses not configured. ERC8004 features disabled.");
		return false;
	}

	// Read-only contracts (with provider)
	identityRegistry = new ethers.Contract(identityAddress, IDENTITY_REGISTRY_ABI, provider);
	reputationRegistry = new ethers.Contract(reputationAddress, REPUTATION_REGISTRY_ABI, provider);
	validationRegistry = new ethers.Contract(validationAddress, VALIDATION_REGISTRY_ABI, provider);

	// Signer for write operations (prefer WALRUS_PRIVATE_KEY for Avalanche, fallback to MNEMONICS)
	// WALRUS_PRIVATE_KEY can be hex (0x + 64 chars) or mnemonic (12/24 space-separated words)
	const rawKey = process.env.WALRUS_PRIVATE_KEY?.trim();
	const mnemonic = process.env.MNEMONICS?.trim();

	if (rawKey) {
		// Mnemonic: contains spaces. Hex: 0x + 64 hex chars, no spaces.
		const looksLikeMnemonic = /\s/.test(rawKey) || (rawKey.startsWith("0x") && rawKey.length > 70);
		if (looksLikeMnemonic) {
			const phrase = rawKey.replace(/^0x/, "").trim();
			signer = ethers.Wallet.fromPhrase(phrase, provider);
			console.log("[ERC8004-Lawyer] Initialized with mnemonic signer:", signer.address);
		} else {
			signer = new ethers.Wallet(rawKey, provider);
			console.log("[ERC8004-Lawyer] Initialized with private key signer:", signer.address);
		}
	} else if (mnemonic) {
		signer = ethers.Wallet.fromPhrase(mnemonic, provider);
		console.log("[ERC8004-Lawyer] Initialized with mnemonic signer:", signer.address);
	} else {
		console.warn("[ERC8004-Lawyer] No WALRUS_PRIVATE_KEY or MNEMONICS set, write operations disabled.");
	}

	console.log("[ERC8004-Lawyer] Initialized contracts");
	return true;
};

/**
 * Check if a lawyer is registered on-chain
 * @param {string} walletAddress
 * @returns {Promise<{isRegistered: boolean, isActive: boolean, tokenId: number}>}
 */
const isLawyerRegistered = async (walletAddress) => {
	if (!identityRegistry) {
		initialize();
		if (!identityRegistry) return { isRegistered: false, isActive: false, tokenId: 0 };
	}

	try {
		const [isRegistered, isActive, tokenId] = await identityRegistry.isAgentRegistered(walletAddress);
		return { isRegistered, isActive, tokenId: Number(tokenId) };
	} catch (error) {
		console.error("[ERC8004-Lawyer] Error checking registration:", error.message);
		return { isRegistered: false, isActive: false, tokenId: 0 };
	}
};

/**
 * Get lawyer on-chain identity
 * @param {number} tokenId
 * @returns {Promise<Object|null>}
 */
const getLawyerIdentity = async (tokenId) => {
	if (!identityRegistry) {
		const initialized = initialize();
		if (!initialized || !identityRegistry) return null;
	}

	try {
		const identity = await identityRegistry.getAgentIdentity(tokenId);

		if (!identity || !identity.name) return null;

		return {
			name: identity.name,
			description: identity.description,
			agentCardURI: identity.agentCardURI,
			capabilities: identity.capabilities,
			agentAddress: identity.agentAddress,
			createdAt: Number(identity.createdAt),
			active: identity.active,
		};
	} catch (error) {
		console.error("[ERC8004-Lawyer] Error getting identity:", error.message);
		return null;
	}
};

/**
 * Register a lawyer on the ERC8004 Identity Registry
 * @param {Object} data - { walletAddress } (profile data is pulled from IPFS)
 * @param {Object} authUser - JWT user
 * @returns {Object}
 */
const registerLawyer = async (data, authUser) => {
	if (!identityRegistry || !signer) {
		initialize();
		if (!identityRegistry) throw new Error("500:identity_registry_not_configured");
		if (!signer) throw new Error("500:signer_not_configured");
	}

	// Get lawyer profile from IPFS
	const LawyerModule = require("./lawyer.module");
	const lawyerProfile = await LawyerModule.getMyProfile(authUser);
	if (!lawyerProfile) throw new Error("404:lawyer_not_found");

	const walletAddress = lawyerProfile.publicData?.lawyerWalletAddress;
	if (!walletAddress) throw new Error("400:missing_wallet_address");

	const { isRegistered, tokenId: existingTokenId } = await isLawyerRegistered(walletAddress);
	if (isRegistered) {
		return { message: "Lawyer already registered", tokenId: existingTokenId, walletAddress };
	}

	const name = lawyerProfile.publicData?.lawyerZelfName || lawyerProfile.publicData?.lawyerName || "Lawyer";
	const description = `Licensed lawyer - ${lawyerProfile.publicData?.lawyerSpecialization || "General Practice"}`;
	const capabilities = (lawyerProfile.publicData?.lawyerSpecialization || "").split(",").filter(Boolean);

	// Build profile URI on IPFS
	const registrationFile = {
		type: "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
		name,
		description,
		services: [
			{
				name: "web",
				endpoint: `https://dashboard.zelf.world/lawyers/${lawyerProfile.publicData?.lawyerZelfName || walletAddress}`,
			},
		],
		active: true,
		supportedTrust: ["reputation"],
	};

	const regJson = JSON.stringify(registrationFile, null, 2);
	const regBase64 = Buffer.from(regJson).toString("base64");

	const ipfsRecord = await IPFSModule.insert(
		{
			base64: regBase64,
			metadata: {
				type: "erc8004_registration",
				lawyerWalletAddress: walletAddress,
			},
			name: `${walletAddress}.erc8004-registration`,
			pinIt: true,
		},
		{ pro: true },
	);

	const agentCardURI = ipfsRecord.url;

	// Register on-chain (owner calls registerAgent)
	const identityWithSigner = identityRegistry.connect(signer);
	const tx = await identityWithSigner.registerAgent(walletAddress, name, description, agentCardURI, capabilities);
	const receipt = await tx.wait();

	// Get token ID from contract
	const newTokenId = await identityRegistry.getAgentTokenId(walletAddress);

	return {
		tokenId: Number(newTokenId),
		walletAddress,
		agentCardURI,
		transactionHash: receipt.hash,
		blockNumber: receipt.blockNumber,
	};
};

/**
 * Get lawyer reputation summary
 * @param {string} walletAddress
 * @returns {Promise<Object>}
 */
const getReputationSummary = async (walletAddress) => {
	if (!reputationRegistry) {
		initialize();
		if (!reputationRegistry) throw new Error("500:reputation_registry_not_configured");
	}

	const { isRegistered, tokenId } = await isLawyerRegistered(walletAddress);
	if (!isRegistered) throw new Error("404:lawyer_not_registered_on_chain");

	try {
		const [totalFeedbacks, verifiedFeedbacks, averageRating] = await reputationRegistry.getReputationSummary(tokenId);

		// Also fetch IPFS-stored reviews for extended data
		const ipfsReviews = await IPFSModule.get({ key: "reviewLawyerWallet", value: walletAddress });

		return {
			walletAddress,
			tokenId,
			totalFeedbacks: Number(totalFeedbacks),
			verifiedFeedbacks: Number(verifiedFeedbacks),
			averageRating: Number(averageRating) / 100,
			recentReviews: ipfsReviews.slice(0, 10),
		};
	} catch (error) {
		console.error("[ERC8004-Lawyer] Error getting reputation:", error.message);
		throw error;
	}
};

/**
 * Get all on-chain feedbacks for a lawyer
 * @param {string} walletAddress
 * @returns {Promise<Array>}
 */
const getLawyerFeedbacks = async (walletAddress) => {
	if (!reputationRegistry) {
		initialize();
		if (!reputationRegistry) return [];
	}

	const { isRegistered, tokenId } = await isLawyerRegistered(walletAddress);
	if (!isRegistered) return [];

	try {
		const feedbackIds = await reputationRegistry.getAgentFeedbacks(tokenId);
		const feedbacks = [];

		for (const id of feedbackIds) {
			const feedback = await reputationRegistry.getFeedback(id);
			feedbacks.push({
				id: id.toString(),
				client: feedback.client,
				rating: Number(feedback.rating),
				tags: feedback.tags,
				comment: feedback.comment,
				verified: feedback.verified,
				timestamp: new Date(Number(feedback.timestamp) * 1000).toISOString(),
				paymentProof: feedback.paymentProof,
			});
		}

		return feedbacks;
	} catch (error) {
		console.error("[ERC8004-Lawyer] Error getting feedbacks:", error.message);
		return [];
	}
};

/**
 * Submit feedback/review for a lawyer
 * @param {Object} data - { lawyerWalletAddress, rating, tags, comment, paymentTxHash }
 * @param {Object} authUser - JWT user (reviewer)
 * @returns {Object}
 */
const submitFeedback = async (data, authUser) => {
	if (!reputationRegistry || !signer) {
		initialize();
		if (!reputationRegistry) throw new Error("500:reputation_registry_not_configured");
		if (!signer) throw new Error("500:signer_not_configured");
	}

	const { lawyerWalletAddress, rating, tags = [], comment = "", paymentTxHash = "" } = data;

	const { isRegistered, tokenId } = await isLawyerRegistered(lawyerWalletAddress);
	if (!isRegistered) throw new Error("404:lawyer_not_registered_on_chain");

	// Store detailed review on IPFS
	const reviewData = {
		reviewerEmail: authUser.email,
		reviewerWallet: authUser.walletAddress || authUser.solanaAddress,
		lawyerWalletAddress,
		rating,
		tags,
		comment,
		paymentTxHash,
		timestamp: new Date().toISOString(),
	};

	const reviewJson = JSON.stringify(reviewData, null, 2);
	const reviewBase64 = Buffer.from(reviewJson).toString("base64");

	const reviewIpfs = await IPFSModule.insert(
		{
			base64: reviewBase64,
			metadata: {
				type: "lawyer_review",
				reviewLawyerWallet: lawyerWalletAddress,
				reviewerEmail: authUser.email,
				reviewRating: String(rating),
			},
			name: `${authUser.email}-${lawyerWalletAddress}.review`,
			pinIt: true,
		},
		{ pro: true },
	);

	// Submit on-chain
	const reputationWithSigner = reputationRegistry.connect(signer);
	const paymentProof = paymentTxHash ? ethers.keccak256(ethers.toUtf8Bytes(paymentTxHash)) : ethers.ZeroHash;

	const tx = await reputationWithSigner.submitFeedback(tokenId, rating, tags, comment, paymentProof);
	const receipt = await tx.wait();

	return {
		transactionHash: receipt.hash,
		tokenId,
		rating,
		tags,
		comment,
		reviewIpfsUrl: reviewIpfs.url,
	};
};

/**
 * Record a license validation proof on-chain
 * @param {Object} data - { lawyerWalletAddress, validationType, taskId, output, metadataURI }
 * @param {Object} authUser
 * @returns {Object}
 */
const recordValidation = async (data, authUser) => {
	if (!validationRegistry || !signer) {
		initialize();
		if (!validationRegistry) throw new Error("500:validation_registry_not_configured");
		if (!signer) throw new Error("500:signer_not_configured");
	}

	const { lawyerWalletAddress, validationType = 1, taskId, output = "", metadataURI = "" } = data;

	const { isRegistered, tokenId } = await isLawyerRegistered(lawyerWalletAddress);
	if (!isRegistered) throw new Error("404:lawyer_not_registered_on_chain");

	const finalTaskId = taskId || `${lawyerWalletAddress}-license-${Date.now()}`;
	const outputHash = ethers.keccak256(ethers.toUtf8Bytes(output || finalTaskId));
	const proofHash = ethers.keccak256(ethers.toUtf8Bytes(`${finalTaskId}-proof`));

	const validationWithSigner = validationRegistry.connect(signer);

	const tx = await validationWithSigner.recordValidation(
		tokenId,
		finalTaskId,
		outputHash,
		proofHash,
		signer.address,
		validationType,
		true,
		metadataURI,
	);

	const receipt = await tx.wait();

	return {
		transactionHash: receipt.hash,
		tokenId,
		taskId: finalTaskId,
		validationType,
	};
};

/**
 * Get validation statistics for a lawyer
 * @param {string} walletAddress
 * @returns {Promise<Object|null>}
 */
const getValidationStats = async (walletAddress) => {
	if (!validationRegistry) {
		initialize();
		if (!validationRegistry) return null;
	}

	const { isRegistered, tokenId } = await isLawyerRegistered(walletAddress);
	if (!isRegistered) return null;

	try {
		const [totalValidations, validCount, invalidCount] = await validationRegistry.getValidationStats(tokenId);
		return {
			totalValidations: Number(totalValidations),
			validCount: Number(validCount),
			invalidCount: Number(invalidCount),
		};
	} catch (error) {
		console.error("[ERC8004-Lawyer] Error getting validation stats:", error.message);
		return null;
	}
};

// Initialize on module load
initialize();

module.exports = {
	initialize,
	isLawyerRegistered,
	getLawyerIdentity,
	registerLawyer,
	getReputationSummary,
	getLawyerFeedbacks,
	submitFeedback,
	recordValidation,
	getValidationStats,
};
