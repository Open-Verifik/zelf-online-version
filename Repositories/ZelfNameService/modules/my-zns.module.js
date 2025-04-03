const config = require("../../../Core/config");
const jwt = require("jsonwebtoken");
const { searchZelfName, createZelfPay, updateZelfPay } = require("./zns.v2.module");
const moment = require("moment");
const { getTickerPrice } = require("../../binance/modules/binance.module");

// TODO
// 1. expire zelfpay domains after the month

const renewMyZelfName = async (zelfName, years = 1) => {
	// 1. validate that the zelfName exists
	// 2. validate that the payment has been done successfully
	// 3. renew the zelfName

	return {
		renew: true,
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
	const { zelfName, registeredAt } = zelfNameObject.publicData;

	const _zelfName = zelfName.includes(".hold") ? zelfName.replace(".zelf.hold", ".zelfpay") : zelfName.replace(".zelf", ".zelfpay");

	const zelfPayRecords = await searchZelfName({ zelfName: _zelfName });

	const records = zelfPayRecords.ipfs?.length
		? zelfPayRecords.ipfs.filter((record) => moment(registeredAt).isBefore(record.publicData.registeredAt))
		: zelfPayRecords.arweave?.filter((record) => moment(registeredAt).isBefore(record.publicData.registeredAt));

	let renewZelfPayObject = null;

	const recordsFound = records?.length || 0;

	if (recordsFound < currentCount || recordsFound === 0) {
		// we need to create a new zelfPay record
		const newZelfPayRecord = await createZelfPay(zelfNameObject, currentCount + 1);

		return newZelfPayRecord.ipfs || newZelfPayRecord.arweave;
	}

	for (let index = 0; index < records.length; index++) {
		const record = records[index];

		if (record.publicData.type !== "mainnet") continue;

		const count = parseInt(record.publicData.count);

		const recordDuration = parseInt(record.publicData.duration);

		if ((!renewZelfPayObject || count > parseInt(renewZelfPayObject.publicData.count)) && recordDuration === duration) {
			renewZelfPayObject = record;
		}
	}

	if (moment(renewZelfPayObject.publicData.coinbase_expires_at).isBefore(moment())) {
		const newZelfPayRecord = await updateZelfPay(renewZelfPayObject, { newCoinbaseUrl: true });

		return newZelfPayRecord.ipfs || newZelfPayRecord.arweave;
	}

	return renewZelfPayObject;
};

const howToRenewMyZelfName = async (params) => {
	const { zelfName, duration, lockedJWT } = params;

	const publicKeys = await searchZelfName({ zelfName });

	const zelfNameObject = publicKeys.ipfs?.length ? publicKeys.ipfs[0] : publicKeys.arweave?.length ? publicKeys.arweave[0] : null;

	const recordsWithSameName = publicKeys.ipfs?.length || publicKeys.arweave?.length;

	const renewZelfPayObject = await _fetchZelfPayRecord(zelfNameObject, recordsWithSameName, duration);

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
		zelfName,
		expiresAt: zelfNameObject.publicData.expiresAt,
		duration: parseInt(duration || 1),
		coinbase_hosted_url: renewZelfPayObject.publicData.coinbase_hosted_url,
		coinbase_expires_at: renewZelfPayObject.publicData.coinbase_expires_at,
		count: parseInt(renewZelfPayObject.publicData.count),
	};

	const signedDataPrice = signRecordData(returnData);

	return {
		...returnData,
		zelfNameObject,
		renewZelfPayObject,
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
		const token = jwt.sign(recordData, config.signedData.key);
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
