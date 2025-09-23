const { decrypt, encrypt, preview, encryptQRCode } = require("../../ZelfProof/modules/zelf-proof.module");
const QRZelfProofExtractor = require("./qr-zelfproof-extractor.module");
const { getDomainConfiguration, generateStorageKey, generateHoldDomain } = require("./domain-registry.module");
const config = require("../../../Core/config");
const SessionModule = require("../../Session/modules/session.module");

/**
 * Tags Parts Module
 *
 * This module handles domain-specific operations for the Tags system.
 * It provides utilities for encryption, decryption, and domain-specific data processing.
 */

/**
 * Decrypt parameters for tag operations
 * @param {Object} params - Parameters to decrypt
 * @param {Object} authUser - Authenticated user
 * @returns {Object} - Decrypted parameters
 */
const decryptParams = async (params, authUser) => {
	if (params.removePGP) {
		return {
			face: params.faceBase64,
			password: params.password,
			mnemonic: params.mnemonic,
		};
	}

	const password = await SessionModule.sessionDecrypt(params.password || null, authUser);

	const mnemonic = await SessionModule.sessionDecrypt(params.mnemonic || null, authUser);

	const face = await SessionModule.sessionDecrypt(params.faceBase64 || null, authUser);

	return { password, mnemonic, face };
};

/**
 * Encrypt parameters for tag operations
 * @param {Object} params - Parameters to encrypt
 * @param {Object} authUser - Authenticated user
 * @returns {Object} - Encrypted parameters
 */
const encryptParams = async (params, authUser) => {
	const { faceBase64, password, metadata, tagName, domain } = params;

	// Get domain configuration
	const domainConfig = getDomainConfiguration(domain);
	if (!domainConfig) {
		throw new Error(`Domain '${domain}' is not supported`);
	}

	// Encrypt data
	const encryptedResult = await encrypt({
		faceBase64,
		password,
		metadata,
		verifierKey: config.zelfEncrypt.serverKey,
	});

	if (encryptedResult.error) {
		const error = new Error(encryptedResult.error.code);
		error.status = 409;
		throw error;
	}

	return {
		zelfProof: encryptedResult.zelfProof,
		zelfProofQRCode: encryptedResult.zelfProofQRCode,
		tagName,
		domain,
		domainConfig,
	};
};

/**
 * Preview tag data
 * @param {Object} params - Preview parameters
 * @param {Object} authUser - Authenticated user
 * @returns {Object} - Preview result
 */
const previewTag = async (params, authUser) => {
	const { zelfProof, tagName, domain } = params;

	// Get domain configuration
	const domainConfig = getDomainConfiguration(domain);
	if (!domainConfig) {
		throw new Error(`Domain '${domain}' is not supported`);
	}

	// Preview the data
	const previewResult = await preview({
		zelfProof,
		verifierKey: config.zelfEncrypt.serverKey,
	});

	return {
		preview: previewResult,
		tagName,
		domain,
		domainConfig,
	};
};

/**
 * Generate QR code for tag
 * @param {Object} params - QR code parameters
 * @param {Object} authUser - Authenticated user
 * @returns {Object} - QR code result
 */
const generateQRCode = async (params, authUser) => {
	const { zelfProof, tagName, domain } = params;

	// Get domain configuration
	const domainConfig = getDomainConfiguration(domain);
	if (!domainConfig) {
		throw new Error(`Domain '${domain}' is not supported`);
	}

	// Generate QR code
	const qrCodeResult = await encryptQRCode({
		zelfProof,
		verifierKey: config.zelfEncrypt.serverKey,
	});

	return {
		qrCode: qrCodeResult,
		tagName,
		domain,
		domainConfig,
	};
};

/**
 * Convert URL to base64
 * @param {string} url - URL to convert
 * @returns {string} - Base64 encoded data
 */
const urlToBase64 = async (url) => {
	try {
		const response = await fetch(url);
		const buffer = await response.arrayBuffer();
		const base64 = Buffer.from(buffer).toString("base64");
		return `data:image/png;base64,${base64}`;
	} catch (error) {
		console.error("Error converting URL to base64:", error);
		return null;
	}
};

/**
 * Generate domain-specific hold domain
 * @param {string} domain - Domain name
 * @param {string} name - Tag name
 * @returns {string} - Hold domain name
 */
const generateDomainHoldDomain = (domain, name) => {
	return generateHoldDomain(domain, name);
};

/**
 * Validate domain-specific data
 * @param {Object} data - Data to validate
 * @param {string} domain - Domain name
 * @returns {Object} - Validation result
 */
const validateDomainData = (data, domain) => {
	// Get domain configuration
	const domainConfig = getDomainConfiguration(domain);
	if (!domainConfig) {
		return { valid: false, error: `Domain '${domain}' is not supported` };
	}

	// Check required fields
	const requiredFields = ["tagName", "domain", "publicData", "privateData"];
	for (const field of requiredFields) {
		if (!data[field]) {
			return { valid: false, error: `Missing required field: ${field}` };
		}
	}

	// Check domain-specific validation
	if (data.domain !== domain) {
		return { valid: false, error: "Domain mismatch" };
	}

	// Check tag name format
	const tagNameParts = data.tagName.split(".");
	if (tagNameParts.length < 2 || tagNameParts[tagNameParts.length - 1] !== domain) {
		return { valid: false, error: "Invalid tag name format" };
	}

	return { valid: true };
};

/**
 * Process domain-specific metadata
 * @param {Object} metadata - Metadata to process
 * @param {string} domain - Domain name
 * @returns {Object} - Processed metadata
 */
const processDomainMetadata = (metadata, domain) => {
	// Get domain configuration
	const domainConfig = getDomainConfiguration(domain);
	if (!domainConfig) {
		throw new Error(`Domain '${domain}' is not supported`);
	}

	// Generate domain-specific storage key
	const storageKey = generateStorageKey(domain, metadata.tagName);

	// Process metadata with domain-specific information
	const processedMetadata = {
		...metadata,
		storageKey,
		domain,
		domainConfig: domainConfig.type,
		timestamp: new Date().toISOString(),
		version: "1.0.0",
	};

	// Add domain-specific features
	if (domainConfig.features) {
		processedMetadata.features = domainConfig.features;
	}

	// Add domain-specific limits
	if (domainConfig.limits) {
		processedMetadata.limits = domainConfig.limits;
	}

	// Add domain-specific payment info
	if (domainConfig.payment) {
		processedMetadata.payment = domainConfig.payment;
	}

	return processedMetadata;
};

/**
 * Create domain-specific tag object
 * @param {Object} params - Tag parameters
 * @param {string} params.tagName - Tag name
 * @param {string} params.domain - Domain name
 * @param {Object} params.publicData - Public data
 * @param {Object} params.privateData - Private data
 * @param {Object} authUser - Authenticated user
 * @returns {Object} - Tag object
 */
const createTagObject = async (params, authUser) => {
	const { tagName, domain, publicData, privateData } = params;

	// Get domain configuration
	const domainConfig = getDomainConfiguration(domain);
	if (!domainConfig) {
		throw new Error(`Domain '${domain}' is not supported`);
	}

	// Generate domain-specific storage key
	const storageKey = generateStorageKey(domain, tagName);

	// Create tag object
	const tagObject = {
		publicData: {
			...publicData,
			tagName: `${tagName}.${domain}`,
			domain,
			storageKey,
			domainConfig: domainConfig.type,
			timestamp: new Date().toISOString(),
		},
		privateData: {
			...privateData,
			domain,
			storageKey,
		},
	};

	// Validate the tag object
	const validation = validateDomainData(tagObject, domain);
	if (!validation.valid) {
		throw new Error(validation.error);
	}

	return tagObject;
};

/**
 * Create domain-specific hold object
 * @param {Object} params - Hold parameters
 * @param {string} params.tagName - Tag name
 * @param {string} params.domain - Domain name
 * @param {Object} params.publicData - Public data
 * @param {Object} params.privateData - Private data
 * @param {Object} authUser - Authenticated user
 * @returns {Object} - Hold object
 */
const createHoldObject = async (params, authUser) => {
	const { tagName, domain, publicData, privateData } = params;

	// Get domain configuration
	const domainConfig = getDomainConfiguration(domain);
	if (!domainConfig) {
		throw new Error(`Domain '${domain}' is not supported`);
	}

	// Generate hold domain name
	const holdDomain = generateHoldDomain(domain, tagName);
	const holdStorageKey = generateStorageKey(domain, `${tagName}${domainConfig.holdSuffix}`);

	// Create hold object
	const holdObject = {
		publicData: {
			...publicData,
			tagName: holdDomain,
			domain,
			storageKey: holdStorageKey,
			domainConfig: domainConfig.type,
			holdSuffix: domainConfig.holdSuffix,
			timestamp: new Date().toISOString(),
			status: "hold",
		},
		privateData: {
			...privateData,
			domain,
			storageKey: holdStorageKey,
			holdSuffix: domainConfig.holdSuffix,
		},
	};

	return holdObject;
};

const assignProperties = (tagObject, dataToEncrypt, addresses, payload, domainConfig) => {
	const { referralTagObject } = payload;

	const referralTagName = referralTagObject?.publicData?.[domainConfig.storage.keyPrefix].split(".")[0];

	const { price, reward, discount, discountType } = domainConfig.getPrice(
		tagObject[domainConfig.storage.keyPrefix],
		"1",
		referralTagName ? `${referralTagName}.${domainConfig.name}` : ""
	);

	const { eth, btc, solana, sui } = addresses;

	tagObject.price = price;
	tagObject.reward = reward;
	tagObject.discount = discount;
	tagObject.discountType = discountType;
	tagObject.ethAddress = eth.address;
	tagObject.btcAddress = btc.address;
	tagObject.solanaAddress = solana.address;
	tagObject.suiAddress = sui.address;
	tagObject.hasPassword = `${Boolean(payload.password)}`;
};

const _generateZelfProof = async (dataToEncrypt, tagObject) => {
	const zelfProofQRCode = (await encryptQRCode(dataToEncrypt))?.zelfQR;

	tagObject.zelfProof = await QRZelfProofExtractor.extractZelfProofFromQR(zelfProofQRCode);

	tagObject.zelfProofQRCode = zelfProofQRCode;
};

const getFullTagName = (tagName, domain) => {
	if (tagName.includes(".")) return tagName;

	return `${tagName}.${domain}`;
};

module.exports = {
	decryptParams,
	encryptParams,
	previewTag,
	generateQRCode,
	urlToBase64,
	generateDomainHoldDomain,
	validateDomainData,
	processDomainMetadata,
	createTagObject,
	createHoldObject,
	assignProperties,
	generateZelfProof: _generateZelfProof,
	getFullTagName,
};
