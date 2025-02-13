const config = require("../../../Core/config");
const { getTickerPrice } = require("../../binance/modules/binance.module");
const Mailgun = require("../../../Core/mailgun");
const Model = require("../../Subscribers/models/subscriber.model");
const MongoORM = require("../../../Core/mongo-orm");
const { searchZelfName, _calculateZelfNamePrice } = require("../../ZelfNameService/modules/zns.module");

const { getAddress } = require("../../etherscan/modules/etherscan-scrapping.module");

const solanaModule = require("../../Solana/modules/solana-scrapping.module");
const { getBalance } = require("../../bitcoin/modules/bitcoin-scrapping.module");
const jwt = require("jsonwebtoken");
const secretKey = config.signedData.key;

const { getCoinbaseCharge } = require("../../coinbase/modules/coinbase_commerce.module");

const templatesMap = {
	es: {
		Purchase_receipt: {
			subject: "Purchase receipt",
			template: "purchase receipt",
		},
	},
	en: {
		Purchase_receipt: {
			subject: "Purchase receipt",
			template: "purchase receipt",
		},
	},
};

const searchZelfLease = async (zelfName) => {
	const previewData = await searchZelfName({ zelfName: zelfName });

	if (!previewData?.ipfs?.[0]?.publicData) {
		const error = new Error("zelfName_not_found");
		error.status = 404;
		throw error;
	}

	const price = previewData.ipfs[0].publicData.price;
	const duration = previewData.ipfs[0].publicData.duration;
	const expiresAt = previewData.ipfs[0].publicData.expiresAt;
	const referralZelfName = previewData.ipfs[0].publicData.referralZelfName;
	const coinbase_hosted_url = previewData.ipfs[0].publicData.coinbase_hosted_url;
	const referralSolanaAddress = previewData.ipfs[0].publicData.referralSolanaAddress;

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

	const cryptoValue = await calculateCryptoValue("ETH", price);
	const network = cryptoValue.network;
	const amountToSend = cryptoValue.amountToSend;
	const ratePriceInUSD = cryptoValue.ratePriceInUSD;

	const recordData = {
		network: network,
		amountToSend: cryptoValue.amountToSend,
		price: cryptoValue.price,
		ratePriceInUSD: cryptoValue.ratePriceInUSD,
	};

	const signedDataPrice = signRecordData(recordData, secretKey);

	const paymentAddress = JSON.parse(previewData2.ipfs[0].publicData.addresses);

	delete paymentAddress.customerZelfName;

	return {
		paymentAddress,
		zelfName,
		price,
		duration: parseInt(duration),
		expiresAt,
		referralZelfName,
		coinbase_hosted_url,
		network,
		amountToSend,
		referralSolanaAddress,
		ratePriceInUSD,
		signedDataPrice,
	};
};

const selectMethod = async (network, price) => {
	if (network === "CB") {
		return {
			network,
			price: price,
			amountToSend: price,
		};
	}

	const cryptoValue = await calculateCryptoValue(network, price);

	const recordData = {
		network: network,
		amountToSend: cryptoValue.amountToSend,
		price: cryptoValue.price,
		ratePriceInUSD: cryptoValue.ratePriceInUSD,
	};

	const signedDataPrice = signRecordData(recordData, secretKey);

	return { ...recordData, signedDataPrice };
};

const pay = async (zelfName_, network, signedDataPrice) => {
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

	const chargeID = previewData2.ipfs[0].publicData.coinbase_hosted_url.split("/pay/")[1];

	const priceInIPFS = parseFloat(previewData2.ipfs[0].publicData.price);

	if (network === "CB") {
		return await checkoutPayCoinbase(chargeID);
	}

	const zelfNamePay = zelfName_.replace(".zelf", ".zelfpay");

	const previewData3 = await searchZelfName({
		zelfName: zelfNamePay,
		environment: "both",
	});

	const paymentAddressInIPFS = JSON.parse(previewData3.ipfs[0].publicData.addresses);

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

	const { price, amountToSend } = verifyRecordData(signedDataPrice, secretKey);

	if (price !== priceInIPFS) {
		const error = new Error("Validation_failed");
		error.status = 409;
		throw error;
	}

	return await checkoutPayUniqueAddress(network, amountToSend, selectedAddress, zelfName_);
};

///funcion para checar pagos con unica dirección

const checkoutPayUniqueAddress = async (network, amountToSend, selectedAddress) => {
	const balance = await {
		ETH: checkoutETH,
		SOL: checkoutSOLANA,
		BTC: checkoutBICOIN,
	}[network]?.(selectedAddress);

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
		if (amountDetected >= Number(amountToSend)) {
			transactionStatus = true;
			transactionDescription = amountDetected === Number(amountToSend) ? "successful" : "overPayment";
		} else {
			transactionDescription = "partialPayment";
			remainingAmount = Number(amountToSend) - amountDetected;
		}
	} catch (error) {
		transactionDescription = "confirmationError";
		transactionStatus = false;
	}

	const confirmationData = signRecordData({ amountDetected, selectedAddress }, secretKey);

	return {
		transactionDescription,
		transactionStatus,
		amountDetected,
		remainingAmount: parseFloat(parseFloat(remainingAmount).toFixed(7)),
		confirmationData: confirmationData,
	};
};
///funcion para checar pagos en coinbase
const checkoutPayCoinbase = async (chargeID) => {
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
		console.error(error);
	}
	return null;
};

const checkoutSOLANA = async (address) => {
	try {
		const balanceSOLANA = await solanaModule.getAddress({ id: address });

		const balance = parseFloat(parseFloat(balanceSOLANA.balance).toFixed(7));

		return balance;
	} catch (error) {
		console.log(error);
	}
};

const checkoutBICOIN = async (address) => {
	try {
		const balanceBICOIN = await getBalance({ id: address });

		const balance = parseFloat(parseFloat(balanceBICOIN.balance).toFixed(7));

		return balance;
	} catch (error) {
		console.log(error);
	}
};

const getReceiptEmail = async (body) => {
	const { zelfName, transactionDate, price, expires, year, email } = body;

	const subtotal = _calculateZelfNamePrice(zelfName.split(".zelf")[0].length, year);
	const discount = Math.round((subtotal - price) * 100) / 100;

	const formatDate = (date) =>
		new Intl.DateTimeFormat("en-US", {
			month: "short",
			day: "numeric",
			year: "numeric",
			hour: "numeric",
			minute: "numeric",
			second: "numeric",
			hour12: true,
		}).format(new Date(date));

	return await sendEmail({
		language: "es",
		template: "Purchase_receipt",
		zelfName,
		transactionDate: formatDate(transactionDate),
		price,
		subtotal,
		discount,
		expires: formatDate(expires.replace(/-/g, "/")),
		year,
		email,
	});
};
//calcular precio en la difrente redes
const calculateCryptoValue = async (network, price_) => {
	try {
		const { price } = await getTickerPrice({ symbol: `${network}` });

		if (!price) {
			throw new Error(`No se encontró información para la criptomoneda: ${network}`);
		}

		const cryptoValue = price_ / price;

		console.log(cryptoValue);

		return {
			network,
			amountToSend: cryptoValue.toFixed(7),
			ratePriceInUSD: parseFloat(parseFloat(price).toFixed(5)),
			price: price_,
		};
	} catch (error) {
		throw error;
	}
};

const sendEmail = async (payload) => {
	payload.language ??= "es";

	const emailTemplate = templatesMap[payload.language] ? templatesMap[payload.language][payload.template] : templatesMap.en[payload.template];

	const extraParams = {
		"recipient-variables": {
			[payload.email]: {
				transactionDate: payload.transactionDate,
				subtotal: payload.subtotal,
				discount: payload.discount,
				total: payload.price,
				expires: payload.expires,
				year: payload.year,
				zelfName: payload.zelfName,
			},
		},
	};

	try {
		email = await Mailgun.sendEmail(payload.email, emailTemplate.subject, emailTemplate.template, extraParams);

		const existingSubscriber = await get({
			where_email: payload.email,
			findOne: true,
		});

		const subscriber =
			existingSubscriber ||
			new Model({
				email: payload.email,
				name: payload.name,
				//lists: [list],
			});
		await subscriber.save();
		return { message: `payment_receipt_sent_successfully` };
	} catch (exception) {
		console.error({
			exception,
		});
		exception.status = 409;
		throw exception;
	}
};
const get = async (params) => {
	const queryParams = { ...params };
	return await MongoORM.buildQuery(queryParams, Model, null, []);
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
	searchZelfLease,
	getReceiptEmail,
	selectMethod,
	pay,
};
