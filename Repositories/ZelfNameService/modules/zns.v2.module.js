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
const { generateSuiWalletFromMnemonic } = require("../../Wallet/modules/sui");
const { decrypt, encrypt, preview, encryptQR } = require("../../Wallet/modules/encryption");
const OfflineProofModule = require("../../Mina/offline-proof");
const IPFSModule = require("../../IPFS/modules/ipfs.module");
const { createCoinbaseCharge, getCoinbaseCharge } = require("../../coinbase/modules/coinbase_commerce.module");
const config = require("../../../Core/config");
const jwt = require("jsonwebtoken");
const { confirmPayUniqueAddress } = require("../../purchase-zelf/modules/balance-checker.module");
const { addReferralReward, addPurchaseReward } = require("./zns-token.module");
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

	const decryptedParams = await ZNSPartsModule.decryptParams(params, authUser);

	const { face, password } = decryptedParams;

	const { eth, btc, solana, sui, zkProof, mnemonic } = await _createWalletsFromPhrase({
		...params,
		mnemonic: decryptedParams.mnemonic,
	});

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
		},
		faceBase64: face,
		password,
		_id: zelfName,
		tolerance: params.tolerance,
		addServerPassword: Boolean(params.addServerPassword),
	};

	const zelfNameObject = {
		zelfName,
		duration,
	};

	ZNSPartsModule.assignProperties(zelfNameObject, dataToEncrypt, { eth, btc, solana, sui }, { ...params, password });

	await ZNSPartsModule.generateZelfProof(dataToEncrypt, zelfNameObject);

	if (zelfNameObject.price === 0) {
		await _confirmFreeZelfName(zelfNameObject, referralZelfNameObject, authUser);
	} else {
		await _saveHoldZelfNameInIPFS(zelfNameObject, referralZelfNameObject, authUser);
	}

	return {
		...zelfNameObject,
		hasPassword: Boolean(password),
		pgp: await ZNSPartsModule.generatePGPKeys(
			dataToEncrypt,
			{
				eth,
				btc,
				solana,
				sui,
			},
			password
		),
	};
};

/**
 * decrypt zelfName
 * @param {Object} params
 * @param {Object} authUser
 */
const decryptZelfName = async (params, authUser) => {
	const zelfNameObjects = await _findZelfName({ zelfName: params.zelfName }, "both", authUser);
	const zelfNameObject = zelfNameObjects[0];

	const { face, password } = await _decryptParams(params, authUser);

	const decryptedZelfProof = await decrypt({
		addServerPassword: Boolean(params.addServerPassword),
		faceBase64: face,
		password,
		zelfProof: zelfNameObject.zelfProof || params.zelfProof,
	});

	if (decryptedZelfProof.error) {
		const error = new Error(decryptedZelfProof.error.code);

		error.status = 409;

		throw error;
	}

	const { mnemonic, zkProof, solanaSecretKey } = decryptedZelfProof.metadata;

	let sui = {};

	if (!zelfNameObject.publicData.suiAddress) {
		sui = await generateSuiWalletFromMnemonic(mnemonic);

		zelfNameObject.publicData.suiAddress = sui.address;
	}

	const { encryptedMessage, privateKey } = await SessionModule.walletEncrypt(
		{ mnemonic, zkProof, solanaSecretKey, suiSecretKey: sui.secretKey },
		zelfNameObject.publicData.ethAddress,
		password
	);

	return {
		hasPassword: Boolean(password),
		image: zelfNameObject.zelfProofQRCode,
		priv: config.env === "development" ? { mnemonic, zkProof, solanaSecretKey } : undefined,
		pgp: { encryptedMessage, privateKey },
		url: zelfNameObject.url,
		zelfName: zelfNameObject.publicData.zelfName,
		publicData: {
			...zelfNameObject.publicData,
			...decryptedZelfProof.publicData,
		},
		durationToken: jwt.sign(
			{
				zelfName: zelfNameObject.publicData.zelfName,
				exp: moment().add(1, "month").unix(),
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
			suiAddress: zelfNameObject.suiAddress,
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
};

const _saveHoldZelfNameInIPFS = async (zelfNameObject, referralZelfNameObject, authUser) => {
	const holdName = `${zelfNameObject.zelfName}.hold`;

	const metadata = {
		zelfProof: zelfNameObject.zelfProof,
		zelfName: holdName,
		hasPassword: zelfNameObject.hasPassword,
		ethAddress: zelfNameObject.ethAddress,
		btcAddress: zelfNameObject.btcAddress,
		solanaAddress: zelfNameObject.solanaAddress,
		extraParams: {
			origin: zelfNameObject.origin || "online",
			suiAddress: zelfNameObject.suiAddress,
			price: zelfNameObject.price,
			duration: zelfNameObject.duration || 1,
			registeredAt: moment().format("YYYY-MM-DD HH:mm:ss"),
			expiresAt: moment().add(30, "day").format("YYYY-MM-DD HH:mm:ss"),
		},
		type: "hold",
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
			name: holdName,
			metadata,
			pinIt: true,
		},
		{ ...authUser, pro: true }
	);

	zelfNameObject.ipfs = await ZNSPartsModule.formatIPFSRecord(zelfNameObject.ipfs, true);

	delete zelfNameObject.ipfs.publicData.zelfProof;

	zelfNameObject.publicData = Object.assign(zelfNameObject.publicData, zelfNameObject.ipfs.publicData);
};

/**
 *
 * @param {*} params
 * @param {*} authUser
 */
const searchZelfName = async (params, authUser) => {
	const query = params.zelfName ? { key: "zelfName", value: params.zelfName } : { key: params.key, value: params.value };

	query.value = query.key === "zelfName" ? query.value.toLowerCase() : query.value;

	if (params.duration) query.duration = params.duration;

	let finalResult = null;

	try {
		const searchResults = await ArweaveModule.search(params.zelfName || params.key === "zelfName" ? params.value : null, query);

		const zelfNames = await _returnFormattedArweaveRecords(searchResults);

		if (!zelfNames.length) {
			const error = new Error("not_found_in_arweave");
			error.status = 404;
			throw error;
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

		const zelfNamesInIPFS = await _returnFormattedIPFSRecords(ipfsRecords, foundInArweave);

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

const _returnFormattedArweaveRecords = async (searchResults) => {
	if (searchResults?.available) return [];

	const zelfNames = [];

	const now = moment();

	const hideRecordsWithoutRegisteredAt = Boolean(searchResults.length >= 2);

	for (let index = 0; index < searchResults.length; index++) {
		const zelfNameObject = await ZNSPartsModule.formatArweaveSearchResult(searchResults[index]);

		if (hideRecordsWithoutRegisteredAt && !zelfNameObject.publicData.registeredAt) continue;

		const expiresAt = moment(zelfNameObject.publicData.expiresAt).add(45, "day");

		const isExpired = now.isAfter(expiresAt);

		if (isExpired) continue;

		zelfNameObject.zelfProof = zelfNameObject.zelfProof.replace(/ /g, "+");

		zelfNames.push(zelfNameObject);
	}

	return zelfNames;
};

const _returnFormattedIPFSRecords = async (ipfsRecords, foundInArweave) => {
	const zelfNamesInIPFS = [];

	const now = moment();

	for (let index = 0; index < ipfsRecords.length; index++) {
		const ipfsRecord = ipfsRecords[index];

		const formattedIPFS = await ZNSPartsModule.formatIPFSRecord(ipfsRecord, foundInArweave);

		const expiresAt = moment(formattedIPFS.publicData.expiresAt).add(formattedIPFS.publicData.type === "mainnet" ? 45 : 0, "day");

		const isExpired = now.isAfter(expiresAt);

		if (isExpired) {
			ipfsRecord.ipfs_pin_hash ? await IPFSModule.unPinFiles([ipfsRecord.ipfs_pin_hash]) : "do nothing";

			continue;
		}

		if (environment === "both") {
			zelfNamesInIPFS.push(formattedIPFS);

			continue;
		}

		if (
			(environment === "hold" && ipfsRecord.metadata.keyvalues.type === "hold") ||
			(environment === "mainnet" && (!ipfsRecord.metadata.keyvalues.type || ipfsRecord.metadata.keyvalues.type === "mainnet"))
		) {
			zelfNamesInIPFS.push(formattedIPFS);
		}
	}
};

const _createWalletsFromPhrase = async (params) => {
	const _mnemonic = params.type === "import" ? params.mnemonic : generateMnemonic(params.wordsCount);

	const wordsArray = _mnemonic.split(" ");

	if (wordsArray.length !== 12 && wordsArray.length !== 24) throw new Error("409:mnemonic_invalid");

	const eth = createEthWallet(_mnemonic);
	const btc = createBTCWallet(_mnemonic);
	const solana = await createSolanaWallet(_mnemonic);
	const sui = await generateSuiWalletFromMnemonic(_mnemonic);
	const zkProof = await OfflineProofModule.createProof(_mnemonic);

	return {
		eth,
		btc,
		solana,
		sui,
		zkProof,
		mnemonic: _mnemonic,
	};
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
	if (!referralZelfName) return null;

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

	if (!zelfName.includes(_preview.publicData.zelfName.toLowerCase())) {
		console.log({ _preview: _preview.publicData.zelfName.toLowerCase(), zelfName, zelfNameObject });
		const error = new Error("zelfName_does_not_match_in_zelfProof");
		error.status = 409;
		throw error;
	}

	const _zelfProof = holdRecord?.publicData?.zelfProof || mainnetRecord?.publicData?.zelfProof;

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
			durationToken: jwt.sign(
				{
					zelfName,
					exp: moment().add(30, "day").unix(),
				},
				config.JWT_SECRET
			),
		};

	zelfNameObject.ipfs = await IPFSModule.insert(
		{
			base64: zelfNameObject.image,
			name: zelfNameObject.zelfName,
			metadata: {
				zelfProof: zelfNameObject.zelfProof,
				zelfName: zelfNameObject.zelfName,
				extraParams: JSON.stringify({
					origin: "offline",
					registeredAt: moment().format("YYYY-MM-DD HH:mm:ss"),
					hasPassword: _preview.passwordLayer === "WithPassword" ? "true" : "false",
					duration: duration || 1,
					price: zelfNameObject.price,
					expiresAt: moment().add(30, "day").format("YYYY-MM-DD HH:mm:ss"),
					suiAddress: _preview.publicData.suiAddress,
					v: "2",
				}),
				type: "hold",
				ethAddress: _preview.publicData.ethAddress,
				btcAddress: _preview.publicData.btcAddress,
				solanaAddress: _preview.publicData.solanaAddress,
			},
			pinIt: true,
		},
		{ ...authUser, pro: true }
	);

	zelfNameObject.ipfs = await ZNSPartsModule.formatIPFSRecord(zelfNameObject.ipfs, true);

	return {
		...zelfNameObject,
		durationToken: jwt.sign(
			{
				zelfName,
				exp: moment().add(30, "day").unix(),
			},
			config.JWT_SECRET
		),
	};
};

const createZelfPay = async (zelfNameObject, currentCount = 1) => {
	// create link for coinbase
	const params = zelfNameObject.publicData || zelfNameObject.metadata;

	const zelfName = params.zelfName.split(".hold")[0];

	if (!zelfName) {
		const error = new Error("zelfName_not_found");
		error.status = 404;
		throw error;
	}

	params.duration = params.duration || 1;

	params.price = ZNSPartsModule.calculateZelfNamePrice(zelfName.split(".")[0].length, params.duration, params.referralZelfName).price;

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
			currentCount: `${currentCount}`,
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

	const adjustedPrice = params.price < 0.001 ? 0.01 : params.price;

	const coinbasePayload = {
		name: zelfName,
		description: `Purchase of the Zelf Name > ${zelfName} for $${adjustedPrice}`,
		pricing_type: "fixed_price",
		local_price: {
			amount: `${adjustedPrice}`,
			currency: "USD",
		},
		metadata: {
			zelfName: zelfName,
			ethAddress: params.ethAddress,
			btcAddress: params.btcAddress,
			solanaAddress: params.solanaAddress,
			count: `${currentCount}`,
		},
		redirect_url: "https://payment.zelf.world/checkout",
		cancel_url: "https://payment.zelf.world/checkout",
	};

	const coinbaseCharge = await createCoinbaseCharge(coinbasePayload);

	const payload = {
		base64: image,
		name: paymentName,
		metadata: {
			hasPassword: zelfNameObject.hasPassword,
			zelfProof,
			type: "mainnet",
			ethAddress: eth.address,
			solanaAddress: solana.address,
			btcAddress: btc.address,
			zelfName: paymentName,
			extraParams: JSON.stringify({
				expiresAt: moment().add(100, "year").format("YYYY-MM-DD HH:mm:ss"),
				registeredAt: moment().format("YYYY-MM-DD HH:mm:ss"),
				coinbase_hosted_url: coinbaseCharge.hosted_url,
				coinbase_expires_at: coinbaseCharge.expires_at,
				price: params.price || 24,
				duration: params.duration || 1,
				count: `${currentCount}`,
			}),
		},
		pinIt: true,
	};

	const ipfs = await IPFSModule.insert(payload, { pro: true });

	const arweave = await ArweaveModule.zelfNameRegistration(image, {
		hasPassword: "true",
		zelfProof,
		publicData: {
			ethAddress: params.ethAddress,
			btcAddress: params.btcAddress,
			solanaAddress: params.solanaAddress,
			coinbase_hosted_url: coinbaseCharge.hosted_url,
			coinbase_expires_at: `${coinbaseCharge.expires_at}`,
			zelfName: paymentName,
			type: "mainnet",
			expiresAt: moment().add(100, "year").format("YYYY-MM-DD HH:mm:ss"),
			count: `${currentCount}`,
		},
	});

	return {
		ipfs: await ZNSPartsModule.formatIPFSRecord(ipfs, false),
		arweave,
	};
};

const updateZelfPay = async (zelfPayObject, updates = {}) => {
	const params = zelfPayObject.publicData;

	const { newDuration, newCoinbaseUrl } = updates;

	const zelfName = params.zelfName.split(".hold")[0];

	if (!zelfName) {
		const error = new Error("zelfName_not_found");
		error.status = 404;
		throw error;
	}

	const price =
		zelfPayObject.publicData.price ||
		ZNSPartsModule.calculateZelfNamePrice(zelfName.length - 5, newDuration || zelfPayObject.publicData.duration, updates.referralZelfName).price;

	const newCount = parseInt(zelfPayObject.publicData.count || 0) + 1;

	if (newCoinbaseUrl) {
		// generate new coinbase charge
		const coinbasePayload = {
			name: zelfName,
			description: `Purchase of the Zelf Name > ${zelfName} for $${price}`,
			pricing_type: "fixed_price",
			local_price: {
				amount: `${price}`,
				currency: "USD",
			},
			metadata: {
				zelfName: zelfName,
				ethAddress: zelfPayObject.publicData.ethAddress,
				btcAddress: zelfPayObject.publicData.btcAddress,
				solanaAddress: zelfPayObject.publicData.solanaAddress,
				count: `${newCount}`,
			},
			redirect_url: "https://payment.zelf.world/checkout",
			cancel_url: "https://payment.zelf.world/checkout",
		};

		const coinbaseCharge = await createCoinbaseCharge(coinbasePayload);

		zelfPayObject.publicData.coinbase_hosted_url = coinbaseCharge.hosted_url;

		zelfPayObject.publicData.coinbase_expires_at = coinbaseCharge.expires_at;
	}

	const base64 = await ZNSPartsModule.urlToBase64(zelfPayObject.url);

	const payload = {
		base64,
		name: zelfPayObject.publicData.zelfName,
		metadata: {
			hasPassword: "true",
			zelfProof: zelfPayObject.publicData.zelfProof,
			type: "mainnet",
			ethAddress: zelfPayObject.publicData.ethAddress,
			solanaAddress: zelfPayObject.publicData.solanaAddress,
			btcAddress: zelfPayObject.publicData.btcAddress,
			zelfName: zelfPayObject.publicData.zelfName,
			extraParams: JSON.stringify({
				registeredAt: moment().format("YYYY-MM-DD HH:mm:ss"),
				expiresAt: moment().add(100, "year").format("YYYY-MM-DD HH:mm:ss"),
				coinbase_hosted_url: zelfPayObject.publicData.coinbase_hosted_url,
				coinbase_expires_at: zelfPayObject.publicData.coinbase_expires_at,
				price,
				duration: newDuration || zelfPayObject.publicData.duration,
				count: `${newCount}`,
			}),
		},
		pinIt: true,
	};

	const arweave = await ArweaveModule.zelfNameRegistration(base64, {
		zelfProof: zelfPayObject.publicData.zelfProof,
		publicData: payload.metadata,
	});

	//remove the previous ipfs record
	await IPFSModule.unPinFiles([zelfPayObject.ipfs_pin_hash || zelfPayObject.IpfsHash]);

	const ipfs = await IPFSModule.insert(payload, { pro: true });

	return {
		price,
		updates,
		zelfName,
		ipfs: await ZNSPartsModule.formatIPFSRecord(ipfs, true),
		arweave,
	};
};

const _decryptParams = async (data, authUser) => {
	if (data.removePGP) {
		return {
			password: data.password,
			mnemonic: data.mnemonic,
			face: data.faceBase64,
		};
	}

	const password = await SessionModule.sessionDecrypt(data.password || null, authUser);
	const mnemonic = await SessionModule.sessionDecrypt(data.mnemonic || null, authUser);
	const face = await SessionModule.sessionDecrypt(data.faceBase64 || null, authUser);

	return { password, mnemonic, face };
};

/**
 * get ZelfName
 * @param {String} zelfName
 * @param {Object} authUser
 * @author Miguel Trevino
 */
const _getZelfNameToConfirm = async (zelfName, authUser) => {
	const zelfNameRecords = await previewZelfName({ zelfName, environment: "both" }, authUser);

	let isMainnet = false;

	for (let index = 0; index < zelfNameRecords.length; index++) {
		const record = zelfNameRecords[index];

		inMainnet = Boolean(record.publicData?.type === "mainnet" || !record.publicData?.zelfName.includes(".hold"));
	}

	if (!zelfNameRecords.length) {
		const error = new Error("zelfName_not_found");
		error.status = 404;
		throw error;
	}

	if (zelfNameRecords.length === 2 || inMainnet) {
		const error = new Error("zelfName_purchased_already");
		error.status = 409;
		throw error;
	}

	const zelfNameObject = zelfNameRecords[0];

	const chargeID = zelfNameObject.publicData?.coinbase_id || zelfNameObject.publicData?.coinbase_hosted_url?.split("/pay/")[1];

	let zelfPayNameObject = null;

	if (!chargeID && zelfNameObject) {
		// bring it from zelfPay
		const zelfPay = `${zelfName.replace(".zelf.hold", ".zelfpay").replace(".zelf", ".zelfpay")}`;

		let zelfPayRecords = [];

		zelfPayRecords = await searchZelfName(
			{
				zelfName: zelfPay,
				environment: "mainnet",
			},
			authUser
		);

		zelfPayNameObject = zelfPayRecords.ipfs?.length ? zelfPayRecords.ipfs[0] : zelfPayRecords.arweave[0];

		if (!zelfPayNameObject) {
			const error = new Error("zelfPay_not_found");
			error.status = 404;
			throw error;
		}
	}

	return {
		zelfNameObject,
		isMainnet,
		zelfPayNameObject,
	};
};

/**
 * lease confirmation
 * @param {Object} data
 * @param {Object} authUser
 * @author Miguel Trevino
 */
const leaseConfirmation = async (data, authUser) => {
	const { network, zelfName, confirmationData } = data;

	const { zelfNameObject, isMainnet, zelfPayNameObject } = await _getZelfNameToConfirm(zelfName, authUser);

	let payment = false;

	switch (zelfNameObject.publicData.price === 0 ? "free" : network) {
		case "coinbase":
		case "CB":
			payment = await _confirmCoinbaseCharge(zelfNameObject, zelfPayNameObject);

			break;
		case "ETH":
			payment = await confirmPayUniqueAddress(network, confirmationData);

			break;
		case "SOL":
			payment = await confirmPayUniqueAddress(network, confirmationData);

			break;
		case "BTC":
			payment = await confirmPayUniqueAddress(network, confirmationData);

			break;
		case "free":
			payment = {
				confirmed: true,
			};

			break;

		default:
			break;
	}

	if (payment?.confirmed) {
		return await _confirmZelfNamePurchase(zelfNameObject);
	}

	return {
		zelfNameObject,
		zelfName,
		payment,
	};
};

/**
 *
 * @param {Object} zelfNameObject
 * @returns {Object} - Returns the referral reward and the cloned Zelf Name records
 */
const _confirmZelfNamePurchase = async (zelfNameObject) => {
	const { masterIPFSRecord, masterArweaveRecord, reward } = await _cloneZelfNameToProduction(zelfNameObject);

	return {
		ipfs: [masterIPFSRecord],
		arweave: masterArweaveRecord,
		reward,
	};
};

/**
 * clone zelf name to production
 * @param {Object} zelfNameObject
 * @author Miguel Trevino
 */
const _cloneZelfNameToProduction = async (zelfNameObject) => {
	const duration = zelfNameObject.publicData.duration === "lifetime" ? 100 : zelfNameObject.publicData.duration || 1;

	const expiresAt = moment().add(duration, "year").format("YYYY-MM-DD HH:mm:ss");

	const zelfName = zelfNameObject.preview?.publicData?.zelfName || zelfNameObject.publicData.zelfName.replace(".hold", "");

	const payload = {
		base64: zelfNameObject.zelfProofQRCode,
		name: zelfName,
		metadata: {
			hasPassword: `${
				Boolean(zelfNameObject.preview?.passwordLayer === "Password") ||
				Boolean(zelfNameObject.hasPassword) ||
				zelfNameObject.publicData.hasPassword
			}`,
			zelfProof: zelfNameObject.publicData.zelfProof,
			zelfName,
			ethAddress: zelfNameObject.preview.publicData.ethAddress,
			solanaAddress: zelfNameObject.preview.publicData.solanaAddress,
			btcAddress: zelfNameObject.preview.publicData.btcAddress,
			extraParams: JSON.stringify({
				...(zelfNameObject.preview.publicData.suiAddress && { suiAddress: zelfNameObject.preview.publicData.suiAddress }),
				origin: zelfNameObject.preview.publicData.origin || "online",
				registeredAt: moment().format("YYYY-MM-DD HH:mm:ss"),
				expiresAt,
			}),
			type: "mainnet",
		},
		pinIt: true,
	};

	const masterArweaveRecord = await ArweaveModule.zelfNameRegistration(zelfNameObject.zelfProofQRCode, {
		hasPassword: payload.metadata.hasPassword,
		zelfProof: payload.metadata.zelfProof,
		publicData: {
			...payload.metadata,
			...(zelfNameObject.preview.publicData.suiAddress && { suiAddress: zelfNameObject.preview.publicData.suiAddress }),
			expiresAt,
		},
	});

	await IPFSModule.unPinFiles([zelfNameObject.ipfs_pin_hash]);

	const masterIPFSRecord = await IPFSModule.insert(payload, { pro: true });

	let reward;

	zelfNameObject.publicData.referralZelfName
		? await addReferralReward({
				ethAddress: masterIPFSRecord.metadata.ethAddress,
				solanaAddress: masterIPFSRecord.metadata.solanaAddress,
				zelfName: masterIPFSRecord.metadata.zelfName,
				zelfNamePrice: zelfNameObject.publicData.price,
				referralZelfName: zelfNameObject.publicData.referralZelfName,
				referralSolanaAddress: zelfNameObject.publicData.referralSolanaAddress,
				ipfsHash: masterIPFSRecord.IpfsHash,
				arweaveId: masterArweaveRecord.id,
		  })
		: "no_referral";

	reward = await addPurchaseReward({
		ethAddress: masterIPFSRecord.metadata.ethAddress,
		solanaAddress: masterIPFSRecord.metadata.solanaAddress,
		zelfName: masterIPFSRecord.metadata.zelfName,
		zelfNamePrice: zelfNameObject.publicData.price,
		ipfsHash: masterIPFSRecord.IpfsHash,
		arweaveId: masterArweaveRecord.id,
	});

	if (config.env === "production") {
		await createUnderName({
			parentName: config.arwave.parentName,
			undername: zelfNameObject.publicData.zelfName.split(".zelf")[0],
			publicData: zelfNameObject.publicData,
		});
	}

	return {
		masterArweaveRecord,
		masterIPFSRecord: await ZNSPartsModule.formatIPFSRecord(masterIPFSRecord, true),
		reward,
	};
};

const _confirmCoinbaseCharge = async (zelfNameObject, zelfPayNameObject = {}) => {
	const chargeID =
		zelfNameObject.publicData?.coinbase_id ||
		zelfPayNameObject?.publicData?.coinbase_id ||
		zelfNameObject.publicData?.coinbase_hosted_url?.split("/pay/")[1] ||
		zelfPayNameObject?.publicData?.coinbase_hosted_url?.split("/pay/")[1];

	if (!chargeID) {
		const error = new Error("coinbase_charge_id_not_found");

		error.status = 404;

		throw error;
	}

	const charge = await getCoinbaseCharge(chargeID);

	if (!charge) return false;

	const timeline = charge.timeline;

	let confirmed = false;

	for (let index = 0; index < timeline.length; index++) {
		const _timeline = timeline[index];

		if (_timeline.status === "COMPLETED") {
			confirmed = true;
		}
	}

	return {
		...charge,
		confirmed: config.coinbase.forceApproval || confirmed,
	};
};

module.exports = {
	searchZelfName,
	decryptZelfName,
	leaseZelfName,
	leaseOffline,
	createZelfPay,
	updateZelfPay,
	leaseConfirmation,
	previewZelfName,
	saveInProduction: _cloneZelfNameToProduction,
	findDuplicatedZelfName: _findDuplicatedZelfName,
	createWalletsFromPhrase: _createWalletsFromPhrase,
	confirmFreeZelfName: _confirmFreeZelfName,
	saveHoldZelfNameInIPFS: _saveHoldZelfNameInIPFS,
	validateReferral: _validateReferral,
};
