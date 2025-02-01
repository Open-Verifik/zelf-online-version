const config = require("../../../Core/config");
const { getTickerPrice } = require("../../binance/modules/binance.module");

const {
	leaseConfirmation,
	_calculateZelfNamePrice,
	searchZelfName,
} = require("../../ZelfNameService/modules/zns.module");

const {
	getAddress,
} = require("../../etherscan/modules/etherscan-scrapping.module");

const solanaModule = require("../../Solana/modules/solana-scrapping.module");
const {
	getBalance,
} = require("../../bitcoin/modules/bitcoin-scrapping.module");
const jwt = require("jsonwebtoken");
const secretKey = config.signedData.key;

const {
	getCoinbaseCharge,
} = require("../../coinbase/modules/coinbase_commerce.module");

const search_zelf_lease = async (zelfName) => {
	const previewData = await searchZelfName({ zelfName: zelfName });

	if (!previewData?.ipfs?.[0]?.publicData) {
		const error = new Error("zelfName_not_found");
		error.status = 404;
		throw error;
	}

	const USD = previewData.ipfs[0].publicData.price;
	const duration = previewData.ipfs[0].publicData.duration;
	const expiresAt = previewData.ipfs[0].publicData.expiresAt;
	const referralZelfName = previewData.ipfs[0].publicData.referralZelfName;
	const coinbase_hosted_url =
		previewData.ipfs[0].publicData.coinbase_hosted_url;
	const referralSolanaAddress =
		previewData.ipfs[0].publicData.referralSolanaAddress;

	if (previewData.ipfs[0].publicData.type === "mainnet") {
		const error = new Error("zelfName_purchased_already");
		error.status = 409;
		throw error;
	}

	const zelfNamePay = zelfName.replace(".zelf", ".zelfpay");

	const previewData2 = await searchZelfName({
		zelfName: zelfNamePay,
		environment: "both",
	});

	console.log({ USD });

	const cryptoValue = await calculateCryptoValue("ETH", USD);

	const crypto = cryptoValue.crypto;
	const amountToSend = cryptoValue.amountToSend;
	const ratePriceInUSDT = cryptoValue.ratePriceInUSDT;

	const recordData = {
		crypto: crypto,
		amountToSend: cryptoValue.amountToSend,
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
		referralSolanaAddress,
		ratePriceInUSDT,
		signedDataPrice,
	};
};
const select_method = async (crypto, price) => {
	if (crypto === "CB") {
		return {
			crypto,
			USD: price,
			amountToSend: "",
		};
	}

	const cryptoValue = await calculateCryptoValue(crypto, price);

	const recordData = {
		crypto: crypto,
		amountToSend: cryptoValue.amountToSend,
		USD: cryptoValue.USD,
		ratePriceInUSDT: cryptoValue.ratePriceInUSDT,
	};

	const signedDataPrice = signRecordData(recordData, secretKey);

	return { ...recordData, signedDataPrice };
};

const pay = async (zelfName_, crypto, signedDataPrice, paymentAddress) => {
	const previewData2 = await searchZelfName({
		zelfName: zelfName_,
		environment: "hold",
	});
	try {
		previewData2?.ipfs[0]?.publicData?.zelfName.split(".hold")[0];
	} catch (e) {
		const error = new Error("zelfName_not_found");
		error.status = 404;
		throw error;
	}

	const chargeID =
		previewData2.ipfs[0].publicData.coinbase_hosted_url.split("/pay/")[1];
	const zelfNamesInIPFS =
		previewData2.ipfs[0].publicData.zelfName.split(".hold")[0];
	const priceInIPFS = parseFloat(previewData2.ipfs[0].publicData.price);
	const expiresAt = previewData2.ipfs[0].publicData.expiresAt;

	if (crypto === "CB") {
		return await checkoutPayCoinbase(chargeID);
	}

	const zelfNamePay = zelfName_.replace(".zelf", ".zelfpay");

	const previewData3 = await searchZelfName({
		zelfName: zelfNamePay,
		environment: "both",
	});

	const paymentAddressInIPFS = JSON.parse(
		previewData3.ipfs[0].publicData.addresses
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

	const { USD, amountToSend } = verifyRecordData(signedDataPrice, secretKey);

	console.log({ priceInIPFS, zelfNamesInIPFS });

	console.log({ USD, zelfName_, amountToSend });

	if (
		//zelfName_ !== zelfNamesInIPFS ||
		USD !== priceInIPFS
		//duration !== durationInIPFS ||
		//referralZelfName !== referralZelfNameInIPFS ||
		//paymentAddress !== selectedAddress ||
		//referralSolanaAddress !== referralSolanaAddressInIPFS
	) {
		const error = new Error("Validation_failed");
		error.status = 409;
		throw error;
	}

	return await checkoutPayUniqueAddress(
		crypto,
		amountToSend,
		paymentAddress,
		zelfName_
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
///funcion para checar pagos en coinbase
const checkoutPayCoinbase = async (chargeID) => {
	console.log({ chargeID });
	const charge = await getCoinbaseCharge(chargeID);

	if (!charge) return false;

	return { timeline: charge.timeline };
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

//calcular precio en la difrente redes
const calculateCryptoValue = async (crypto, price_) => {
	try {
		const { price } = await getTickerPrice({ symbol: `${crypto}` });

		if (!price) {
			throw new Error(
				`No se encontró información para la criptomoneda: ${crypto}`
			);
		}
		// console.log({ crypto, zelfName, duration, referralSolanaAddress });
		// if (referralSolanaAddress === "no_referral") {
		// 	referralSolanaAddress = false;
		// }
		// const priceBase = _calculateZelfNamePrice(
		// 	wordsCount,
		// 	duration,
		// 	referralSolanaAddress
		// );

		console.log({ price_, price });

		const cryptoValue = price_ / price;

		console.log({ cryptoValue });

		return {
			crypto,
			amountToSend: parseFloat(cryptoValue.toFixed(7)),
			ratePriceInUSDT: parseFloat(parseFloat(price).toFixed(5)),
			USD: price_,
		};
	} catch (error) {
		throw error;
	}
};
function isExpired(expirationDate) {
	const now = new Date(); // Fecha y hora actual
	const expDate = new Date(expirationDate); // Fecha de expiración

	return expDate <= now; // Devuelve true si la fecha ya pasó o es igual a la actual
}
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
