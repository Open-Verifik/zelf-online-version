const config = require("../../../Core/config");
const { getTickerPrice } = require("../../binance/modules/binance.module");

const {
	leaseConfirmation,
	_confirmCoinbaseCharge,
	_calculateZelfNamePrice,
	previewZelfName,
	searchZelfName,
} = require("../../ZelfNameService/modules/zns.module");
const {
	getCoinbaseCharge,
} = require("../../coinbase/modules/coinbase_commerce.module");
const {
	getTransactionStatus,
	getAddress,
} = require("../../etherscan/modules/etherscan-scrapping.module");

const solanaModule = require("../../Solana/modules/solana-scrapping.module");
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
	const durationInIPFS = parseFloat(previewData[0].publicData.duration);
	const expiresAt = previewData[0].publicData.expiresAt;
	const referralZelfName = previewData[0].publicData.referralZelfName;
	const coinbase_hosted_url = previewData[0].publicData.coinbase_hosted_url;
	const referralSolanaAddress = previewData[0].publicData.referralSolanaAddress;

	const zelfNamePay = zelfName_.replace(".zelf", ".zelfpay");

	const previewData2 = await searchZelfName({
		zelfName: zelfNamePay,
		environment: "both",
	});

	const paymentAddressInIPFS = JSON.parse(
		previewData2.ipfs[0].publicData.addresses
	);

	let selectedAddress = null;

	switch (crypto.toUpperCase()) {
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
			console.log("Método de pago no reconocido");
			break;
	}

	const { zelfName, duration, amountToSend } = verifyRecordData(
		signedDataPrice,
		secretKey
	);
	console.log({ expiresAt });
	console.log({ zelfNamesInIPFS, durationInIPFS });
	console.log({ zelfName, duration, amountToSend });
	console.log({ paymentAddress, selectedAddress });

	if (
		zelfName !== zelfNamesInIPFS ||
		duration !== durationInIPFS ||
		paymentAddress !== selectedAddress
	) {
		const error = new Error("Validation_failed");
		error.status = 409;
		throw error;
	}

	return await checkoutPayUniqueAddress(
		crypto,
		amountToSend,
		paymentAddress,
		zelfName
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
const checkoutPayUniqueAddress = async (
	crypto,
	amountToSend,
	paymentAddress,
	zelfName
) => {
	const balance = await {
		ETH: checkoutETH,
		SOL: checkoutSOLANA,
		BTC: checkoutBICOIN,
	}[crypto]?.(paymentAddress);

	let amountDetected = balance;
	console.log({ balance });

	let transactionStatus = false;
	let transactionDescription = "pending";
	let remainingAmount = 0;

	if (amountDetected === 0) {
		return {
			transactionStatus: false,
			transactionDescription: "pending",
			amountDetected,
		};
	}

	try {
		if (amountDetected >= amountToSend) {
			transactionStatus = true;
			transactionDescription =
				amountDetected === amountToSend ? "successful" : "overPayment";
			await leaseConfirmation(
				{ network: crypto, coin: crypto, zelfName },
				{},
				amountToSend
			);
		} else {
			transactionDescription = "partialPayment";
			remainingAmount = amountToSend - amountDetected;
		}
	} catch (error) {
		console.log(error);
		transactionDescription = "confirmationError";
		transactionStatus = false;
	}

	return {
		transactionDescription,
		transactionStatus,
		amountDetected,
		remainingAmount: parseFloat(parseFloat(remainingAmount).toFixed(7)),
	};
};

// const checkoutPayUniqueAddress = async (   no borrar
// 	crypto,
// 	amountToSend,
// 	paymentAddress,
// 	zelfName
// ) => {
// 	paymentAddress = "0x1BC125bC681685f216935798453F70fb423eB392"; //prueba
// 	const transaction = await {
// 		ETH: checkoutETH,
// 		SOL: checkoutSOLANA,
// 		BTC: checkoutBICOIN,
// 	}[crypto]?.(paymentAddress);

// 	console.log({ transaction });

// 	let transactionStatus = false;
// 	let transactionDescription = "pending";

// 	if (!transaction) {
// 		return {
// 			transactionStatus: false,
// 			transactionDescription: "undetected_transaction",
// 			amountDetected: 0,
// 		};
// 	}

// 	console.log({ amountToSend });

// 	let amountDetected = transaction?.value || 0;

// 	if (amountDetected === amountToSend) {
// 		transactionStatus = true;
// 		transactionDescription = "successful";
// 		await leaseConfirmation(
// 			{ network: crypto, coin: crypto, zelfName: zelfName },
// 			{},
// 			amountToSend
// 		);
// 	} else if (amountDetected < amountToSend) {
// 		transactionDescription = "partial_payment";
// 	} else {
// 		transactionStatus = true;
// 		transactionDescription = "overpayment";
// 		await leaseConfirmation(
// 			{ network: crypto, coin: crypto, zelfName: zelfName },
// 			{},
// 			amountToSend
// 		);
// 	}

// 	return {
// 		transactionDescription,
// 		transactionStatus,
// 		amountDetected,
// 	};
// };

const checkoutPayCoinbase = async (zelfName) => {
	const previewData = await previewZelfName({
		zelfName: zelfName,
		environment: "hold",
	});

	const coinbase_hosted_url = previewData[0].publicData.coinbase_hosted_url;

	const charge = await _confirmCoinbaseCharge({
		publicData: { coinbase_hosted_url },
	});
	// //console.log(charge.timeline);
	// let transactionDescription;
	// let timeline_;
	// const timeline = charge.timeline;
	// for (let index = 0; index < timeline.length; index++) {
	// 	const _timeline = timeline[index];

	// 	console.log(_timeline);

	// 	if (_timeline.status === "SIGNED" || _timeline.status === "NEW") {
	// 		transactionDescription = "started";
	// 		timeline_ = _timeline.time;
	// 		confirmed = false;
	// 	}

	// 	if (_timeline.status === "PENDING") {
	// 		transactionDescription = "pending";
	// 		timeline_ = _timeline.time;
	// 		confirmed = false;
	// 	}

	// 	if (_timeline.status === "COMPLETED") {
	// 		timeline_ = _timeline.time;
	// 		transactionDescription = "successful";
	// 		confirmed = true;
	// 	}
	// }
	// //getCoinbaseCharge
	// //payment = { confirmed: true };

	// // if (!payment.confirmed) {
	// // 	return {
	// // 		transactionDescription: "pending",
	// // 		transactionStatus: false,
	// // 	};
	// // }

	// // await leaseConfirmation({
	// // 	zelfName,
	// // 	coin: "coinbase",
	// // 	network: "coinbase",
	// // });
	// // return {
	// // 	transactionDescription: "successful",
	// // 	transactionStatus: true,
	// // };

	return {
		timeline_: "o",
		transactionDescription: "p",
		transactionStatus: false,
	};
};

///funcion para checar transacciones en ETH
/**
 * @param {string} address
 */

const checkoutETH = async (address) => {
	console.log({ address });
	try {
		const balanceETH = await getAddress({
			address,
		});

		const balance = parseFloat(parseFloat(balanceETH.balance).toFixed(7));

		return balance;
	} catch (error) {
		console.log(error);
	}
};

//////////////////////////////////////////////////////////////////
// const checkoutETH = async (address) => {
// 	try {
// 		console.log({ address });
// 		const { transactions } = await getAddress({
// 			address,
// 		});

// 		const LastTxhash = await getLastInTransactionHash(transactions);

// 		console.log({ LastTxhash });

// 		const transaction = await getTransactionStatus({ id: LastTxhash });

// 		const value = transaction.valueETH;

// 		return {
// 			status: transaction.status,
// 			from: transaction.from,
// 			to: transaction.to,
// 			value: parseFloat(parseFloat(value).toFixed(7)),
// 		};
// 	} catch (error) {
// 		console.log(error.status);
// 		if (error.status === 404) {
// 			return null;
// 		}
// 	}
// };
///funcion para checar transacciones en SOLANA
/**
 * @param {string} address
 */
// const checkoutSOLANA = async (address) => {
// 	const { transactions } = await solanaModule.getTransactionsList(
// 		{ id: address },
// 		{ show: "10" }
// 	);

// 	function lamportsToSol(lamports) {
// 		const lamportsPerSol = 1000000000;
// 		return lamports / lamportsPerSol;
// 	}

// 	return {
// 		status: transactions[0].status,
// 		from: transactions[0].signer[0],
// 		to: address,
// 		value: lamportsToSol(transactions[0].sol_value).toString(),
// 	};
// };
const checkoutSOLANA = async (address) => {
	///
	//address = "ob2htHLoCu2P6tX7RrNVtiG1mYTas8NGJEVLaFEUngk";
	try {
		const balanceSOLANA = await solanaModule.getAddress({ id: address });

		const balance = parseFloat(parseFloat(balanceSOLANA.balance).toFixed(7));

		console.log({ balance });

		return balance;
	} catch (error) {
		console.log(error);
	}
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
			amountToSend: parseFloat(cryptoValue.toFixed(7)),
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
