const { getDomainConfig, getDomainPrice, getDomainPaymentMethods, getDomainCurrencies, getDomainLimits } = require("../config/supported-domains");
const TagsIpfsModule = require("./tags-ipfs.module");
const TagsPartsModule = require("./tags-parts.module");
const { createEthWallet } = require("../../Wallet/modules/eth");
const { createBTCWallet } = require("../../Wallet/modules/btc");
const { createSolanaWallet } = require("../../Wallet/modules/solana");
const { generateMnemonic } = require("../../Wallet/modules/helpers");
const { createCoinbaseCharge } = require("../../coinbase/modules/coinbase_commerce.module");
const moment = require("moment");
const { searchTag } = require("./tags.module");
const { getTickerPrice } = require("../../binance/modules/binance.module");
const jwt = require("jsonwebtoken");
const config = require("../../../Core/config");
const WalrusModule = require("../../Walrus/modules/walrus.module");
const TagsArweaveModule = require("./tags-arweave.module");

/**
 * Validate currency for domain
 * @param {string} domain - Domain name
 * @param {string} currency - Currency code
 * @returns {Object} - Validation result
 */
const validateCurrency = (domain, currency) => {
	const domainConfig = getDomainConfig(domain);

	if (!domainConfig) {
		return { valid: false, error: "Domain not supported" };
	}

	const supportedCurrencies = getDomainCurrencies(domain);
	const isValid = supportedCurrencies.includes(currency);

	return {
		valid: isValid,
		error: isValid ? null : `Currency '${currency}' not supported for domain '${domain}'`,
		supportedCurrencies,
	};
};

/**
 * Get payment options
 * @param {string} tagName
 * @param {string} domain
 * @param {string} duration
 * @param {Object} authUser
 */
const getPaymentOptions = async (tagName, domain, duration, authUser) => {
	const domainConfig = getDomainConfig(domain);

	// Get current tag data
	const tagData = await searchTag({ tagName, domain, domainConfig }, authUser);

	if (tagData.available) throw new Error("404:tag_not_found");

	const tagObject = tagData.tagObject;

	const priceDetails = domainConfig.getPrice(tagName, duration, tagObject.publicData.referralTagName);

	const zelfPayCount = tagData.ipfs?.length || tagData.arweave?.length;

	const renewTagPayObject = await _fetchTagPayRecord(
		{
			tagName: `${tagData.tagName}.${domain}`,
			publicData: tagObject.publicData,
		},
		zelfPayCount,
		priceDetails,
		domainConfig
	);

	if (!renewTagPayObject) {
		const error = new Error("tagPayRecord_not_found");
		error.status = 404;
		throw error;
	}

	const paymentAddress = {
		ethAddress: renewTagPayObject?.publicData?.ethAddress,
		avalancheAddress: renewTagPayObject?.publicData?.ethAddress,
		btcAddress: renewTagPayObject?.publicData?.btcAddress,
		solanaAddress: renewTagPayObject?.publicData?.solanaAddress,
	};

	const prices = {
		ETH: null,
		SOL: null,
		BTC: null,
		AVAX: null,
	};

	if (domainConfig?.tags?.payment?.currencies?.includes("ETH")) {
		prices.ETH = await calculateCryptoValue("ETH", priceDetails.price);
	}

	if (domainConfig?.tags?.payment?.currencies?.includes("SOL")) {
		prices.SOL = await calculateCryptoValue("SOL", priceDetails.price);
	}

	if (domainConfig?.tags?.payment?.currencies?.includes("BTC")) {
		prices.BTC = await calculateCryptoValue("BTC", priceDetails.price);
	}

	if (domainConfig?.tags?.payment?.currencies?.includes("AVAX")) {
		prices.AVAX = await calculateCryptoValue("AVAX", priceDetails.price);
	}

	const returnData = {
		paymentAddress,
		prices,
		tagName: `${tagData.tagName}.${domain}`,
		tagPayName: `${tagData.tagName}.${domain}pay`,
		expiresAt: tagObject.publicData.expiresAt,
		initiatedAt: moment().unix(),
		ttl: moment().add("2", "hours").unix(),
		duration: parseInt(duration || 1),
		coinbase_hosted_url: renewTagPayObject.publicData?.coinbase_hosted_url,
		coinbase_expires_at: renewTagPayObject.publicData?.coinbase_expires_at,
		count: parseInt(renewTagPayObject.publicData?.count),
		publicData: renewTagPayObject.publicData,
		payment: {
			registeredAt: renewTagPayObject.publicData?.registeredAt,
			expiresAt: renewTagPayObject.publicData?.expiresAt,
			referralTagName: tagObject.publicData?.referralTagName,
			referralSolanaAddress: tagObject.publicData?.referralSolanaAddress,
		},
	};

	const signedDataPrice = jwt.sign(returnData, config.JWT_SECRET);

	return {
		...returnData,
		signedDataPrice,
	};
};

const calculateCryptoValue = async (token = "ETH", price_) => {
	try {
		const { price } = await getTickerPrice({ symbol: `${token}` });

		if (!price) throw new Error(`Unable to fetch ${token} price`);

		const cryptoValue = price_ / price;

		return {
			amountToSend: parseFloat(cryptoValue.toFixed(7)),
			ratePriceInUSD: parseFloat(parseFloat(price).toFixed(5)),
			price: price_,
		};
	} catch (error) {
		throw error;
	}
};

/**
 * check if the tag pay object requires an update
 * @param {Object} tagPayObject
 * @param {Object} priceDetails
 * @returns {boolean} - true if the tag pay object requires an update, false otherwise
 */
const _requiresUpdate = async (tagPayObject, priceDetails, tagObject) => {
	const sameDuration = !tagPayObject || tagPayObject?.publicData?.duration == priceDetails.duration;

	if (!tagPayObject) return false;

	const registeredAtCondition = Boolean(
		tagObject.publicData.registeredAt &&
			tagPayObject?.publicData?.registeredAt &&
			moment(tagObject.publicData.registeredAt).isAfter(moment(tagPayObject?.publicData?.registeredAt))
	);

	if (registeredAtCondition) return true;

	if (!sameDuration && tagPayObject?.zelfProofQRCode) {
		await TagsIpfsModule.unPinFiles([tagPayObject.ipfsId]);

		return true;
	}

	// now check if the coinbase_expires_at is before the current date
	if (tagPayObject?.publicData?.coinbase_expires_at && moment(tagPayObject.publicData.coinbase_expires_at).isBefore(moment())) {
		await TagsIpfsModule.unPinFiles([tagPayObject.ipfsId]);

		return true;
	}
};

/**
 * fetch the tag pay record
 * @param {Object} tagObject
 * @param {number} currentCount
 * @param {Object} priceDetails
 * @param {Object} domainConfig
 * @returns {Object} - tag pay object
 */
const _fetchTagPayRecord = async (tagObject, currentCount, priceDetails, domainConfig) => {
	const { tagName } = tagObject;

	const tagPayName = `${tagName}pay`;

	let tagPayRecords = await searchTag({ tagName: tagPayName, domainConfig, environment: "ipfs", type: "mainnet" });

	const tagPayObject = tagPayRecords.tagObject || {};

	const requiresUpdate = await _requiresUpdate(tagPayObject, priceDetails, tagObject);

	if (!tagPayObject?.id || requiresUpdate) {
		const newTagPayObject = await createTagPay(
			{
				...tagPayObject,
				tagPayName,
			},
			tagObject,
			priceDetails,
			currentCount + 1,
			domainConfig
		);

		return newTagPayObject.tagObject;
	}

	return tagPayObject;
};

/**
 * create coinbase charge
 * @param {string} tagPayName
 * @param {Object} priceDetails
 * @param {number} currentCount
 * @param {Object} domainConfig
 * @returns {Object} - Coinbase charge object
 */
const _createCoinbaseCharge = async (tagPayName, priceDetails, currentCount, { ethAddress, btcAddress, solanaAddress }) => {
	const coinbasePayload = {
		name: tagPayName,
		description: `Purchase of the Zelf Name > ${tagPayName} for $${priceDetails.price}`,
		pricing_type: "fixed_price",
		local_price: {
			amount: `${priceDetails.price}`,
			currency: "USD",
		},
		metadata: {
			zelfName: tagPayName,
			ethAddress: ethAddress,
			btcAddress: btcAddress,
			solanaAddress: solanaAddress,
			count: `${currentCount}`,
		},
		redirect_url: "https://payment.zelf.world/checkout",
		cancel_url: "https://payment.zelf.world/checkout",
	};

	const coinbaseCharge = await createCoinbaseCharge(coinbasePayload);

	return coinbaseCharge;
};

/**
 * create tag pay
 * @param {string} tagPayName
 * @param {Object} tagObject
 * @param {Object} priceDetails
 * @param {number} currentCount
 * @param {Object} domainConfig
 * @returns {Object} - Tag pay object
 */
const createTagPay = async (tagPayObject, tagObject, priceDetails, currentCount, domainConfig) => {
	let coinbaseCharge = null;

	const mnemonic = generateMnemonic(12);
	const jsonfile = require("../../../config/0012589021.json");
	const eth = createEthWallet(mnemonic);
	const btc = createBTCWallet(mnemonic);
	const solana = await createSolanaWallet(mnemonic);

	const dataToEncrypt = {
		publicData: {
			ethAddress: eth.address,
			solanaAddress: solana.address,
			btcAddress: btc.address,
			customerZelfName: tagObject.tagName,
			[domainConfig.getTagKey()]: tagPayObject.tagPayName,
			currentCount: `${currentCount}`,
		},
		metadata: {
			mnemonic,
		},
		faceBase64: jsonfile.faceBase64,
		password: jsonfile.password,
		_id: tagPayObject.tagPayName,
		tolerance: "REGULAR",
		addServerPassword: true,
	};

	await TagsPartsModule.generateZelfProof(dataToEncrypt, tagPayObject);

	if (!tagPayObject.publicData) tagPayObject.publicData = {};

	tagPayObject.publicData.ethAddress = eth.address;
	tagPayObject.publicData.btcAddress = btc.address;
	tagPayObject.publicData.solanaAddress = solana.address;

	if (domainConfig?.tags?.payment?.methods?.includes("coinbase")) {
		coinbaseCharge = await _createCoinbaseCharge(tagPayObject.tagPayName, priceDetails, currentCount, {
			ethAddress: tagPayObject.publicData.ethAddress,
			btcAddress: tagPayObject.publicData.btcAddress,
			solanaAddress: tagPayObject.publicData.solanaAddress,
		});
	}

	const payload = {
		base64: tagPayObject.zelfProofQRCode,
		name: tagPayObject.tagPayName,
		metadata: {
			hasPassword: tagObject.publicData.hasPassword,
			type: "mainnet",
			ethAddress: tagPayObject.publicData.ethAddress,
			solanaAddress: tagPayObject.publicData.solanaAddress,
			btcAddress: tagPayObject.publicData.btcAddress,
			[domainConfig.getTagKey()]: tagPayObject.tagPayName,
			extraParams: JSON.stringify({
				expiresAt: moment().add(100, "year").format("YYYY-MM-DD HH:mm:ss"),
				registeredAt: moment().format("YYYY-MM-DD HH:mm:ss"),
				price: priceDetails.price,
				duration: priceDetails.duration,
				count: `${currentCount}`,
			}),
		},
		pinIt: true,
	};

	if (coinbaseCharge) {
		payload.metadata.coinBase = JSON.stringify({
			hosted_url: coinbaseCharge.hosted_url,
			expires_at: coinbaseCharge.expires_at,
		});
	}

	let ipfs = await TagsIpfsModule.insert(payload, { pro: true });

	ipfs = TagsIpfsModule.formatRecord(ipfs);

	return {
		ipfs: [ipfs],
		tagObject: {
			...ipfs,
			zelfProofQRCode: tagObject.zelfProofQRCode,
			zelfProof: tagObject.zelfProof,
		},
		available: false,
		arweave: [],
	};
};

/**
 * Get pricing table for all domains
 * @returns {Object} - Pricing table
 */
const getPricingTable = () => {
	const pricingTable = {};

	Object.entries(require("../config/supported-domains").SUPPORTED_DOMAINS).forEach(([domain, config]) => {
		pricingTable[domain] = {
			basePrice: config.price,
			yearly: getDomainPrice(domain, "yearly"),
			lifetime: getDomainPrice(domain, "lifetime"),
			currencies: getDomainCurrencies(domain),
			methods: getDomainPaymentMethods(domain),
			discounts: config.payment?.discounts || {},
			limits: getDomainLimits(domain),
		};
	});

	return pricingTable;
};

const buildMetadata = (params, tagObject, domainConfig) => {
	tagObject.fullTagName = `${params.tagName}.${params.domain}`;

	const storageKey = domainConfig.getTagKey();
	const domain = tagObject.domain || "zelf";
	const price = params.price || tagObject.publicData.price;
	const duration = params.duration || tagObject.publicData.duration;

	const metadata = {
		[storageKey]: tagObject.fullTagName,
		domain,
		ethAddress: tagObject.publicData.ethAddress,
		solanaAddress: tagObject.publicData.solanaAddress,
		btcAddress: tagObject.publicData.btcAddress,
		extraParams: {
			origin: tagObject.publicData.origin || "online",
			price,
			duration: tagObject.publicData.duration ? `${Number(tagObject.publicData.duration) + Number(duration)}` : duration,
			registeredAt: moment().format("YYYY-MM-DD HH:mm:ss"),
			renewedAt: tagObject.publicData.type === "mainnet" ? moment().format("YYYY-MM-DD HH:mm:ss") : undefined,
			expiresAt: moment(tagObject.publicData.expiresAt).add(duration, "year").format("YYYY-MM-DD HH:mm:ss"),
			type: "mainnet",
			hasPassword: tagObject.publicData.hasPassword,
			eventID: params.eventID || undefined,
			eventPrice: params.eventPrice || undefined,
		},
		suiAddress: tagObject.publicData.suiAddress,
	};

	if (tagObject.publicData.referralTagName) {
		metadata.referral = {
			tagName: tagObject.publicData.referralTagName,
			solanaAddress: tagObject.publicData.referralSolanaAddress,
		};

		metadata.referral = JSON.stringify(metadata.referral);
	}

	metadata.extraParams = JSON.stringify(metadata.extraParams);

	return { metadata, fullTagName: tagObject.fullTagName };
};

const storeInWalrus = async (tagObject, domainConfig, metadata) => {
	tagObject.walrus = await WalrusModule.tagRegistration(
		tagObject.zelfProofQRCode,
		{ hasPassword: metadata.hasPassword, zelfProof: metadata.zelfProof, publicData: metadata },
		domainConfig
	);

	tagObject.walrus = tagObject.walrus?.blobId;

	return tagObject.walrus;
};

const storeInIPFS = async (tagObject, domainConfig, metadata) => {
	const deletedIpfsRecord = await TagsIpfsModule.deleteFiles([tagObject.ipfsId || tagObject.id]);

	tagObject.ipfs = await TagsIpfsModule.insert(
		{
			base64: tagObject.zelfProofQRCode,
			name: tagObject.fullTagName,
			metadata,
			pinIt: true,
		},
		{ pro: true }
	);

	tagObject.ipfs = TagsIpfsModule.formatRecord(tagObject.ipfs);

	return tagObject.ipfs;
};

const storeInArweave = async (tagObject, domainConfig, metadata) => {
	tagObject.arweave = await TagsArweaveModule.tagRegistration(tagObject.zelfProofQRCode, {
		hasPassword: metadata.hasPassword,
		zelfProof: metadata.zelfProof,
		publicData: metadata,
		fileName: tagObject.tagName,
	});

	return tagObject.arweave;
};

module.exports = {
	validateCurrency,
	getPaymentOptions,
	getPricingTable,
	buildMetadata,
	storeInWalrus,
	storeInIPFS,
	storeInArweave,
};
