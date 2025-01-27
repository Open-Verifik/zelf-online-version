const config = require("../../../Core/config");
const { getTickerPrice } = require("../../binance/modules/binance.module");
const {
	previewZelfName,
	searchZelfName,
} = require("../../ZelfNameService/modules/zns.module");

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
const jwt = require("jsonwebtoken");
const secretKey = config.signedData.key;

const search_zelf_lease = async (zelfName) => {
	const previewData = await previewZelfName({ zelfName: zelfName });
	const USD = previewData[0].publicData.price;
	const duration = previewData[0].publicData.duration;
	const expiresAt = previewData[0].publicData.expiresAt;
	const referralZelfName = previewData[0].publicData.referralZelfName;
	const coinbase_hosted_url = previewData[0].publicData.coinbase_hosted_url;
	const referralSolanaAddress = previewData[0].publicData.referralSolanaAddress;

	if (previewData[0].publicData.type === "mainnet") {
		const error = new Error("zelfName_purchased_already");
		error.status = 409;
		throw error;
	}

	const zelfNamePay = zelfName.replace(".zelf", ".zelfpay");

	const previewData2 = await searchZelfName({
		zelfName: zelfNamePay,
		environment: "both",
	});

	const cryptoValue = await calculateCryptoValue("ETH", zelfName, duration);
	const crypto = cryptoValue.crypto;
	const amountToSend = cryptoValue.amountToSend;
	const wordsCount = cryptoValue.wordsCount;
	const ratePriceInUSDT = cryptoValue.ratePriceInUSDT;

	console.log(parseInt(duration));

	const recordData = {
		zelfName,
		duration: parseInt(duration),
		crypto: crypto,
		amountToSend: cryptoValue.amountToSend,
		wordsCount: cryptoValue.wordsCount,
		USD: cryptoValue.USD,
		ratePriceInUSDT: cryptoValue.ratePriceInUSDT,
	};

	const signedDataPrice = signRecordData(recordData, secretKey);

	const paymentAddress = JSON.parse(previewData2.ipfs[0].publicData.addresses);

	delete paymentAddress.customerZelfName;

	return {
		paymentAddress,
		zelfName,
		USD,
		duration: parseInt(duration),
		expiresAt,
		referralZelfName,
		coinbase_hosted_url,
		crypto,
		amountToSend,
		wordsCount,
		referralSolanaAddress,
		ratePriceInUSDT,
		signedDataPrice,
	};
};
const select_method = async (crypto, zelfName, duration) => {
	if (crypto === "CB") {
		zelfName = zelfName.split(".zelf")[0].length;
		priceBase = _calculateZelfNamePrice(zelfName, duration);
		return {
			crypto,
			USD: priceBase,
			duration,
			amountToSend: "",
		};
	}

	const cryptoValue = await calculateCryptoValue(crypto, zelfName, duration);

	const recordData = {
		zelfName,
		duration: parseInt(duration),
		crypto: crypto,
		amountToSend: cryptoValue.amountToSend,
		wordsCount: cryptoValue.wordsCount,
		USD: cryptoValue.USD,
		ratePriceInUSDT: cryptoValue.ratePriceInUSDT,
	};

	const signedDataPrice = signRecordData(recordData, secretKey);

	return { ...recordData, signedDataPrice };
};

const pay = async (zelfName_, crypto, signedDataPrice, paymentAddress) => {
	if (crypto === "CB") {
		return await checkoutPayCoinbase(zelfName_);
	}

	const previewData = await previewZelfName({
		zelfName: zelfName_,
		environment: "hold",
	});

	const zelfNamesInIPFS = previewData[0].preview.publicData.zelfName;
	//const priceInIPFS = previewData[0].publicData.price;
	const durationInIPFS = parseFloat(previewData[0].publicData.duration);
	const expiresAt = previewData[0].publicData.expiresAt;
	const referralZelfName = previewData[0].publicData.referralZelfName;
	const coinbase_hosted_url = previewData[0].publicData.coinbase_hosted_url;
	const referralSolanaAddress = previewData[0].publicData.referralSolanaAddress;

	const { zelfName, duration, amountToSend } = verifyRecordData(
		signedDataPrice,
		secretKey
	);
	console.log({ expiresAt });
	console.log({ zelfNamesInIPFS, durationInIPFS });
	console.log({ zelfName, duration, amountToSend });

	if (zelfName !== zelfNamesInIPFS || duration !== durationInIPFS) {
		const error = new Error("Validation_failed");
		error.status = 409;
		throw error;
	}

	return await checkoutPayUniqueAddress(crypto, amountToSend, paymentAddress);
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
const checkoutPayUniqueAddress = async (
	crypto,
	amountToSend,
	paymentAddress
) => {
	const transaction = await {
		ETH: checkoutETH,
		SOL: checkoutSOLANA,
		BTC: checkoutBICOIN,
	}[crypto]?.(paymentAddress);

	console.log({ transaction });

	const addressLastTransaction = transaction?.from || "";
	let amountDetected = transaction?.value || "0.17143769";
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

const checkoutPayCoinbase = async (zelfName) => {
	const previewData = await previewZelfName({
		zelfName: zelfName,
		environment: "hold",
	});

	const coinbase_hosted_url = previewData[0].publicData.coinbase_hosted_url;

	const payment = await _confirmCoinbaseCharge({
		publicData: { coinbase_hosted_url },
	});

	if (!payment.confirmed) {
		return {
			transactionDescription: "pending",
			transactionStatus: false,
		};
	}

	await leaseConfirmation({
		zelfName,
		coin: "coinbase",
		network: "coinbase",
	});
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
	console.log(transactions);
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
/**
 * @param {string} address
 */
const checkoutSOLANA = async (address) => {
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
	// const { transactions } = await solanaModule.getTransactionsList(
	// 	{ id: address },
	// 	{ show: "10" }
	// );
	// function lamportsToSol(lamports) {
	// 	const lamportsPerSol = 1000000000;
	// 	return lamports / lamportsPerSol;
	// }
	// return {
	// 	status: transactions[0].status,
	// 	from: transactions[0].signer[0],
	// 	to: address,
	// 	value: lamportsToSol(transactions[0].sol_value).toString(),
	// };
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

		return {
			crypto,
			amountToSend: parseFloat(cryptoValue.toFixed(8)),
			ratePriceInUSDT: parseFloat(parseFloat(price).toFixed(5)),
			wordsCount,
			USD: priceBase,
			duration,
			zelfName: originalZelfName,
		};
	} catch (error) {
		throw error;
	}
};

const transactionGenerateCB = async (purchase) => {
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

const signRecordData = (recordData, secretKey) => {
	try {
		const token = jwt.sign(recordData, secretKey);
		return token;
	} catch (error) {
		return { success: false, error: error.message };
	}
};
const verifyRecordData = (token, secretKey) => {
	try {
		const decodedData = jwt.verify(token, secretKey);
		return decodedData;
	} catch (error) {
		error.status = 409;
		throw error;
	}
};
module.exports = {
	search_zelf_lease,
	select_method,
	pay,
	calculateCryptoValue,
};
