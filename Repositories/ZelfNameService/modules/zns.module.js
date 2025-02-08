const ArweaveModule = require("../../Arweave/modules/arweave.module");
const axios = require("axios");
const arweaveUrl = `https://arweave.zelf.world`;
const explorerUrl = `https://viewblock.io/arweave/tx`;
const { generateMnemonic } = require("../../Wallet/modules/helpers");
const { createEthWallet } = require("../../Wallet/modules/eth");
const { createSolanaWallet } = require("../../Wallet/modules/solana");
const { createBTCWallet } = require("../../Wallet/modules/btc");
const sessionModule = require("../../Session/modules/session.module");
const BigNumber = require("bignumber.js");
const { getTickerPrice } = require("../../binance/modules/binance.module");
const {
	encrypt,
	decrypt,
	preview,
	encryptQR,
} = require("../../Wallet/modules/encryption");
const OfflineProofModule = require("../../Mina/offline-proof");
const IPFSModule = require("../../IPFS/modules/ipfs.module");
const moment = require("moment");
const {
	createCoinbaseCharge,
	getCoinbaseCharge,
} = require("../../coinbase/modules/coinbase_commerce.module");

const config = require("../../../Core/config");
const { addReferralReward, addPurchaseReward } = require("./zns-token.module");
const jwt = require("jsonwebtoken");
const {
	getAddress,
} = require("../../etherscan/modules/etherscan-scrapping.module");
const solanaModule = require("../../Solana/modules/solana-scrapping.module");
const {
	getBalance,
} = require("../../bitcoin/modules/bitcoin-scrapping.module");
const { createUnderName } = require("./undernames.module");

const evmCompatibleTickers = [
	"ETH", // Ethereum
	"BNB", // Binance Smart Chain
	"MATIC", // Polygon
	"AVAX", // Avalanche
	"FTM", // Fantom
	"ARB", // Arbitrum
	"OP", // Optimism
	"CRO", // Cronos
	"ONE", // Harmony
	"KLAY", // Klaytn
	"xDAI", // Gnosis Chain
	"GLMR", // Moonbeam
	"CELO", // Celo
	"OKT", // OKX Chain
	"AURORA", // Aurora (NEAR EVM)
].join(","); // Create a single string of tickers;

const zelfNamePricing = {
	1: { 1: 240, 2: 432, 3: 612, 4: 768, 5: 900, lifetime: 3600 },
	2: { 1: 120, 2: 216, 3: 306, 4: 384, 5: 450, lifetime: 1800 },
	3: { 1: 72, 2: 130, 3: 184, 4: 230, 5: 270, lifetime: 1080 },
	4: { 1: 36, 2: 65, 3: 92, 4: 115, 5: 135, lifetime: 540 },
	5: { 1: 30, 2: 54, 3: 76, 4: 96, 5: 112, lifetime: 450 },
	"6-15": { 1: 24, 2: 43, 3: 61, 4: 77, 5: 90, lifetime: 360 },
	16: { 1: 23, 2: 41, 3: 59, 4: 74, 5: 86, lifetime: 345 },
	17: { 1: 22, 2: 40, 3: 56, 4: 70, 5: 82, lifetime: 330 },
	18: { 1: 21, 2: 38, 3: 54, 4: 67, 5: 79, lifetime: 315 },
	19: { 1: 20, 2: 36, 3: 51, 4: 64, 5: 75, lifetime: 300 },
	20: { 1: 19, 2: 34, 3: 48, 4: 61, 5: 72, lifetime: 285 },
	21: { 1: 18, 2: 32, 3: 46, 4: 58, 5: 68, lifetime: 270 },
	22: { 1: 17, 2: 31, 3: 43, 4: 54, 5: 64, lifetime: 255 },
	23: { 1: 16, 2: 29, 3: 41, 4: 51, 5: 60, lifetime: 240 },
	24: { 1: 15, 2: 27, 3: 38, 4: 48, 5: 56, lifetime: 225 },
	25: { 1: 14, 2: 25, 3: 36, 4: 45, 5: 53, lifetime: 210 },
	26: { 1: 13, 2: 23, 3: 33, 4: 42, 5: 49, lifetime: 195 },
	27: { 1: 12, 2: 22, 3: 31, 4: 38, 5: 45, lifetime: 180 },
};

/**
 * Get Zelf Name price based on name length and duration
 * @param {number} length - The length of the Zelf name
 * @param {string} duration - Duration ("1", "2", "3", "4", "5", "lifetime")
 * @returns {number} - Price of the Zelf name
 */
const _calculateZelfNamePrice = (length, duration = 1, referralZelfName) => {
	if (!["1", "2", "3", "4", "5", "lifetime"].includes(`${duration}`))
		throw new Error(
			"Invalid duration. Use '1', '2', '3', '4', '5' or 'lifetime'."
		);

	let price = 24;

	if (length >= 6 && length <= 15) {
		price = zelfNamePricing["6-15"][duration];
	} else if (zelfNamePricing[length]) {
		price = zelfNamePricing[length][duration];
	} else {
		throw new Error("Invalid name length. Length must be between 1 and 27.");
	}

	// Apply 10% discount if referralZelfName is provided
	if (referralZelfName) {
		price = price - price * 0.1; // Subtract 10% from the price
	}

	// Adjust price for development environment
	price = config.env === "development_" ? price / 80 : price;

	if (config.token.whitelist.includes(referralZelfName)) return 0;

	// Round up to 2 decimal places
	return Math.ceil(price * 100) / 100;
};

/**
 *
 * @param {*} params
 * @param {*} authUser
 */
const searchZelfName = async (params, authUser) => {
	const query = params.zelfName
		? { key: "zelfName", value: params.zelfName }
		: { key: params.key, value: params.value };

	if (params.duration) query.duration = params.duration;

	try {
		const searchResults = await ArweaveModule.search(
			params.zelfName || params.key === "zelfName" ? params.value : null,
			query
		);

		if (searchResults?.available) {
			const error = new Error("not_found_in_arweave");

			error.status = 404;

			throw error;
		}

		const zelfNames = [];

		for (let index = 0; index < searchResults.length; index++) {
			const zelfNameObject = await _formatArweaveSearchResult(
				searchResults[index]
			);

			zelfNames.push(zelfNameObject);
		}

		return {
			arweave: zelfNames,
			ipfs: await _searchInIPFS(params.environment, query, authUser, true),
		};
	} catch (exception) {
		console.error({ exception: exception });

		return await _searchInIPFS(params.environment, query, authUser);
	}
};

const _removeExpiredRecords = async (records) => {
	const now = moment();

	// testing adding few days, so it's expired
	// now.add(3, "day");

	for (let index = records.length - 1; index >= 0; index--) {
		const record = records[index];

		const expiresAt = moment(record.metadata.keyvalues.expiresAt);

		const isExpired = now.isAfter(expiresAt);

		if (isExpired) {
			records.splice(index, 1);

			record.ipfs_pin_hash
				? await IPFSModule.unPinFiles([record.ipfs_pin_hash])
				: "do nothing";

			continue;
		}
	}
};

const _retriveFromIPFSByEnvironment = async (
	ipfsRecords,
	environment,
	query,
	authUser
) => {
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

	await _removeExpiredRecords(ipfsRecords);
};

/**
 * search in IPFS
 * @param {Object} params
 * @param {Object} authUser
 * @author Miguel Trevino
 */
const _searchInIPFS = async (
	environment = "both",
	query,
	authUser,
	foundInArweave
) => {
	try {
		let ipfsRecords = [];

		await _retriveFromIPFSByEnvironment(
			ipfsRecords,
			environment,
			query,
			authUser
		);

		const value = query.value || query.zelfName;

		if (!ipfsRecords.length) {
			return foundInArweave
				? []
				: value && value.includes(".zelf")
				? {
						price: _calculateZelfNamePrice(
							value.split(".zelf")[0].length,
							query.duration
						),
						zelfName: value,
						available: true,
				  }
				: null;
		}

		const zelfNamesInIPFS = [];

		for (let index = 0; index < ipfsRecords.length; index++) {
			const ipfsRecord = ipfsRecords[index];

			if (environment === "both") {
				zelfNamesInIPFS.push(
					await _formatIPFSSearchResult(ipfsRecord, foundInArweave)
				);

				continue;
			}

			if (
				(environment === "hold" &&
					ipfsRecord.metadata.keyvalues.type === "hold") ||
				(environment === "mainnet" &&
					(!ipfsRecord.metadata.keyvalues.type ||
						ipfsRecord.metadata.keyvalues.type === "mainnet"))
			) {
				zelfNamesInIPFS.push(
					await _formatIPFSSearchResult(ipfsRecord, foundInArweave)
				);
			}
		}

		return foundInArweave ? zelfNamesInIPFS : { ipfs: zelfNamesInIPFS };
	} catch (exception) {
		console.error({ _searchInIPFS_exception: exception });

		return foundInArweave
			? []
			: query.key === "zelfName"
			? {
					price: _calculateZelfNamePrice(
						query.value.split(".zelf")[0].length,
						query.duration
					),
					zelfName: query.value,
					available: true,
			  }
			: null;
	}
};

const _formatArweaveSearchResult = async (transactionRecord) => {
	const zelfNameObject = {
		id: transactionRecord.node?.id,
		url: `${arweaveUrl}/${transactionRecord.node?.id}`,
		explorerUrl: `${explorerUrl}/${transactionRecord.node?.id}`,
		publicData: {},
	};

	for (let index = 0; index < transactionRecord.node?.tags.length; index++) {
		const tag = transactionRecord.node?.tags[index];

		zelfNameObject.publicData[tag.name] = tag.value;
	}

	const zelfProofTag = transactionRecord.node?.tags.find(
		(tag) => tag.name === "zelfProof"
	);

	const zelfNameTag = transactionRecord.node?.tags.find(
		(tag) => tag.name === "zelfName"
	);

	zelfNameObject.zelfProof = zelfProofTag ? zelfProofTag.value : null;

	zelfNameObject.zelfName = zelfNameTag.value;

	zelfNameObject.zelfProofQRCode = await _arweaveIDToBase64(zelfNameObject.id);

	return zelfNameObject;
};

const _formatIPFSSearchResult = async (ipfsRecord, foundInArweave) => {
	const zelfNameObject = {
		...ipfsRecord,
		publicData: {
			name: ipfsRecord.metadata.name,
			...ipfsRecord.metadata.keyvalues,
		},
		zelfName: ipfsRecord.metadata.name,
	};

	if (zelfNameObject.publicData.payment) {
		const payment = JSON.parse(zelfNameObject.publicData.payment);

		// assign the payment to the publicData
		zelfNameObject.publicData.price = payment.price;
		zelfNameObject.publicData.duration = payment.duration;
		zelfNameObject.publicData.coinbase_hosted_url = payment.coinbase_hosted_url;
		zelfNameObject.publicData.referralZelfName = payment.referralZelfName;
		zelfNameObject.publicData.referralSolanaAddress =
			payment.referralSolanaAddress;
	}

	if (!foundInArweave) {
		zelfNameObject.zelfProof = zelfNameObject.publicData.zelfProof;

		zelfNameObject.zelfProofQRCode = await _IPFSToBase64(zelfNameObject.url);
	}

	delete zelfNameObject.metadata;

	return zelfNameObject;
};

const _IPFSToBase64 = async (url) => {
	try {
		const encryptedResponse = await axios.get(url, {
			responseType: "arraybuffer",
		});

		if (encryptedResponse?.data) {
			const base64Image = Buffer.from(encryptedResponse.data).toString(
				"base64"
			);

			return `data:image/png;base64,${base64Image}`;
		}
	} catch (exception) {
		console.error({ VWEx: exception });

		return exception?.message;
	}
};

const _arweaveIDToBase64 = async (id) => {
	try {
		const encryptedResponse = await axios.get(`${arweaveUrl}/${id}`, {
			responseType: "arraybuffer",
		});

		if (encryptedResponse?.data) {
			const base64Image = Buffer.from(encryptedResponse.data).toString(
				"base64"
			);

			return `data:image/png;base64,${base64Image}`;
		}
	} catch (exception) {
		console.error({ VWEx: exception });

		return exception?.message;
	}
};

const _createWalletsFromPhrase = async (params, authUser) => {
	const { face, password, mnemonic } = await _decryptParams(params, authUser);

	const _mnemonic =
		params.type === "import" ? mnemonic : generateMnemonic(params.wordsCount);
	const wordsArray = _mnemonic.split(" ");
	if (wordsArray.length !== 12 && wordsArray.length !== 24)
		throw new Error("409:mnemonic_invalid");

	const eth = createEthWallet(_mnemonic);
	const btc = createBTCWallet(_mnemonic);
	const solana = await createSolanaWallet(_mnemonic);
	const zkProof = await OfflineProofModule.createProof(_mnemonic);

	return { eth, btc, solana, zkProof, mnemonic: _mnemonic, face, password };
};

/**
 * lease zelfName
 * @param {Object} params
 * @param {Object} authUser
 */
const leaseZelfName = async (params, authUser) => {
	const { zelfName, duration, referralZelfName } = params;

	await _findDuplicatedZelfName(zelfName, "both", authUser);

	const referralZelfNameObject = await _validateReferral(
		referralZelfName,
		authUser
	);

	const { eth, btc, solana, zkProof, mnemonic, face, password } =
		await _createWalletsFromPhrase(params, authUser);

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
			zkProof,
		},
		faceBase64: face,
		password,
		_id: zelfName,
		tolerance: params.tolerance,
		addServerPassword: Boolean(params.addServerPassword),
	};

	zelfNameObject.zelfProof = await encrypt(dataToEncrypt);

	if (!zelfNameObject.zelfProof)
		throw new Error("409:Wallet_could_not_be_encrypted");

	zelfNameObject.zelfName = zelfName;
	zelfNameObject.price = _calculateZelfNamePrice(
		zelfName.length - 5,
		duration,
		referralZelfName
	);
	zelfNameObject.publicData = dataToEncrypt.publicData;
	zelfNameObject.ethAddress = eth.address;
	zelfNameObject.btcAddress = btc.address;
	zelfNameObject.solanaAddress = solana.address;
	zelfNameObject.hasPassword = `${Boolean(password)}`;
	zelfNameObject.metadata = params.previewZelfProof
		? dataToEncrypt.metadata
		: undefined;
	zelfNameObject.duration = duration;
	zelfNameObject.image = await encryptQR(dataToEncrypt);

	await _createPaymentCharge(
		zelfNameObject,
		{ referralZelfName, referralZelfNameObject },
		authUser
	);

	return {
		...zelfNameObject,
		hasPassword: Boolean(password),
		durationToken: jwt.sign(
			{
				zelfName,
				exp: moment().add(12, "hour").unix(),
			},
			config.JWT_SECRET
		),
	};
};

const _createPaymentCharge = async (zelfNameObject, referral, authUser) => {
	const { referralZelfName, referralZelfNameObject } = referral;

	const holdName = `${zelfNameObject.zelfName}.hold`;

	zelfNameObject.coinbaseCharge = await createCoinbaseCharge({
		name: `${zelfNameObject.zelfName}`,
		description: `Purchase of the Zelf Name > ${zelfNameObject.zelfName} for $${zelfNameObject.price}`,
		pricing_type: "fixed_price",
		local_price: {
			amount: zelfNameObject.price,
			currency: "USD",
		},
		metadata: {
			zelfName: zelfNameObject.zelfName,
			ethAddress: zelfNameObject.ethAddress,
			btcAddress: zelfNameObject.btcAddress,
			solanaAddress: zelfNameObject.solanaAddress,
		},
		redirect_url: "https://name.zelf.world/#/coinbase-success",
		cancel_url: "https://name.zelf.world/#/coinbase-cancel",
	});

	const metadata = {
		zelfProof: zelfNameObject.zelfProof,
		zelfName: holdName,
		hasPassword: zelfNameObject.hasPassword || "false",
		payment: {
			price: zelfNameObject.price,
			duration: zelfNameObject.duration || 1,
			coinbase_hosted_url: zelfNameObject.coinbaseCharge.hosted_url,
		},
		expiresAt: moment().add(12, "hour").format("YYYY-MM-DD HH:mm:ss"),
		type: "hold",
	};

	if (referralZelfName && referralZelfNameObject) {
		metadata.payment.referralZelfName = referralZelfName;

		metadata.payment.referralSolanaAddress =
			referralZelfNameObject?.publicData?.solanaAddress ||
			referralZelfNameObject?.metadata?.solanaAddress;
	}

	metadata.payment = JSON.stringify(metadata.payment);

	zelfNameObject.ipfs = await IPFSModule.insert(
		{
			base64: zelfNameObject.image,
			name: holdName,
			metadata,
			pinIt: true,
		},
		{ ...authUser, pro: true }
	);

	await _createReceivingWallets(zelfNameObject, authUser);
};

const _createReceivingWallets = async (zelfNameObject, authUser) => {
	const mnemonic = generateMnemonic(12);
	const jsonfile = require("../../../config/0012589021.json");
	const eth = createEthWallet(mnemonic);
	const btc = createBTCWallet(mnemonic);
	const solana = await createSolanaWallet(mnemonic);

	const zkProof = await OfflineProofModule.createProof(mnemonic);

	// save it now in ipfs and arweave
	const paymentName = `${zelfNameObject.zelfName}`.replace(".zelf", ".zelfpay");

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
		},
		pinIt: true,
	};

	const ipfsRecord = await IPFSModule.insert(payload, { pro: true });

	const arweaveRecord = await ArweaveModule.zelfNameRegistration(image, {
		hasPassword: "true",
		zelfProof,
		publicData: {
			...dataToEncrypt.publicData,
			zelfName: paymentName,
			type: "mainnet",
			expiresAt: moment()
				.add(zelfNameObject.publicData.duration || 1, "year")
				.format("YYYY-MM-DD HH:mm:ss"),
		},
	});

	return {
		ipfsRecord,
		arweaveRecord,
	};
};

/**
 * lease confirmation
 * @param {Object} data
 * @param {Object} authUser
 * @author Miguel Trevino
 */
const leaseConfirmation = async (data, authUser) => {
	const { network, coin, zelfName } = data;

	let unpinResult;
	let inMainnet = false;

	const zelfNameRecords = await previewZelfName(
		{ zelfName, environment: "both" },
		authUser
	);

	for (let index = 0; index < zelfNameRecords.length; index++) {
		const record = zelfNameRecords[index];

		inMainnet = Boolean(
			record.publicData?.type === "mainnet" ||
				!record.publicData?.zelfName.includes(".hold")
		);
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

	let payment = false;
	switch (network) {
		case "coinbase":
		case "CB":
			payment = await _confirmCoinbaseCharge(zelfNameObject);

			break;
		case "ETH":
			payment = await confirmPayUniqueAddress(zelfNameObject, network);

			break;
		case "SOL":
			payment = await confirmPayUniqueAddress(zelfNameObject, network);

			break;
		case "BTC":
			payment = await confirmPayUniqueAddress(zelfNameObject, network);

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
		hold: unpinResult,
	};
};

/**
 *
 * @param {Object} zelfNameObject
 * @returns {Object} - Returns the referral reward and the cloned Zelf Name records
 */
const _confirmZelfNamePurchase = async (zelfNameObject) => {
	unpinResult = await IPFSModule.unPinFiles([zelfNameObject.ipfs_pin_hash]);

	const { masterIPFSRecord, masterArweaveRecord } =
		await _cloneZelfNameToProduction(zelfNameObject);

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

	const reward = await addPurchaseReward({
		ethAddress: masterIPFSRecord.metadata.ethAddress,
		solanaAddress: masterIPFSRecord.metadata.solanaAddress,
		zelfName: masterIPFSRecord.metadata.zelfName,
		zelfNamePrice: zelfNameObject.publicData.price,
		ipfsHash: masterIPFSRecord.IpfsHash,
		arweaveId: masterArweaveRecord.id,
	});

	// now here we will create the undername
	// await createUnderName({
	// 	parentName: config.arwave.parentName,
	// 	undername: zelfNameObject.publicData.zelfName.split(".zelf")[0],
	// });

	return {
		ipfs: [masterIPFSRecord],
		arweave: [masterArweaveRecord],
		reward,
	};
};

// await createUnderName({ parentName: config.arwave.parentName, underName: zelfName });

const _confirmCoinbaseCharge = async (zelfNameObject) => {
	const chargeID =
		zelfNameObject.publicData?.coinbase_id ||
		zelfNameObject.publicData?.coinbase_hosted_url.split("/pay/")[1];

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
		confirmed: config.env === "development" ? true : confirmed,
	};
};

const confirmPayUniqueAddress = async (zelfNameObject, network) => {
	try {
		const price = zelfNameObject.publicData.price;
		const zelfName = zelfNameObject.publicData.name;

		const zelfNamePay = zelfName.replace(".zelf.hold", ".zelfpay");

		const previewData2 = await searchZelfName({
			zelfName: zelfNamePay,
			environment: "both",
		});

		const paymentAddressInIPFS = JSON.parse(
			previewData2.ipfs[0].publicData.addresses
		);

		let selectedAddress = null;

		switch (network.toUpperCase()) {
			case "BTC":
				selectedAddress = paymentAddressInIPFS.btcAddress;
				break;
			case "ETH":
				selectedAddress = paymentAddressInIPFS.ethAddress;
				break;
			case "SOL":
				selectedAddress = paymentAddressInIPFS.solanaAddress;
				break;
			default:
				break;
		}

		if (!selectedAddress) {
			const error = new Error("payment_address_not_found");
			error.status = 404;
			throw error;
		}

		const confirmed = await {
			ETH: checkoutETH,
			SOL: checkoutSOLANA,
			BTC: checkoutBTC,
		}[network]?.(selectedAddress, price);

		return {
			confirmed,
		};
	} catch (e) {
		const error = new Error("zelfName_not_found");
		error.status = 404;
		throw error;
	}
};

//verificar balance  ETH
const checkoutETH = async (address, price) => {
	address =
		config.env === "development"
			? "0x71C7656EC7ab88b098defB751B7401B5f6d8976F"
			: address;
	try {
		const balanceETH = await getAddress({
			address,
		});

		const balance = new BigNumber(balanceETH.balance);

		const { USD } = await calculateCryptoValue("ETH", balance);

		if (USD.toFixed(2) >= price) {
			return true;
		}
	} catch (error) {}

	return false;
};
//verificar balance  SOlANA
const checkoutSOLANA = async (address, price) => {
	address =
		config.env === "development"
			? "D27DgiipBR5dRdij2L6NQ27xwyiLK5Q2DsEM5ML5EuLK"
			: address;
	try {
		const balanceSOLANA = await solanaModule.getAddress({ id: address });

		const balance = new BigNumber(balanceSOLANA.balance);

		const { USD } = await calculateCryptoValue("SOL", balance);

		if (USD.toFixed(2) >= price) {
			return true;
		}
	} catch (error) {}

	return false;
};

/**
 * checkout BTC
 * @param {String} address
 * @param {Number} price
 * @returns
 */
const checkoutBTC = async (address, price) => {
	address =
		config.env === "development"
			? "bc1q6zn0ea7p3jmn5e4jpfpp8m9ffkaz4ma6wayuna"
			: address;
	try {
		const balanceBTC = await getBalance({
			id: address,
		});

		const balance = new BigNumber(balanceBTC.balance);

		const { USD } = await calculateCryptoValue("BTC", balance);

		if (USD.toFixed(2) >= price) {
			return true;
		}
	} catch (error) {}

	return false;
};

const calculateCryptoValue = async (network, amount) => {
	try {
		const { price } = await getTickerPrice({ symbol: `${network}` });

		if (!price) {
			throw new Error(
				`No se encontró información para la criptomoneda: ${network}`
			);
		}

		// Cálculo preciso con BigNumber
		const USD = new BigNumber(amount).multipliedBy(new BigNumber(price));

		return { USD };
	} catch (error) {
		throw error;
	}
};

/**
 * clone zelf name to production
 * @param {Object} zelfNameObject
 * @author Miguel Trevino
 */
const _cloneZelfNameToProduction = async (zelfNameObject) => {
	const duration =
		zelfNameObject.publicData.duration === "lifetime"
			? 100
			: zelfNameObject.publicData.duration || 1;

	const expiresAt = moment()
		.add(duration, "year")
		.format("YYYY-MM-DD HH:mm:ss");

	const payload = {
		base64: zelfNameObject.zelfProofQRCode,
		name:
			zelfNameObject.preview?.publicData.zelfName ||
			zelfNameObject.publicData.zelfName.replace(".hold", ""),
		metadata: {
			hasPassword: `${
				Boolean(zelfNameObject.preview?.passwordLayer === "Password") ||
				Boolean(zelfNameObject.hasPassword) ||
				zelfNameObject.publicData.hasPassword
			}`,
			zelfProof: zelfNameObject.publicData.zelfProof,
			...zelfNameObject.preview?.publicData,
			expiresAt,
			type: "mainnet",
		},
		pinIt: true,
	};

	const masterIPFSRecord = await IPFSModule.insert(payload, { pro: true });

	const masterArweaveRecord = await ArweaveModule.zelfNameRegistration(
		zelfNameObject.zelfProofQRCode,
		{
			hasPassword: payload.metadata.hasPassword,
			zelfProof: payload.metadata.zelfProof,
			publicData: {
				...zelfNameObject.preview?.publicData,
				type: "mainnet",
				expiresAt,
			},
		}
	);

	return {
		masterArweaveRecord,
		masterIPFSRecord,
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

	const password = await sessionModule.sessionDecrypt(
		data.password || null,
		authUser
	);

	const mnemonic = await sessionModule.sessionDecrypt(
		data.mnemonic || null,
		authUser
	);

	const face = await sessionModule.sessionDecrypt(
		data.faceBase64 || null,
		authUser
	);

	return { password, mnemonic, face };
};

const _findDuplicatedZelfName = async (
	zelfName,
	environment = "both",
	authUser,
	returnResults = false
) => {
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

	if (!notFound)
		return searchResult.ipfs?.length
			? searchResult.ipfs[0]
			: searchResult.arweave[0];

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
 * preview Zelf name
 * @param {String} zelfName
 * @param {Object} authUser
 */
const previewZelfProof = async (zelfProof, authUser) => {
	let zelfNameObject = await preview({ zelfProof });

	return zelfNameObject;
};

/**
 * preview with IPFS
 * @param {Object} params
 * @param {Object} authUser
 * @author Miguel Trevino
 */
const _previewWithIPFS = async (params, authUser) => {
	try {
		const searchResult = await _searchInIPFS(
			params.environment,
			params,
			{ ...authUser, pro: true },
			false
		);

		if (!searchResult || searchResult?.available)
			throw new Error("404:not_found");

		const zelfNameObject = searchResult.ipfs?.length
			? searchResult.ipfs[0]
			: searchResult.arweave[0] || searchResult[0];

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

/**
 * decrypt zelfName
 * @param {Object} params
 * @param {Object} authUser
 */
const decryptZelfName = async (params, authUser) => {
	const zelfNameObjects = await _findZelfName(
		{ zelfName: params.zelfName },
		"both",
		authUser
	);

	const zelfNameObject = zelfNameObjects[0];

	const { face, password } = await _decryptParams(params, authUser);

	const decryptedZelfProof = await decrypt({
		zelfProof: zelfNameObject.zelfProof || params.zelfProof,
		faceBase64: face,
		password,
		addServerPassword: Boolean(params.addServerPassword),
	});

	if (decryptedZelfProof.error) {
		const error = new Error(decryptedZelfProof.error.code);
		error.status = 409;
		throw error;
	}

	return {
		zelfName: zelfNameObject.publicData.zelfName,
		image: zelfNameObject.zelfProofQRCode,
		metadata: decryptedZelfProof.metadata,
		url: zelfNameObject.url,
		publicData: {
			...zelfNameObject.publicData,
			...decryptedZelfProof.publicData,
		},
	};
};

const leaseOffline = async (params, authUser) => {
	const { zelfName, duration, zelfProof, zelfProofQRCode } = params;

	let mainnetRecord = null;
	let holdRecord = null;
	let zelfNameRecords = [];

	try {
		zelfNameRecords = await previewZelfName(
			{ zelfName, environment: "both" },
			authUser
		);
	} catch (exception) {}

	for (let index = 0; index < zelfNameRecords.length; index++) {
		const ipfsRecord = zelfNameRecords[index];

		if (ipfsRecord.publicData.type === "hold") holdRecord = ipfsRecord;

		if (ipfsRecord.publicData.type === "mainnet") mainnetRecord = ipfsRecord;
	}

	const _zelfProof =
		holdRecord?.publicData?.zelfProof || mainnetRecord?.publicData?.zelfProof;

	if (zelfNameRecords.length === 2 || mainnetRecord) {
		const error = new Error("zelfName_purchased_already");
		error.status = 409;
		throw error;
	}

	let _preview = holdRecord?.preview || mainnetRecord?.preview;

	const zelfNameObject = {
		zelfName: `${zelfName}.hold`,
		zelfProof,
		image: zelfProofQRCode,
		price: _calculateZelfNamePrice(zelfName.length - 5, duration),
	};

	if (!_preview)
		_preview = await preview({ zelfProof: zelfNameObject.zelfProof });

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
				expiresAt: moment().add(12, "hour").format("YYYY-MM-DD HH:mm:ss"),
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

const update = async (params, authUser) => {
	const { duration } = params;
	const { zelfName } = authUser;

	const zelfNameRecords = await previewZelfName(
		{ zelfName, environment: "both" },
		authUser
	);

	if (!zelfNameRecords.length) {
		const error = new Error("zelfName_not_found");
		error.status = 404;
		throw error;
	}

	const holdRecord = zelfNameRecords.find(
		(record) => record.publicData.type === "hold"
	);

	// check if holdDuration is == same as the duration passed on params
	if (holdRecord.publicData.duration === duration) {
		const error = new Error("hold_duration_is_the_same");
		error.status = 409;
		throw error;
	}

	if (!holdRecord) {
		const error = new Error("zelfName_not_found");
		error.status = 404;
		throw error;
	}

	const { ipfs_pin_hash, publicData } = holdRecord;

	holdRecord.price = _calculateZelfNamePrice(
		holdRecord.zelfName.split(".zelf")[0].length,
		duration,
		holdRecord.publicData.referralZelfName
	);

	holdRecord.coinbaseCharge = await createCoinbaseCharge({
		name: `${holdRecord.zelfName}`,
		description: `Purchase of the Zelf Name > ${holdRecord.zelfName} for $${holdRecord.price}`,
		pricing_type: "fixed_price",
		local_price: {
			amount: holdRecord.price,
			currency: "USD",
		},
		metadata: {
			duration,
			zelfName: holdRecord.zelfName,
			ethAddress: holdRecord.preview?.ethAddress,
			btcAddress: holdRecord.preview?.btcAddress,
			solanaAddress: holdRecord.preview?.solanaAddress,
		},
		redirect_url: "https://purchase.zelf.world/#/coinbase-success",
		cancel_url: "https://purchase.zelf.world/#/coinbase-cancel",
	});

	const updatedRecord = await IPFSModule.update(
		ipfs_pin_hash,
		{
			base64: holdRecord.zelfProofQRCode,
			name: holdRecord.zelfName,
			metadata: {
				...publicData,
				price: `${holdRecord.price}`,
				duration,
				coinbase_hosted_url: holdRecord.coinbaseCharge.hosted_url,
			},
			pinIt: true,
		},
		{ ...authUser, pro: true }
	);

	return updatedRecord;
};

module.exports = {
	searchZelfName,
	leaseZelfName,
	leaseConfirmation,
	previewZelfName,
	previewZelfProof,
	decryptZelfName,
	_calculateZelfNamePrice,
	_confirmCoinbaseCharge,
	leaseOffline,
	saveInProduction: _cloneZelfNameToProduction,
	update,
};
