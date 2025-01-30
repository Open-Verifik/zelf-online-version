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
	getAddress,
} = require("../../etherscan/modules/etherscan-scrapping.module");

const solanaModule = require("../../Solana/modules/solana-scrapping.module");
const {
	getBalance,
} = require("../../bitcoin/modules/bitcoin-scrapping.module");
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

	console.log({ date_pinned });

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
	console.log(crypto, zelfName, duration);
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
			break;
	}

	const { zelfName, duration, amountToSend } = verifyRecordData(
		signedDataPrice,
		secretKey
	);

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

///funcion para checar pagos con unica dirección

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

///funcion para checar balance en ETH
const checkoutETH = async (address) => {
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
///funcion para checar balance en SOLANA
const checkoutSOLANA = async (address) => {
	try {
		const balanceSOLANA = await solanaModule.getAddress({ id: address });

		const balance = parseFloat(parseFloat(balanceSOLANA.balance).toFixed(7));

		console.log({ balance });

		return balance;
	} catch (error) {
		console.log(error);
	}
};
///funcion para checar balance en BICOIN

const checkoutBICOIN = async (address) => {
	//address = "bc1qw8wrek2m7nlqldll66ajnwr9mh64syvkt67zlu";
	try {
		const balanceBICOIN = await getBalance({ id: address });

		const balance = parseFloat(parseFloat(balanceBICOIN.balance).toFixed(7));

		console.log({ balance });

		return balance;
	} catch (error) {
		console.log(error);
	}
};

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
		timeline_: "",
		transactionDescription: "",
		transactionStatus: false,
	};
};

//calcular precio en la difrente redes
const calculateCryptoValue = async (crypto, zelfName, duration) => {
	const originalZelfName = zelfName.split(".zelf")[0];
	const wordsCount = originalZelfName.length;

	try {
		const { price } = await getTickerPrice({ symbol: `${crypto}` });

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
//firmar el precio fijo
const signRecordData = (recordData, secretKey) => {
	try {
		const token = jwt.sign(recordData, secretKey);
		return token;
	} catch (error) {
		return { success: false, error: error.message };
	}
};

//ver el precio fijo
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
