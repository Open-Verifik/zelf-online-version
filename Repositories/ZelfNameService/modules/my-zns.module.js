const config = require("../../../Core/config");
const jwt = require("jsonwebtoken");
const { searchZelfName, createZelfPay, updateZelfPay } = require("./zns.v2.module");
const moment = require("moment");
const { getTickerPrice } = require("../../binance/modules/binance.module");
const { getCoinbaseCharge } = require("../../coinbase/modules/coinbase_commerce.module");
const { confirmPayUniqueAddress } = require("../../purchase-zelf/modules/balance-checker.module");
const ArweaveModule = require("../../Arweave/modules/arweave.module");
const IPFSModule = require("../../IPFS/modules/ipfs.module");
const ZNSPartsModule = require("./zns-parts.module");
const { addReferralReward, addPurchaseReward, getPurchaseReward } = require("./zns-token.module");
const MongoORM = require("../../../Core/mongo-orm");

const _confirmPaymentWithCoinbase = async (coinbase_hosted_url) => {
	const chargeID = coinbase_hosted_url?.split("/pay/")[1];

	if (!chargeID) {
		const error = new Error("coinbase_charge_id_not_found");
		error.status = 404;
		throw error;
	}

	const charge = await getCoinbaseCharge(chargeID);

	if (!charge) {
		const error = new Error("coinbase_charge_not_found");
		error.status = 404;
		throw error;
	}

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

const renewMyZelfName = async (params, authUser) => {
	let payment;

	switch (params.network) {
		case "coinbase":
		case "CB":
			payment = await _confirmPaymentWithCoinbase(authUser.coinbase_hosted_url);
			break;
		case "ETH":
			payment = await confirmPayUniqueAddress("ETH", authUser);
			break;
		case "SOL":
			payment = await confirmPayUniqueAddress("SOL", authUser);
			break;
		case "BTC":
			payment = await confirmPayUniqueAddress("BTC", authUser);
			break;
		default:
			break;
	}

	const publicKeys = await searchZelfName({ zelfName: authUser.zelfName });

	const zelfNameObjectFound = Boolean(publicKeys.ipfs?.length || publicKeys.arweave?.length);

	if (!zelfNameObjectFound && !payment.confirmed) {
		const error = new Error("zelfName_not_found");
		error.status = 404;
		throw error;
	}

	if (payment.confirmed && !zelfNameObjectFound) {
		return {
			payment,
			confirmed: true,
			zelfName: authUser.zelfName,
			reward: await getPurchaseReward(authUser.zelfName.replace(".hold", "")),
		};
	}

	let zelfNameObject;

	if (publicKeys.ipfs?.length === 1) {
		zelfNameObject = publicKeys.ipfs[0];
	} else if (publicKeys.ipfs?.length > 1) {
		zelfNameObject = publicKeys.ipfs.reduce((latest, current) => {
			return moment(current.publicData.expiresAt).isAfter(moment(latest.publicData.expiresAt)) ? current : latest;
		});
	} else if (publicKeys.arweave?.length === 1) {
		zelfNameObject = publicKeys.arweave[0];
	} else if (publicKeys.arweave?.length > 1) {
		zelfNameObject = publicKeys.arweave.reduce((latest, current) => {
			return moment(current.publicData.expiresAt).isAfter(moment(latest.publicData.expiresAt)) ? current : latest;
		});
	}

	// second + time
	if (
		(zelfNameObject.publicData.renewedAt &&
			authUser.payment?.registeredAt &&
			moment(zelfNameObject.publicData.renewedAt).isAfter(moment(authUser.payment.registeredAt))) ||
		(!zelfNameObject.publicData.renewedAt &&
			authUser.payment?.registeredAt &&
			moment(zelfNameObject.publicData.registeredAt).isAfter(moment(authUser.payment.registeredAt)))
	) {
		return {
			cache: true,
			payment,
			publicData: zelfNameObject.publicData,
			reward: await getPurchaseReward(zelfNameObject.publicData.zelfName, moment(authUser.payment.registeredAt)),
		};
	}

	if (payment?.confirmed) {
		const { masterArweaveRecord, masterIPFSRecord, reward, referralSolanaAddress, referralZelfName } = await _addDurationToZelfName(authUser);

		return {
			referralSolanaAddress,
			referralZelfName,
			confirmed: true,
			ipfs: masterIPFSRecord,
			arweave: masterArweaveRecord,
			reward,
			payment,
		};
	}

	return {
		renew: authUser.zelfName.includes(".hold") ? false : true,
		confirmed: payment.confirmed,
		payment,
		referralSolanaAddress: zelfNameObject.publicData.referralSolanaAddress,
		referralZelfName: zelfNameObject.publicData.referralZelfName,
	};
};

const _addDurationToZelfName = async (authUser) => {
	const { zelfName, duration } = authUser;
	// 1. get the zelfName object
	const publicKeys = await searchZelfName({ zelfName });

	const zelfNameObject = publicKeys.ipfs?.length ? publicKeys.ipfs[0] : publicKeys.arweave?.length ? publicKeys.arweave[0] : null;

	if (!zelfNameObject) {
		const error = new Error("zelfName_not_found");
		error.status = 404;
		throw error;
	}

	const base64 = await ZNSPartsModule.urlToBase64(zelfNameObject.url);

	const payload = {
		base64,
		name: zelfName.replace(".hold", ""),
		metadata: {
			hasPassword: zelfNameObject.publicData.hasPassword,
			zelfProof: zelfNameObject.publicData.zelfProof,
			zelfName: zelfName.replace(".hold", ""),
			ethAddress: zelfNameObject.publicData.ethAddress,
			solanaAddress: zelfNameObject.publicData.solanaAddress,
			btcAddress: zelfNameObject.publicData.btcAddress,
			extraParams: JSON.stringify({
				...(zelfNameObject.publicData.suiAddress && { suiAddress: zelfNameObject.publicData.suiAddress }),
				origin: zelfNameObject.publicData.origin || "online",
				registeredAt:
					zelfNameObject.publicData.type === "mainnet" ? zelfNameObject.publicData.registeredAt : moment().format("YYYY-MM-DD HH:mm:ss"),
				renewedAt: zelfNameObject.publicData.type === "mainnet" ? moment().format("YYYY-MM-DD HH:mm:ss") : undefined,
				expiresAt: moment(zelfNameObject.publicData.expiresAt).add(duration, "year").format("YYYY-MM-DD HH:mm:ss"),
				count: parseInt(zelfNameObject.publicData.count) + 1,
			}),
			type: "mainnet",
		},
		pinIt: true,
	};

	const masterArweaveRecord = await ArweaveModule.zelfNameRegistration(base64, {
		hasPassword: payload.metadata.hasPassword,
		zelfProof: payload.metadata.zelfProof,
		publicData: payload.metadata,
	});

	await IPFSModule.unPinFiles([zelfNameObject.ipfs_pin_hash || zelfNameObject.IpfsHash]);

	const masterIPFSRecord = await IPFSModule.insert(payload, { pro: true });

	let reward = null;

	if (zelfNameObject.publicData.type === "hold") {
		reward = await addPurchaseReward({
			ethAddress: masterIPFSRecord.metadata.ethAddress,
			solanaAddress: masterIPFSRecord.metadata.solanaAddress,
			zelfName: masterIPFSRecord.metadata.zelfName,
			zelfNamePrice: zelfNameObject.publicData.price,
			ipfsHash: masterIPFSRecord.IpfsHash,
			arweaveId: masterArweaveRecord.id,
		});
	}

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

	return {
		referralZelfName: zelfNameObject.publicData.referralZelfName,
		referralSolanaAddress: zelfNameObject.publicData.referralSolanaAddress,
		masterArweaveRecord,
		masterIPFSRecord: await ZNSPartsModule.formatIPFSRecord(masterIPFSRecord, true),
		reward,
	};
};

const transferMyZelfName = async (zelfName, newOwner) => {
	// 1. validate that the zelfName exists
	// 2. validate that the newOwner exists
	// 3. transfer the zelfName

	return {
		transfer: true,
	};
};

const _fetchZelfPayRecord = async (zelfNameObject, currentCount, duration = 1) => {
	const { zelfName, registeredAt, renewedAt } = zelfNameObject.publicData;

	const _zelfName = zelfName.includes(".hold") ? zelfName.replace(".zelf.hold", ".zelfpay") : zelfName.replace(".zelf", ".zelfpay");

	let zelfPayRecords = await searchZelfName({ zelfName: _zelfName });

	zelfPayRecords = zelfPayRecords.ipfs?.length
		? zelfPayRecords.ipfs.filter((record) => {
				const comparisonDate = renewedAt ? moment(renewedAt) : moment(registeredAt);
				return comparisonDate.isBefore(record.publicData.registeredAt);
		  })
		: zelfPayRecords.arweave?.filter((record) => {
				const comparisonDate = renewedAt ? moment(renewedAt) : moment(registeredAt);
				return comparisonDate.isBefore(record.publicData.registeredAt);
		  });

	let renewZelfPayObject = null;

	const recordsFound = zelfPayRecords?.length || 0;

	if (recordsFound < currentCount || recordsFound === 0) {
		// we need to create a new zelfPay record
		const newZelfPayRecord = await createZelfPay(zelfNameObject, currentCount + 1);

		return newZelfPayRecord.ipfs || newZelfPayRecord.arweave;
	}

	for (let index = 0; index < zelfPayRecords.length; index++) {
		const record = zelfPayRecords[index];

		if (record.publicData.type !== "mainnet") continue;

		const count = parseInt(record.publicData.count);

		const recordDuration = parseInt(record.publicData.duration);

		if ((!renewZelfPayObject || count > parseInt(renewZelfPayObject.publicData.count)) && recordDuration === duration) {
			renewZelfPayObject = record;
		}
	}

	if (renewZelfPayObject && moment(renewZelfPayObject.publicData.coinbase_expires_at).isBefore(moment())) {
		const newZelfPayRecord = await updateZelfPay(renewZelfPayObject, { newCoinbaseUrl: true });

		return newZelfPayRecord.ipfs || newZelfPayRecord.arweave;
	} else if (!renewZelfPayObject) {
		zelfNameObject.publicData.duration = duration;

		const newZelfPayRecord = await createZelfPay(zelfNameObject, currentCount + 1);

		return newZelfPayRecord.ipfs || newZelfPayRecord.arweave;
	}

	return renewZelfPayObject;
};

const howToRenewMyZelfName = async (params) => {
	const { zelfName, lockedJWT } = params;

	const duration = params.duration === "lifetime" ? "lifetime" : parseInt(params.duration || 1);

	const publicKeys = await searchZelfName({ zelfName });

	const zelfNameObject = publicKeys.ipfs?.length ? publicKeys.ipfs[0] : publicKeys.arweave?.length ? publicKeys.arweave[0] : null;

	if (!zelfNameObject) {
		const error = new Error("zelfName_not_found");
		error.status = 404;
		throw error;
	}

	const recordsWithSameName = publicKeys.ipfs?.length || publicKeys.arweave?.length;

	const renewZelfPayObject = await _fetchZelfPayRecord(zelfNameObject, recordsWithSameName, duration);

	if (!renewZelfPayObject) {
		const error = new Error("zelfPayRecord_not_found");
		error.status = 404;
		throw error;
	}

	const paymentAddress = {
		ethAddress: renewZelfPayObject.publicData.ethAddress,
		btcAddress: renewZelfPayObject.publicData.btcAddress,
		solanaAddress: renewZelfPayObject.publicData.solanaAddress,
	};

	const ethPrices = await calculateCryptoValue("ETH", renewZelfPayObject.publicData.price);

	const solPrices = await calculateCryptoValue("SOL", renewZelfPayObject.publicData.price);

	const returnData = {
		paymentAddress,
		ethPrices,
		solPrices,
		zelfName: zelfNameObject.publicData.zelfName,
		expiresAt: zelfNameObject.publicData.expiresAt,
		ttl: moment().add("2", "hours").unix(),
		duration: parseInt(duration || 1),
		coinbase_hosted_url: renewZelfPayObject.publicData.coinbase_hosted_url,
		coinbase_expires_at: renewZelfPayObject.publicData.coinbase_expires_at,
		count: parseInt(renewZelfPayObject.publicData.count),
		payment: {
			registeredAt: renewZelfPayObject.publicData.registeredAt,
			expiresAt: renewZelfPayObject.publicData.expiresAt,
			referralZelfName: zelfNameObject.publicData.referralZelfName,
			referralSolanaAddress: zelfNameObject.publicData.referralSolanaAddress,
		},
	};

	const signedDataPrice = signRecordData(returnData);

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

const signRecordData = (recordData) => {
	try {
		const token = jwt.sign(recordData, config.JWT_SECRET);

		return token;
	} catch (error) {
		return { success: false, error: error.message };
	}
};

module.exports = {
	renewMyZelfName,
	transferMyZelfName,
	howToRenewMyZelfName,
};
