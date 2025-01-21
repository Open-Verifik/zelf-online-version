const config = require("../../../Core/config");
const { getCleanInstance } = require("../../../Core/axios");
const instance = getCleanInstance(30000);
const { getTickerPrice } = require("../../binance/modules/binance.module");
const {
	leaseConfirmation,
} = require("../../ZelfNameService/modules/zns.module");
const {
	searchZelfName,
	previewZelfName,
} = require("../../ZelfNameService/modules/zns.module");
const MongoORM = require("../../../Core/mongo-orm");
const mongoose = require("mongoose");
const {
	getTransactionStatus,
	getAddress,
} = require("../../etherscan/modules/etherscan-scrapping.module");

const solanaModule = require("../../Solana/modules/solana-scrapping.module");

const modelPurchase = require("../models/purchase.model");

const addressZelf = [
	{
		id: "ETH",
		address: "0x1BC125bC681685f216935798453F70fb423eB392",
		//address: "0x9eB697C8500e4abc9cF6C4E17F1Be8508010bd23",
	},
	{
		id: "SOL",
		address: "6gDQQQMRveayDFSz5bA2wyjNZr9Jue9hS1S4kkmLDqBt",
	},
	{
		id: "BTC",
		address: "bc1p6lsrl8amjuwrwxcwaa9ncuuzljuc3zv4jg55xdruuq5nxxwnvj4qd23dxl",
	},
	{
		id: "BNB",
		address: "0xD3b0d838cCCEAe7ebF1781D11D1bB741DB7Fe1A7",
	},
	{
		id: "MINA",
		address: "B62qoA5XwfEVnXbcrzphGH1TVuqxeJ5bhX7vTS3hcxpQFHnStG3MQk9",
	},
	{
		id: "ADA",
		address: "stake1u9m0ny47rdn9x43gcg0hjmg6xsnlz80hnz7kf6v6vplqtrcd9pnhj",
	},

	{
		id: "TRX",
		address: "TXPLNPmLC7XSazCEPVZMQkyx9YEdbvFXkU",
	},
	{
		id: "XRP",
		address: "rvpkkVqZyqPFz4uzT4YbbrBMLzuUUyTdm",
	},
	//...{}
];

/**
 * @param {*} params
 */
const getCheckout = async (params) => {
	const purchase = await modelPurchase.findById(params.id);

	if (!purchase) {
		const error = new Error("expired_payments");
		error.status = 409;
		throw error;
	}

	const crypto = purchase.crypto;
	const duration = purchase.duration;
	const zelfName = purchase.zelfName;
	const paymentAddress = purchase.paymentAddress;
	const ratePriceInUSDT = purchase.ratePriceInUSDT;
	const amountToSend = purchase.amountToSend;
	const remainingTime = purchase.remainingTime;
	const lastSavedTime = purchase.lastSavedTime;
	const _id = purchase._id;
	const USD = purchase.USD;
	const wordsCount = purchase.wordsCount;
	const amountDetected = purchase.amountDetected;
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
	};
};
const pay = async (params) => {
	const purchase = await modelPurchase.findById(params.id);

	if (!purchase) {
		const error = new Error("expired_payments");
		error.status = 409;
		throw error;
	}

	const address = purchase.address;
	const crypto = purchase.crypto;
	const duration = purchase.duration;
	const zelfName = purchase.zelfName;
	const paymentAddress = purchase.paymentAddress;
	const ratePriceInUSDT = purchase.ratePriceInUSDT;
	const amountToSend = purchase.amountToSend;
	const remainingTime = purchase.remainingTime;
	const lastSavedTime = purchase.lastSavedTime;
	const _id = purchase._id;
	const USD = purchase.USD;
	const wordsCount = purchase.wordsCount;

	switch (crypto) {
		case "ETH":
			addressCliente = address.ethAddress;
			break;
		case "SOL":
			addressCliente = address.solanaAddress;
			break;
		case "BTC":
			addressCliente = address.btcAddress;
			break;
	}

	console.log({ addressCliente });
	const resposne = await checkoutPay(
		crypto,
		addressCliente,
		amountToSend,
		ratePriceInUSDT,
		zelfName,
		duration,
		paymentAddress,
		_id
	);

	// const cryptoValue = await calculateCryptoValue(crypto, zelfName, duration);
	// let reult = await checkout(
	// 	crypto,
	// 	addressCliente,
	// 	cryptoValue.cryptoValue,
	// 	ratePriceInUSDT,
	// 	zelfName,
	// 	duration
	// );
	// //reult.wordsCount = cryptoValue.wordsCount.toString();
	// reult._id = params.id;
	// ///reult.amountToSend = amountToSend;
	// //reult.USD = cryptoValue.USD.toString();
	// updatedRecord = await modelPurchase.findByIdAndUpdate(params.id, reult, {
	// 	new: true,
	// });
	return resposne;
};
///funcion para checar transacciones global
/**
 * @param {string} crypto
 *
 * @param {string} addressCliente
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
	addressCliente,
	amountToSend,
	ratePriceInUSDT,
	zelfName,
	duration,
	paymentAddress,
	_id
) => {
	switch (crypto) {
		case "ETH":
			transaction = await checkoutETH(paymentAddress);
			break;
		case "SOL":
			transaction = await checkoutSOLANA(paymentAddress);
			break;
		case "BTC":
			transaction = await checkoutBICOIN(paymentAddress);
			break;
	}

	const lastTransaction = transaction.from;

	//let amountDetected = transaction.value;

	amountDetected = "0.00723563";

	let transactionStatus = false;

	let transactionDescription = "pending"; //"transaction_not_detected";

	console.log(zelfName);

	if (addressCliente) {
		if (amountDetected === amountToSend) {
			transactionStatus = true;
			transactionDescription = "successful";
		} else if (amountToSend < amountDetected) {
			transactionStatus = false;
			transactionDescription = "partial_payment";
		} else {
			transactionStatus = true;
			transactionDescription = "overpayment";
		}
	} else {
		amountDetected = "0";
	}

	// updatedRecord = await modelPurchase.findByIdAndUpdate(
	// 	_id,
	// 	{
	// 		transactionDescription: transactionDescription,
	// 		transactionStatus: transactionStatus,
	// 		amountDetected: amountDetected, //valorDetransaccion,
	// 	},
	// 	{
	// 		new: true,
	// 	}
	// );

	// // if (updatedRecord.transactionStatus)
	// // 	await leaseConfirmation({ crypto: crypto, coin: "", zelfName: zelfName });

	// return cleanResponse(updatedRecord);

	return {
		transactionDescription: transactionDescription,
		transactionStatus: transactionStatus,
		amountDetected: amountDetected, //valorDetransaccion,
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
///funcion para buscar el zelf name asociado a address
/**
 * @param {string} zelfName
 *
 * @param {string} crypto
 */
const searchZelfName_ = async (zelfName) => {
	let status = "";
	let address = {};

	try {
		let data = await searchZelfName({
			zelfName: zelfName,
			environment: "both",
		});

		if (data?.available === true) {
			status = "available";
		} else if (data?.ipfs?.[0]?.publicData?.type === "hold") {
			status = "hold";

			const previewData = await previewZelfName({
				zelfName: zelfName,
			});
			console.log(previewData[0].publicData.coinbase_expires_at);
			console.log(previewData[0].publicData.coinbase_hosted_url);
			address = previewData[0].preview?.publicData || {};
		} else if (data?.ipfs?.[0]?.publicData?.type === "mainnet") {
			status = "mainnet";
		}

		return { status, address };
	} catch (error) {
		console.error("Error in searchZelfName_:", error);
		return null;
	}
};

const calculatePriceZelfName = async (zelfName, duration) => {
	zelfName = zelfName.split(".zelf")[0];
	const data = {
		1: {
			1: 240,
			2: 120,
			3: 72,
			4: 36,
			"5-15": 24,
			16: 23,
			17: 22,
			18: 21,
			19: 20,
			20: 19,
			21: 18,
			22: 17,
			23: 16,
			24: 15,
			25: 14,
			26: 13,
			27: 12,
		},
		2: {
			1: 432,
			2: 216,
			3: 130,
			4: 65,
			"5-15": 43,
			16: 41,
			17: 40,
			18: 38,
			19: 36,
			20: 34,
			21: 32,
			22: 31,
			23: 29,
			24: 27,
			25: 25,
			26: 23,
			27: 22,
		},
		3: {
			1: 612,
			2: 306,
			3: 184,
			4: 92,
			"5-15": 61,
			16: 59,
			17: 56,
			18: 54,
			19: 51,
			20: 48,
			21: 46,
			22: 43,
			23: 41,
			24: 38,
			25: 36,
			26: 33,
			27: 31,
		},
		4: {
			1: 768,
			2: 384,
			3: 230,
			4: 115,
			"5-15": 77,
			16: 74,
			17: 70,
			18: 67,
			19: 64,
			20: 61,
			21: 58,
			22: 54,
			23: 51,
			24: 48,
			25: 45,
			26: 42,
			27: 38,
		},
		5: {
			1: 900,
			2: 450,
			3: 270,
			4: 135,
			"5-15": 90,
			16: 86,
			17: 82,
			18: 79,
			19: 75,
			20: 72,
			21: 68,
			22: 64,
			23: 60,
			24: 56,
			25: 53,
			26: 49,
			27: 45,
		},
		lifetime: {
			1: 3600,
			2: 1800,
			3: 1080,
			4: 540,
			"5-15": 360,
			16: 345,
			17: 330,
			18: 315,
			19: 300,
			20: 285,
			21: 270,
			22: 255,
			23: 240,
			24: 225,
			25: 210,
			26: 195,
			27: 180,
		},
	};

	if (!data[duration]) throw new Error(`Duración inválida: "${duration}".`);

	const zelfLength = zelfName.length;
	const durationData = data[duration];
	const key = Object.keys(durationData).find((k) => {
		if (k.includes("-")) {
			const [start, end] = k.split("-").map(Number);
			return zelfLength >= start && zelfLength <= end;
		}
		return Number(k) === zelfLength;
	});

	if (!key) {
		throw new Error(
			`Longitud no válida: "${zelfLength}" para la duración "${duration}".`
		);
	}

	return { price: durationData[key], zelfLength };
};

///funcion para carcular el valor en crypto segun la moneda /USDT
/**
 * @param {string} crypto
 */
const calculateCryptoValue = async (crypto, zelfName, duration) => {
	try {
		const { price } = await getTickerPrice({ symbol: `${crypto}USDT` });

		if (!price) {
			throw new Error(
				`No se encontró información para la criptomoneda: ${crypto}`
			);
		}

		const priceBase = await calculatePriceZelfName(zelfName, duration);

		const cryptoValue = priceBase.price / price;

		return {
			crypto,
			amountToSend: cryptoValue.toFixed(8),
			ratePriceInUSDT: parseFloat(price).toFixed(5),
			wordsCount: priceBase.zelfLength.toString(),
			USD: priceBase.price.toString(),
			duration,
			zelfName,
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
	// purchase.remainingTime = "240";
	// purchase.lastSavedTime = Date.now().toString();

	updatedRecord = await modelPurchase.findByIdAndUpdate(
		params.id,
		{
			remainingTime: "360",
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

const transactionGenerate = async (crypto, zelfName, duration) => {
	if (crypto !== "CB") {
		const existingRecord = await MongoORM.buildQuery(
			{
				where_zelfName: zelfName,
				findOne: true,
			},
			modelPurchase
		);

		let validar;

		if (!existingRecord) {
			validar = await searchZelfName_(zelfName);

			if (validar.status === "available") {
				const error = new Error("zelf_name_no_lease");
				error.status = 409;
				throw error;
			}

			if (validar.status === "mainnet") {
				const error = new Error("zelfName_purchased_already");
				error.status = 409;
				throw error;
			}
		}

		const address = existingRecord ? existingRecord.address : validar.address;

		const result = await calculateCryptoValue(crypto, zelfName, duration);

		const paymentAddress = addressZelf
			.find((method) => method.id === crypto)
			.address.toString();

		const recordData = {
			zelfName: result.zelfName,
			duration: result.duration,
			crypto: result.crypto,
			wordsCount: result.wordsCount,
			USD: result.USD,
			address,
			paymentAddress: paymentAddress,
		};

		if (existingRecord) {
			if (
				existingRecord.crypto !== crypto ||
				existingRecord.duration !== duration
			) {
				recordData.amountToSend = result.amountToSend;
				recordData.ratePriceInUSDT = result.ratePriceInUSDT;
			}

			const updatedRecord = await modelPurchase.findByIdAndUpdate(
				existingRecord._id,
				recordData,
				{ new: true }
			);

			return cleanResponse(updatedRecord);
		}

		const newRecord = new modelPurchase({
			...recordData,
			amountToSend: result.amountToSend,
			ratePriceInUSDT: result.ratePriceInUSDT,
		});

		const savedRecord = await newRecord.save();
		return cleanResponse(savedRecord);
	}
};

const getLease_confirmation_pay = (params) => {
	//leaseConfirmation({network:, coin, zelfName });
};

const cleanResponse = (record) => {
	const { _doc } = record;
	const fieldsToRemove = [
		//"amountDetected",
		"purchaseCreatedAt",
		"updatedAt",
		"createdAt",
		"__v",
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
	clock_sync,
	pay,
};
