const config = require("../../../Core/config");
const { getTickerPrice } = require("../../binance/modules/binance.module");
const { previewZelfName } = require("../../ZelfNameService/modules/zns.module");
const MongoORM = require("../../../Core/mongo-orm");
const mongoose = require("mongoose");
const {
	leaseConfirmation,
	_confirmCoinbaseCharge,
	_calculateZelfNamePrice,
} = require("../../ZelfNameService/modules/zns.module");
const {
	getTransactionStatus,
	getAddress,
} = require("../../etherscan/modules/etherscan-scrapping.module");

const solanaModule = require("../../Solana/modules/solana-scrapping.module");
const modelPurchase = require("../models/purchase.model");
const addressZelf = config.addressZelf;

/**
 * @param {*} params
 */
const getCheckout = async (params) => {
	console.log(params);
	console.log(params.zelfName);
	const purchase = await MongoORM.buildQuery(
		{
			where_zelfName: params.zelfName,
			findOne: true,
		},
		modelPurchase
	);

	console.log({ purchase });
	if (!purchase) {
		const error = new Error("transaction_not_found");
		error.status = 409;
		throw error;
	}

	const previewData =
		(await previewZelfName({ zelfName: purchase.zelfName })) || [];

	console.log(previewData);

	const {
		address,
		crypto,
		duration,
		zelfName,
		ratePriceInUSDT,
		amountToSend,
		remainingTime,
		lastSavedTime,
		_id,
		USD,
		wordsCount,
		amountDetected,
	} = purchase;

	const paymentAddress =
		addressZelf.find((method) => method.id === crypto)?.address?.toString() ||
		"default_address";

	const origin_address = {
		ETH: address.ethAddress,
		SOL: address.solanaAddress,
		BTC: address.btcAddress,
	}[crypto];

	return {
		crypto,
		duration,
		zelfName,
		paymentAddress,
		ratePriceInUSDT,
		amountToSend,
		remainingTime,
		lastSavedTime,
		USD,
		wordsCount,
		_id,
		amountDetected,
		origin_address,
	};
};

const pay = async (params) => {
	const purchase = await modelPurchase.findById(params.id);

	if (!purchase) {
		const error = new Error("expired_payments");
		error.status = 409;
		throw error;
	}

	const {
		address,
		crypto,
		duration,
		zelfName,
		ratePriceInUSDT,
		amountToSend,
		_id,
		remainingTime,
		lastSavedTime,
		USD,
		wordsCount,
		coinbase_hosted_url,
	} = purchase;

	const origin_address = {
		ETH: address.ethAddress,
		SOL: address.solanaAddress,
		BTC: address.btcAddress,
	}[crypto];

	const paymentAddress =
		addressZelf.find((method) => method.id === crypto)?.address?.toString() ||
		"default_address";

	if (crypto === "CB") {
		return await checkoutPayCoinbase(coinbase_hosted_url, zelfName);
	}

	return await checkoutPay(
		crypto,
		origin_address,
		amountToSend,
		ratePriceInUSDT,
		zelfName,
		duration,
		paymentAddress,
		_id
	);
};

///funcion para checar transacciones global
/**
 * @param {string} crypto
 *
 * @param {string} origin_address
 *
 * @param {string} valorApagar
 *
 * @param {string} ratePriceInUSDT
 *
 * @param {string} zelfName
 *
 * @param {string} duration
 */
const checkoutPay = async (
	crypto,
	origin_address,
	amountToSend,
	ratePriceInUSDT,
	zelfName,
	duration,
	paymentAddress,
	_id
) => {
	const transaction = await {
		ETH: checkoutETH,
		SOL: checkoutSOLANA,
		BTC: checkoutBICOIN,
	}[crypto]?.(paymentAddress);

	const addressLastTransaction = transaction?.from || "";
	let amountDetected = transaction?.value || "0.17143769"; // Valor por defecto para pruebas
	let transactionStatus = false;
	let transactionDescription = "pending";

	console.log(addressLastTransaction);

	if (origin_address === addressLastTransaction) {
		if (amountDetected === amountToSend) {
			transactionStatus = true;
			transactionDescription = "successful";
		} else if (amountDetected < amountToSend) {
			transactionDescription = "partial_payment";
		} else {
			transactionStatus = true;
			transactionDescription = "overpayment";
		}
	} else {
		amountDetected = "0";
	}

	return {
		transactionDescription,
		transactionStatus,
		amountDetected,
	};
};

const checkoutPayCoinbase = async (coinbase_hosted_url, zelfName) => {
	const payment = await _confirmCoinbaseCharge({
		publicData: { coinbase_hosted_url },
	});

	payment.confirmed = true;

	if (!payment.confirmed) {
		return {
			transactionDescription: "pending",
			transactionStatus: false,
		};
	}

	await leaseConfirmation({ zelfName, coin: "coinbase", network: "coinbase" });
	return {
		transactionDescription: "successful",
		transactionStatus: true,
	};
};

///funcion para checar transacciones en ETH
/**
 * @param {string} address
 */
const checkoutETH = async (address) => {
	console.log({ address });
	const { transactions } = await getAddress({
		address,
	});

	const UltimaTxhash = await getLastInTransactionHash(transactions);

	const transaction = await getTransactionStatus({ id: UltimaTxhash });

	return {
		status: transaction.status,
		from: transaction.from,
		to: transaction.to,
		value: transaction.valueETH,
	};
};
///funcion para checar transacciones en SOLANA
const checkoutSOLANA = async (address) => {
	console.log({ address });

	const { transactions } = await solanaModule.getTransactionsList(
		{ id: address },
		{ show: "10" }
	);

	function lamportsToSol(lamports) {
		const lamportsPerSol = 1000000000;
		return lamports / lamportsPerSol;
	}

	return {
		status: transactions[0].status,
		from: transactions[0].signer[0],
		to: address,
		value: lamportsToSol(transactions[0].sol_value).toString(),
	};
};

///funcion para checar transacciones en BICOIN
/**
 * @param {string} address
 */
const checkoutBICOIN = async (address) => {
	console.log({ address });
};

getLastInTransactionHash = async (transactions) => {
	const inTransactions = transactions.filter((txn) => txn.traffic === "IN");

	if (inTransactions.length === 0) {
		return null;
	}

	const latestInTransaction = inTransactions.reduce((latest, current) => {
		return parseInt(current.block) > parseInt(latest.block) ? current : latest;
	});

	return latestInTransaction.hash;
};

/**
 * @param {string} crypto
 */
const calculateCryptoValue = async (crypto, zelfName, duration) => {
	const originalZelfName = zelfName.split(".zelf")[0];
	const wordsCount = originalZelfName.length;

	try {
		const { price } = await getTickerPrice({ symbol: `${crypto}USDT` });

		if (!price) {
			throw new Error(
				`No se encontró información para la criptomoneda: ${crypto}`
			);
		}

		const priceBase = _calculateZelfNamePrice(wordsCount, duration);

		const cryptoValue = priceBase / price;

		console.log(cryptoValue);

		return {
			crypto,
			amountToSend: cryptoValue.toFixed(8),
			ratePriceInUSDT: parseFloat(price).toFixed(5),
			wordsCount, // Cantidad de caracteres
			USD: priceBase,
			duration,
			zelfName: originalZelfName, // Devuelve la cadena original
		};
	} catch (error) {
		console.error("Error al obtener el valor de la criptomoneda:");
		throw error;
	}
};

const clock_sync = async (params) => {
	const purchase = await modelPurchase.findById(params.id);
	if (!purchase) {
		const error = new Error("clock_synchronization_failure");
		error.status = 409;
		throw error;
	}
	purchase.remainingTime = "240";
	purchase.lastSavedTime = Date.now().toString();

	updatedRecord = await modelPurchase.findByIdAndUpdate(
		params.id,
		{
			remainingTime: "240",
			lastSavedTime: Date.now().toString(),
		},
		{
			new: true,
		}
	);

	return {
		remainingTime: updatedRecord.remainingTime,
		lastSavedTime: updatedRecord.lastSavedTime,
	};
};
const select_method = async (crypto, zelfName, duration) => {
	const purchase = await MongoORM.buildQuery(
		{
			where_zelfName: zelfName,
			findOne: true,
		},
		modelPurchase
	);

	if (crypto === "CB") {
		return await transactionGenerateCB(purchase, duration);
	}

	if (!purchase) {
		const error = new Error("id_null");
		error.status = 409;
		throw error;
	}

	let paymentAddress =
		addressZelf.find((method) => method.id === crypto)?.address?.toString() ||
		"default_address";

	if (purchase.crypto !== crypto) {
		const cryptoValue =
			(await calculateCryptoValue(crypto, zelfName, duration)) || {};

		const recordData = {
			crypto,
			amountToSend: cryptoValue.amountToSend || 0,
			ratePriceInUSDT: cryptoValue.ratePriceInUSDT || 0,
		};

		const updatedRecord = await modelPurchase.findByIdAndUpdate(
			purchase._id,
			recordData,
			{ new: true }
		);

		return { ...cleanResponse(updatedRecord), paymentAddress };
	}

	if (purchase.duration !== duration) {
		///const previewData = (await previewZelfName({ zelfName: zelfName })) || [];
		// console.log(cryptoValue);
		// const newDuration = previewData[0]?.publicData?.duration || duration;
		const cryptoValue =
			(await calculateCryptoValue(crypto, zelfName, duration)) || {};
		console.log(cryptoValue);
		const recordData = {
			zelfName: zelfName,
			duration: duration,
			crypto: crypto,
			amountToSend: cryptoValue.amountToSend || 0,
			wordsCount: cryptoValue.wordsCount || 0,
			USD: cryptoValue.USD || 0,
			// coinbase_hosted_url:
			// 	previewData[0]?.publicData?.coinbase_hosted_url || "",
		};

		const updatedRecord = await modelPurchase.findByIdAndUpdate(
			purchase._id,
			recordData,
			{ new: true }
		);

		return { ...cleanResponse(updatedRecord), paymentAddress };
	}

	return { ...cleanResponse(purchase), paymentAddress };
};

const transactionGenerate = async (crypto = "ETH", zelfName) => {
	const previewData = await previewZelfName({
		zelfName: zelfName,
	});

	if (previewData[0].publicData.type === "mainnet") {
		const error = new Error("zelfName_purchased_already");
		error.status = 409;
		throw error;
	}

	const existingRecord = await MongoORM.buildQuery(
		{
			where_zelfName: zelfName,
			findOne: true,
		},
		modelPurchase
	);
	if (existingRecord) {
		return cleanResponse(existingRecord);
	}
	console.log(previewData[0].publicData.price);
	const duration = previewData[0].publicData.duration;

	result = await calculateCryptoValue(crypto, zelfName, duration);

	recordData = {
		zelfName: zelfName,
		duration: previewData[0].publicData.duration,
		crypto: crypto,
		wordsCount: result.wordsCount,
		USD: previewData[0].publicData.price,
		//address: previewData[0].preview.publicData,
		//coinbase_hosted_url: previewData[0].publicData.coinbase_hosted_url,
	};
	const newRecord = new modelPurchase({
		...recordData,
		amountToSend: result.amountToSend,
		ratePriceInUSDT: result.ratePriceInUSDT,
	});
	if (!existingRecord) {
		const savedRecord = await newRecord.save();

		return cleanResponse(savedRecord);
	}
};

const transactionGenerateCB = async (purchase, duration) => {
	const zelfName = purchase.zelfName;
	if (purchase.duration !== duration) {
		///const previewData = (await previewZelfName({ zelfName: zelfName })) || [];

		const wordsCount = zelfName.split(".zelf")[0].length;

		const priceBase = _calculateZelfNamePrice(wordsCount, duration);

		const recordData = {
			zelfName: zelfName,
			duration: duration,
			crypto: "CB",
			wordsCount: wordsCount,
			USD: priceBase || 0,
			// coinbase_hosted_url:
			// 	previewData[0]?.publicData?.coinbase_hosted_url || "",
		};

		const updatedRecord = await modelPurchase.findByIdAndUpdate(
			purchase._id,
			recordData,
			{ new: true }
		);
		delete updatedRecord.amountToSend;

		return {
			...cleanResponse(updatedRecord),
		};
	}

	const updatedRecord = await modelPurchase.findByIdAndUpdate(
		purchase._id,
		{
			duration: purchase.duration,
			crypto: "CB",
			_id: purchase._id,
		},
		{ new: true }
	);
	delete updatedRecord.amountToSend;
	return { ...cleanResponse(updatedRecord) };
};

const getLease_confirmation_pay = (params) => {
	//leaseConfirmation({network:, coin, zelfName });
};

const cleanResponse = (record) => {
	const { _doc } = record;
	const fieldsToRemove = [
		"purchaseCreatedAt",
		"updatedAt",
		"createdAt",
		"__v",
		"_id",
		"address",
		"lastSavedTime",
		"remainingTime",
	];

	fieldsToRemove.forEach((field) => delete _doc[field]);

	return _doc;
};
module.exports = {
	getCheckout,
	checkoutPay,
	calculateCryptoValue,
	transactionGenerate,
	select_method,
	clock_sync,
	pay,
};
