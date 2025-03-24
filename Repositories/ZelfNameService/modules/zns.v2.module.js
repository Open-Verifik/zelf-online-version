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
	zelfNameObject.metadata = params.removePGP
		? dataToEncrypt.metadata
		: params.previewZelfProof
		? {
				mnemonic: dataToEncrypt.metadata.mnemonic
					.split(" ")
					.map((word, index, array) => (index < 2 || index >= array.length - 2 ? word : "****"))
					.join(" "),
				solanaSecretKey: `${dataToEncrypt.metadata.solanaSecretKey.slice(0, 6)}****${dataToEncrypt.metadata.solanaSecretKey.slice(-6)}`,
				zkProof: `${dataToEncrypt.metadata.zkProof.slice(0, 6)}****${dataToEncrypt.metadata.zkProof.slice(-6)}`,
		  }
		: undefined;
	zelfNameObject.duration = duration;
	zelfNameObject.zelfProof = await encrypt(dataToEncrypt);

	if (!zelfNameObject.zelfProof) throw new Error("409:Wallet_could_not_be_encrypted");

	zelfNameObject.image = await encryptQR(dataToEncrypt);

	let encryptedMessage;
	let privateKey;

	if (!params.removePGP) {
		const pgpKeys = await SessionModule.walletEncrypt({ mnemonic, zkProof, solanaPrivateKey: solana.secretKey }, eth.address, password);
		encryptedMessage = pgpKeys.encryptedMessage;
		privateKey = pgpKeys.privateKey;
	}

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

	const { encryptedMessage, privateKey } = await SessionModule.walletEncrypt(
		{ mnemonic, zkProof, solanaSecretKey },
		zelfNameObject.publicData.ethAddress,
		password
	);

	return {
		hasPassword: Boolean(password),
		image: zelfNameObject.zelfProofQRCode,
		pgp: { encryptedMessage, privateKey },
		url: zelfNameObject.url,
		zelfName: zelfNameObject.publicData.zelfName,
		addresses: {
			ethAddress: zelfNameObject.ethAddress,
			btcAddress: zelfNameObject.btcAddress,
			solanaAddress: zelfNameObject.solanaAddress,
		},
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

const _saveHoldZelfNameInIPFS = async (zelfNameObject, referralZelfNameObject, password, authUser) => {
	const holdName = `${zelfNameObject.zelfName}.hold`;

	const metadata = {
		zelfProof: zelfNameObject.zelfProof,
		zelfName: holdName,
		hasPassword: zelfNameObject.hasPassword,
		ethAddress: zelfNameObject.ethAddress,
		btcAddress: zelfNameObject.btcAddress,
		solanaAddress: zelfNameObject.solanaAddress,
		extraParams: {
			price: zelfNameObject.price,
			duration: zelfNameObject.duration || 1,
			registeredAt: moment().format("YYYY-MM-DD HH:mm:ss"),
			expiresAt: moment().add(30, "day").format("YYYY-MM-DD HH:mm:ss"),
		},
		type: "hold",
	};

	if (referralZelfNameObject) {
		metadata.payment.referralZelfName = referralZelfNameObject.publicData?.zelfName || referralZelfNameObject.metadata?.zelfName;

		metadata.payment.referralSolanaAddress = referralZelfNameObject.publicData?.solanaAddress || referralZelfNameObject.metadata?.solanaAddress;
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
		redirect_url: "https://payment.zelf.world/checkout",
		cancel_url: "https://payment.zelf.world/checkout",
	};

	zelfNameObject.coinbaseCharge = await createCoinbaseCharge(coinbasePayload);

	zelfNameObject.ipfs = await IPFSModule.insert(
		{
			base64: zelfNameObject.image,
			name: zelfNameObject.zelfName,
			metadata: {
				zelfProof: zelfNameObject.zelfProof,
				zelfName: zelfNameObject.zelfName,
				extraParams: JSON.stringify({
					hasPassword: _preview.passwordLayer === "WithPassword" ? "true" : "false",
					duration: duration || 1,
					price: zelfNameObject.price,
					coinbase_hosted_url: zelfNameObject.coinbaseCharge.hosted_url,
					coinbase_expires_at: zelfNameObject.coinbaseCharge.expires_at,
					expiresAt: moment().add(30, "day").format("YYYY-MM-DD HH:mm:ss"),
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

const createZelfPay = async (zelfNameObject) => {
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
				coinbase_hosted_url: coinbaseCharge.hosted_url,
				coinbase_expires_at: coinbaseCharge.expires_at,
				price: params.price || 24,
				duration: params.duration || 1,
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
		},
	});

	return {
		ipfs: await ZNSPartsModule.formatIPFSRecord(ipfs, false),
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

		if (!zelfPayRecords.length) {
			//throw exception
			const error = new Error("zelfPay_not_found");
			error.status = 404;
			throw error;
		}

		zelfPayNameObject = zelfPayRecords[0];
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

	const zelfName = zelfNameObject.preview?.publicData.zelfName || zelfNameObject.publicData.zelfName.replace(".hold", "");

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
				origin: zelfNameObject.preview.publicData.origin || "online",
				registeredAt: moment().format("YYYY-MM-DD HH:mm:ss"),
				expiresAt,
			}),
			type: "mainnet",
		},
		pinIt: true,
	};

	payload.metadata.expiresAt = expiresAt;

	const masterArweaveRecord = await ArweaveModule.zelfNameRegistration(zelfNameObject.zelfProofQRCode, {
		hasPassword: payload.metadata.hasPassword,
		zelfProof: payload.metadata.zelfProof,
		publicData: payload.metadata,
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
		masterIPFSRecord,
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
	leaseConfirmation,
	previewZelfName,
};
