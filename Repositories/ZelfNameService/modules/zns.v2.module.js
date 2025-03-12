const moment = require("moment");
const SessionModule = require("../../Session/modules/session.module");
const ArweaveModule = require("../../Arweave/modules/arweave.module");
const ZNSPartsModule = require("./zns-parts.module");
const arweaveUrl = `https://arweave.zelf.world`;
const explorerUrl = `https://viewblock.io/arweave/tx`;
const { generateMnemonic } = require("../../Wallet/modules/helpers");
const { createEthWallet } = require("../../Wallet/modules/eth");
const { createSolanaWallet } = require("../../Wallet/modules/solana");
const { createBTCWallet } = require("../../Wallet/modules/btc");
const { getTickerPrice } = require("../../binance/modules/binance.module");
const { encrypt, preview, encryptQR } = require("../../Wallet/modules/encryption");
const OfflineProofModule = require("../../Mina/offline-proof");
const IPFSModule = require("../../IPFS/modules/ipfs.module");
const { createCoinbaseCharge } = require("../../coinbase/modules/coinbase_commerce.module");
const config = require("../../../Core/config");
const jwt = require("jsonwebtoken");
const { createUnderName } = require("./undernames.module");

/**
 * lease zelfName
 * @param {Object} params
 * @param {Object} authUser
 */
const leaseZelfName = async (params, authUser) => {
	const { zelfName, duration, referralZelfName } = params;

	await _findDuplicatedZelfName(zelfName, "both", authUser);

	const referralZelfNameObject = await _validateReferral(referralZelfName, authUser);

	const { eth, btc, solana, zkProof, mnemonic, face, password } = await _createWalletsFromPhrase(params, authUser);

	const zelfNameObject = {};

	const dataToEncrypt = {
		publicData: {
			ethAddress: eth.address,
			solanaAddress: solana.address,
			btcAddress: btc.address,
			zelfName,
			origin: "online",
		},
		metadata: {
			mnemonic,
			solanaSecretKey: solana.secretKey,
			zkProof,
		},
		faceBase64: face,
		password,
		_id: zelfName,
		tolerance: params.tolerance,
		addServerPassword: Boolean(params.addServerPassword),
	};

	zelfNameObject.zelfName = zelfName;

	const { price, reward, priceWithoutDiscount, discount, discountType } = ZNSPartsModule.calculateZelfNamePrice(
		zelfName.length - 5,
		duration,
		referralZelfName
	);

	zelfNameObject.price = price;
	zelfNameObject.reward = reward;
	zelfNameObject.discount = discount;
	zelfNameObject.discountType = discountType;
	zelfNameObject.publicData = dataToEncrypt.publicData;
	zelfNameObject.ethAddress = eth.address;
	zelfNameObject.btcAddress = btc.address;
	zelfNameObject.solanaAddress = solana.address;
	zelfNameObject.hasPassword = `${Boolean(password)}`;
	zelfNameObject.metadata = params.previewZelfProof ? dataToEncrypt.metadata : undefined;
	zelfNameObject.duration = duration;
	zelfNameObject.zelfProof = await encrypt(dataToEncrypt);

	if (!zelfNameObject.zelfProof) throw new Error("409:Wallet_could_not_be_encrypted");

	zelfNameObject.image = await encryptQR(dataToEncrypt);

	const { encryptedMessage, privateKey } = await SessionModule.walletEncrypt(
		{ mnemonic, zkProof, solanaPrivateKey: solana.secretKey },
		eth.address,
		password
	);

	if (zelfNameObject.price === 0) {
		await _confirmFreeZelfName(zelfNameObject, referralZelfNameObject, authUser);
	} else {
		await _saveHoldZelfNameInIPFS(zelfNameObject, referralZelfNameObject, password, authUser);
	}

	return {
		...zelfNameObject,
		hasPassword: Boolean(password),
		pgp: { encryptedMessage, privateKey },
		durationToken: jwt.sign(
			{
				zelfName,
				exp: moment().add(12, "hour").unix(),
			},
			config.JWT_SECRET
		),
	};
};

const _confirmFreeZelfName = async (zelfNameObject, referralZelfNameObject, authUser) => {
	const metadata = {
		hasPassword: zelfNameObject.hasPassword,
		zelfProof: zelfNameObject.zelfProof,
		zelfName: zelfNameObject.zelfName,
		ethAddress: zelfNameObject.ethAddress,
		solanaAddress: zelfNameObject.solanaAddress,
		btcAddress: zelfNameObject.btcAddress,
		extraParams: {
			price: zelfNameObject.price,
			duration: zelfNameObject.duration || 1,
			registeredAt: moment().format("YYYY-MM-DD HH:mm:ss"),
			expiresAt: moment().add(1, "year").format("YYYY-MM-DD HH:mm:ss"),
		},
		type: "mainnet",
	};

	if (referralZelfNameObject) {
		metadata.extraParams.referralZelfName = referralZelfNameObject.publicData?.zelfName || referralZelfNameObject.metadata?.zelfName;

		metadata.extraParams.referralSolanaAddress =
			referralZelfNameObject.publicData?.solanaAddress || referralZelfNameObject.metadata?.solanaAddress;
	}

	metadata.extraParams = JSON.stringify(metadata.extraParams);

	zelfNameObject.ipfs = await IPFSModule.insert(
		{
			base64: zelfNameObject.image,
			name: zelfNameObject.zelfName,
			metadata,
			pinIt: true,
		},
		{ ...authUser, pro: true }
	);

	zelfNameObject.ipfs = await ZNSPartsModule.formatIPFSRecord(zelfNameObject.ipfs, true);

	delete zelfNameObject.ipfs.publicData.zelfProof;

	zelfNameObject.publicData = Object.assign(zelfNameObject.publicData, zelfNameObject.ipfs.publicData);

	zelfNameObject.arweave = await ArweaveModule.zelfNameRegistration(zelfNameObject.image, {
		hasPassword: metadata.hasPassword,
		zelfProof: metadata.zelfProof,
		publicData: metadata,
	});

	// create undername
	// zelfNameObject.undername = await createUnderName({
	// 	parentName: "zelf",
	// 	undername: zelfNameObject.zelfName,
	// 	publicData: zelfNameObject.publicData,
	// });
};

const _saveHoldZelfNameInIPFS = async (zelfNameObject, referralZelfNameObject, password, authUser) => {
	const holdName = `${zelfNameObject.zelfName}.hold`;

	const metadata = {
		zelfProof: zelfNameObject.zelfProof,
		zelfName: holdName,
		hasPassword: zelfNameObject.hasPassword,
		payment: {
			price: zelfNameObject.price,
			duration: zelfNameObject.duration || 1,
			registeredAt: moment().format("YYYY-MM-DD HH:mm:ss"),
		},
		addresses: {
			ethAddress: zelfNameObject.ethAddress,
			btcAddress: zelfNameObject.btcAddress,
			solanaAddress: zelfNameObject.solanaAddress,
		},
		expiresAt: moment().add(30, "day").format("YYYY-MM-DD HH:mm:ss"),
		type: "hold",
	};

	if (referralZelfNameObject) {
		metadata.payment.referralZelfName = referralZelfNameObject.publicData?.zelfName || referralZelfNameObject.metadata?.zelfName;

		metadata.payment.referralSolanaAddress = referralZelfNameObject.publicData?.solanaAddress || referralZelfNameObject.metadata?.solanaAddress;
	}

	metadata.payment = JSON.stringify(metadata.payment);
	metadata.addresses = JSON.stringify(metadata.addresses);

	zelfNameObject.ipfs = await IPFSModule.insert(
		{
			base64: zelfNameObject.image,
			name: holdName,
			metadata,
			pinIt: true,
		},
		{ ...authUser, pro: true }
	);

	zelfNameObject.ipfs = await ZNSPartsModule.formatIPFSRecord(zelfNameObject.ipfs, true);

	delete zelfNameObject.ipfs.publicData.zelfProof;

	zelfNameObject.publicData = Object.assign(zelfNameObject.publicData, zelfNameObject.ipfs.publicData);

	// create undername
	// zelfNameObject.undername = await createUnderName({
	// 	parentName: "zelf",
	// 	undername: holdName,
	// 	publicData: zelfNameObject.publicData,
	// });
};

/**
 *
 * @param {*} params
 * @param {*} authUser
 */
const searchZelfName = async (params, authUser) => {
	const query = params.zelfName ? { key: "zelfName", value: params.zelfName } : { key: params.key, value: params.value };

	if (params.duration) query.duration = params.duration;

	let finalResult = null;

	try {
		const searchResults = await ArweaveModule.search(params.zelfName || params.key === "zelfName" ? params.value : null, query);

		if (searchResults?.available) {
			const error = new Error("not_found_in_arweave");

			error.status = 404;

			throw error;
		}

		const zelfNames = [];

		for (let index = 0; index < searchResults.length; index++) {
			const zelfNameObject = await ZNSPartsModule.formatArweaveSearchResult(searchResults[index]);

			zelfNames.push(zelfNameObject);
		}

		finalResult = {
			arweave: zelfNames,
			ipfs: await _searchInIPFS(params.environment, query, authUser, true),
		};
	} catch (exception) {
		console.error({ exception: exception });

		finalResult = await _searchInIPFS(params.environment, query, authUser);
	}

	return finalResult;
};

const _retriveFromIPFSByEnvironment = async (ipfsRecords, environment, query, authUser) => {
	switch (environment) {
		case "hold":
			ipfsRecords.push(
				...(await IPFSModule.get(
					{
						key: query.key || "zelfName",
						value: `${query.value || query.zelfName}.hold`,
					},
					authUser
				))
			);
			break;
		case "mainnet":
			ipfsRecords.push(...(await IPFSModule.get(query, authUser)));
			break;

		default:
			try {
				ipfsRecords.push(...(await IPFSModule.get(query, authUser)));
			} catch (exception) {
				console.error({ mainNetIPFSError: exception });
			}

			try {
				ipfsRecords.push(
					...(await IPFSModule.get(
						{
							key: query.key || "zelfName",
							value: `${query.value || query.zelfName}.hold`,
						},
						authUser
					))
				);
			} catch (exception) {
				console.error({ holdIPFSError: exception });
			}

			break;
	}

	await ZNSPartsModule.removeExpiredRecords(ipfsRecords);
};

/**
 * search in IPFS
 * @param {Object} params
 * @param {Object} authUser
 * @author Miguel Trevino
 */
const _searchInIPFS = async (environment = "both", query, authUser, foundInArweave) => {
	const zelfName = query.value || query.zelfName;

	const { price, reward } = zelfName.includes(".zelf")
		? ZNSPartsModule.calculateZelfNamePrice(zelfName.split(".zelf")[0].length, query.duration)
		: { price: 0, reward: 0 };

	try {
		let ipfsRecords = [];

		await _retriveFromIPFSByEnvironment(ipfsRecords, environment, query, authUser);

		if (!ipfsRecords.length) {
			return foundInArweave
				? []
				: zelfName && zelfName.includes(".zelf")
				? {
						price,
						reward,
						zelfName,
						available: true,
				  }
				: null;
		}

		const zelfNamesInIPFS = [];

		for (let index = 0; index < ipfsRecords.length; index++) {
			const ipfsRecord = ipfsRecords[index];

			if (environment === "both") {
				zelfNamesInIPFS.push(await ZNSPartsModule.formatIPFSRecord(ipfsRecord, foundInArweave));

				continue;
			}

			if (
				(environment === "hold" && ipfsRecord.metadata.keyvalues.type === "hold") ||
				(environment === "mainnet" && (!ipfsRecord.metadata.keyvalues.type || ipfsRecord.metadata.keyvalues.type === "mainnet"))
			) {
				zelfNamesInIPFS.push(await ZNSPartsModule.formatIPFSRecord(ipfsRecord, foundInArweave));
			}
		}

		return foundInArweave ? zelfNamesInIPFS : { ipfs: zelfNamesInIPFS };
	} catch (exception) {
		console.error({ _searchInIPFS_exception: exception });

		return foundInArweave
			? []
			: query.key === "zelfName"
			? {
					price,
					reward,
					zelfName,
					available: true,
			  }
			: null;
	}
};

const _createWalletsFromPhrase = async (params, authUser) => {
	const { face, password, mnemonic } = await ZNSPartsModule.decryptParams(params, authUser);

	const _mnemonic = params.type === "import" ? mnemonic : generateMnemonic(params.wordsCount);
	const wordsArray = _mnemonic.split(" ");
	if (wordsArray.length !== 12 && wordsArray.length !== 24) throw new Error("409:mnemonic_invalid");

	const eth = createEthWallet(_mnemonic);
	const btc = createBTCWallet(_mnemonic);
	const solana = await createSolanaWallet(_mnemonic);
	const zkProof = await OfflineProofModule.createProof(_mnemonic);

	return { eth, btc, solana, zkProof, mnemonic: _mnemonic, face, password };
};

const _findDuplicatedZelfName = async (zelfName, environment = "both", authUser, returnResults = false) => {
	const searchResult = await searchZelfName(
		{
			zelfName,
			environment,
		},
		authUser
	);

	if (searchResult.available) return null;

	if (returnResults) return searchResult;

	const error = new Error("zelfName_is_taken");

	error.status = 409;

	throw error;
};

const _validateReferral = async (referralZelfName, authUser) => {
	if (!referralZelfName) return;

	const searchResult = await searchZelfName(
		{
			zelfName: referralZelfName,
			environment: "mainnet",
		},
		authUser
	);

	let notFound = Boolean(searchResult.available);

	if (!notFound) return searchResult.ipfs?.length ? searchResult.ipfs[0] : searchResult.arweave[0];

	const error = new Error("zelfName_referring_you_not_found");

	error.status = 409;

	throw error;
};

/**
 * preview Zelf name
 * @param {String} zelfName
 * @param {Object} authUser
 */
const previewZelfName = async (params, authUser) => {
	try {
		let zelfNameObjects = await _findZelfName(
			{
				zelfName: params.zelfName,
				key: params.key,
				value: params.value,
			},
			params.environment,
			authUser
		);

		if (!Array.isArray(zelfNameObjects)) {
			zelfNameObjects = [zelfNameObjects];
		}

		for (let index = 0; index < zelfNameObjects.length; index++) {
			const zelfNameObject = zelfNameObjects[index];

			if (zelfNameObject.ipfs_pin_hash && zelfNameObject.publicData.arweaveId) {
				zelfNameObject.url = `${arweaveUrl}/${zelfNameObject.publicData.arweaveId}`;

				zelfNameObject.explorerUrl = `${explorerUrl}/${zelfNameObject.publicData.arweaveId}`;
			}
			getTickerPrice;
			zelfNameObject.source = zelfNameObject.ipfs_pin_hash ? "ipfs" : "arweave";

			zelfNameObject.preview = await preview({
				zelfProof: zelfNameObject.zelfProof,
			});
		}

		return zelfNameObjects;
	} catch (exception) {
		return await _previewWithIPFS(params, authUser);
	}
};

/**
 * preview with IPFS
 * @param {Object} params
 * @param {Object} authUser
 * @author Miguel Trevino
 */
const _previewWithIPFS = async (params, authUser) => {
	try {
		const searchResult = await _searchInIPFS(params.environment, params, { ...authUser, pro: true }, false);

		if (!searchResult || searchResult?.available) throw new Error("404:not_found");

		const zelfNameObject = searchResult.ipfs?.length ? searchResult.ipfs[0] : searchResult.arweave[0] || searchResult[0];

		zelfNameObject.preview = await preview({
			zelfProof: zelfNameObject.zelfProof,
		});

		return searchResult;
	} catch (exception) {
		console.error({ exception });

		const error = new Error("zelfName_not_found");

		error.status = 404;

		throw error;
	}
};

const _findZelfName = async (params, environment = "both", authUser) => {
	const { zelfName, key, value } = params;

	const searchResults = await searchZelfName(
		{
			zelfName,
			key,
			value,
			environment,
		},
		authUser
	);

	if (!searchResults.arweave?.length && !searchResults.ipfs?.length) {
		const error = new Error(`zelfName_not_found`);
		error.status = 404;
		throw error;
	}

	const inArweave = Boolean(searchResults.arweave?.length);

	if (environment === "both") {
		return inArweave ? searchResults.arweave : searchResults.ipfs || [];
	}

	return inArweave ? searchResults.arweave[0] : searchResults.ipfs[0];
};

const leaseOffline = async (params, authUser) => {
	const { zelfName, duration, zelfProof, zelfProofQRCode } = params;

	let mainnetRecord = null;
	let holdRecord = null;
	let zelfNameRecords = [];

	try {
		zelfNameRecords = await previewZelfName({ zelfName, environment: "both" }, authUser);
	} catch (exception) {}

	for (let index = 0; index < zelfNameRecords.length; index++) {
		const ipfsRecord = zelfNameRecords[index];

		if (ipfsRecord.publicData.type === "hold") holdRecord = ipfsRecord;

		if (ipfsRecord.publicData.type === "mainnet") mainnetRecord = ipfsRecord;
	}

	const _zelfProof = holdRecord?.publicData?.zelfProof || mainnetRecord?.publicData?.zelfProof;

	if (zelfNameRecords.length === 2 || mainnetRecord) {
		const error = new Error("zelfName_purchased_already");
		error.status = 409;
		throw error;
	}

	let _preview = holdRecord?.preview || mainnetRecord?.preview;

	const { price, reward } = ZNSPartsModule.calculateZelfNamePrice(zelfName.length - 5, duration);

	const zelfNameObject = {
		zelfName: `${zelfName}.hold`,
		zelfProof,
		image: zelfProofQRCode,
		price,
		reward,
	};

	if (!_preview) _preview = await preview({ zelfProof: zelfNameObject.zelfProof });

	if (!zelfName.includes(_preview.publicData.zelfName)) {
		const error = new Error("zelfName_does_not_match_in_zelfProof");
		error.status = 409;
		throw error;
	}

	if (_zelfProof && zelfProof !== _zelfProof) {
		const error = new Error("zelfProof_does_not_match_in_hold");
		error.status = 409;
		throw error;
	}

	if (holdRecord)
		return {
			existed: true,
			...holdRecord,
			zelfName,
			preview: _preview,
		};

	const coinbasePayload = {
		name: `${zelfName}`,
		description: `Purchase of the Zelf Name > ${zelfName} for $${zelfNameObject.price}`,
		pricing_type: "fixed_price",
		local_price: {
			amount: `${zelfNameObject.price}`,
			currency: "USD",
		},
		metadata: {
			zelfName,
			ethAddress: _preview.publicData.ethAddress,
			btcAddress: _preview.publicData.btcAddress,
			solanaAddress: _preview.publicData.solanaAddress,
		},
		redirect_url: "https://name.zelf.world/#/coinbase-success",
		cancel_url: "https://name.zelf.world/#/coinbase-cancel",
	};

	zelfNameObject.coinbaseCharge = await createCoinbaseCharge(coinbasePayload);

	zelfNameObject.ipfs = await IPFSModule.insert(
		{
			base64: zelfNameObject.image,
			name: zelfNameObject.zelfName,
			metadata: {
				zelfProof: zelfNameObject.zelfProof,
				zelfName: zelfNameObject.zelfName,
				duration: duration || 1,
				price: zelfNameObject.price,
				expiresAt: moment().add(30, "day").format("YYYY-MM-DD HH:mm:ss"),
				type: "hold",
				coinbase_hosted_url: zelfNameObject.coinbaseCharge.hosted_url,
				coinbase_expires_at: zelfNameObject.coinbaseCharge.expires_at,
			},
			pinIt: true,
		},
		{ ...authUser, pro: true }
	);

	return zelfNameObject;
};

const createZelfPay = async (zelfNameObject, authUser) => {
	// create link for coinbase
	const params = zelfNameObject.publicData || zelfNameObject.metadata;

	const zelfName = params.zelfName.split(".hold")[0];

	if (!zelfName) {
		const error = new Error("zelfName_not_found");
		error.status = 404;
		throw error;
	}

	const paymentName = `${zelfName}`.replace(".zelf", ".zelfpay");

	const mnemonic = generateMnemonic(12);
	const jsonfile = require("../../../config/0012589021.json");
	const eth = createEthWallet(mnemonic);
	const btc = createBTCWallet(mnemonic);
	const solana = await createSolanaWallet(mnemonic);
	const zkProof = await OfflineProofModule.createProof(mnemonic);

	const dataToEncrypt = {
		publicData: {
			ethAddress: eth.address,
			solanaAddress: solana.address,
			btcAddress: btc.address,
			customerZelfName: zelfNameObject.zelfName,
			zelfName: paymentName,
		},
		metadata: {
			mnemonic,
			zkProof,
		},
		faceBase64: jsonfile.faceBase64,
		password: jsonfile.password,
		_id: paymentName,
		tolerance: "REGULAR",
		addServerPassword: true,
	};

	const zelfProof = await encrypt(dataToEncrypt);

	const image = await encryptQR(dataToEncrypt);

	const coinbasePayload = {
		name: zelfName,
		description: `Purchase of the Zelf Name > ${zelfName} for $${params.price}`,
		pricing_type: "fixed_price",
		local_price: {
			amount: `${params.price}`,
			currency: "USD",
		},
		metadata: {
			zelfName: zelfName,
			ethAddress: params.ethAddress,
			btcAddress: params.btcAddress,
			solanaAddress: params.solanaAddress,
		},
		redirect_url: "https://payment.zelf.world/coinbase-success",
		cancel_url: "https://payment.zelf.world/coinbase-cancel",
	};

	const coinbaseCharge = await createCoinbaseCharge(coinbasePayload);

	const payload = {
		base64: image,
		name: paymentName,
		metadata: {
			hasPassword: zelfNameObject.hasPassword,
			zelfProof,
			expiresAt: moment().add(100, "year").format("YYYY-MM-DD HH:mm:ss"),
			type: "mainnet",
			addresses: JSON.stringify(dataToEncrypt.publicData),
			zelfName: paymentName,
			coinbase_hosted_url: coinbaseCharge.hosted_url,
			coinbase_expires_at: coinbaseCharge.expires_at,
		},
		pinIt: true,
	};

	const ipfs = await IPFSModule.insert(payload, { pro: true });

	const arweave = await ArweaveModule.zelfNameRegistration(image, {
		hasPassword: "true",
		zelfProof,
		publicData: {
			...dataToEncrypt.publicData,
			coinbase_hosted_url: coinbaseCharge.hosted_url,
			coinbase_expires_at: `${coinbaseCharge.expires_at}`,
			zelfName: paymentName,
			type: "mainnet",
			expiresAt: moment().add(100, "year").format("YYYY-MM-DD HH:mm:ss"),
		},
	});

	return { ipfs, arweave };
};

module.exports = {
	searchZelfName,
	leaseZelfName,
	leaseOffline,
	createZelfPay,
};
