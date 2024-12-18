const config = require("../../../Core/config");
const { getCleanInstance } = require("../../../Core/axios");
const instance = getCleanInstance(30000);
const { getTickerPrice } = require("../../binance/modules/binance.module");
//const { searchZelfName } = require("../../ZelfNameService/modules/zns.module");
const MongoORM = require("../../../Core/mongo-orm");
const {
	getTransactionStatus,
	getAddress,
} = require("../../etherscan/modules/etherscan-scrapping.module");

const solanaModule = require("../../Solana/modules/solana-scrapping.module");

const modelPurchase = require("../models/purchase.model");

const priceBase = 24; //Dolares Americanos ;
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
		id: "BNB",
		address: "0xD3b0d838cCCEAe7ebF1781D11D1bB741DB7Fe1A7",
	},
	{
		id: "BTC",
		address: "bc1p6lsrl8amjuwrwxcwaa9ncuuzljuc3zv4jg55xdruuq5nxxwnvj4qd23dxl",
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
	const crypto = params.crypto;
	const duration = params.duration;
	const zelfName = params.zelfName;

	const existingRecordZelfName = await searchZelfName(zelfName, crypto);

	if (!existingRecordZelfName)
		throw new Error("404:This_zelfName_is not_yet_linked");

	const addressCliente = existingRecordZelfName;

	const cryptoValue = await calculateCryptoValue(crypto);

	let status = await checkout(
		crypto,
		addressCliente,
		cryptoValue.cryptoValue,
		cryptoValue.ratePriceInUSDT,
		zelfName,
		duration
	);

	return status;
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
const checkout = async (
	crypto,
	addressCliente,
	valorApagar,
	ratePriceInUSDT,
	zelfName,
	duration
) => {
	const { address } = addressZelf.find((method) => method.id === crypto);

	switch (crypto) {
		case "ETH":
			transaction = await checkoutETH(address);
			break;
		case "SOL":
			transaction = await checkoutSOLANA(address);
			break;
		case "MINA":
			transaction = await checkoutBICOIN(address);
			break;
	}

	const ultimaDirreccion = transaction.from;

	let valorDetransaccion = transaction.value;

	console.log({ ultimaDirreccion, valorDetransaccion });

	let transactionStatus = false;
	let transactionDescription = "transaction_not_detected";

	if (addressCliente) {
		if (valorDetransaccion === valorApagar) {
			transactionStatus = true;
			transactionDescription = "full_payment";
		} else if (valorApagar < valorDetransaccion) {
			transactionStatus = false;
			transactionDescription = "partial_payment";
		} else {
			transactionStatus = true;
			transactionDescription = "overpayment";
		}
	} else {
		valorDetransaccion = null;
	}

	return {
		currency: crypto,
		transactionStatus,
		transactionDescription,
		amountToSend: valorApagar,
		amountDetected: valorDetransaccion,
		ratePriceInUSDT: ratePriceInUSDT,
		paymentAddress: address,
		zelfName,
		duration,
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
const searchZelfName = async (zelfName, crypto) => {
	try {
		const { data } = await instance.get(
			`https://api.zelf.world/api/zelf-name-service/search?zelfName=${zelfName}.zelf`,
			{
				headers: {
					authorization:
						"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzZXNzaW9uIjoiNjc2MTlkOGMwYzI2NDVkY2VhYzcxYzE5IiwiaWRlbnRpZmllciI6IjM2ODUxNTc0NiIsImlhdCI6MTczNDQ1MDU3Mn0.FBInrZVafALVEuNTDq7tdHS1d8gBYuGXsR_Ve9csqHc",
				},
			}
		);

		let addressCliente;

		switch (crypto) {
			case "ETH":
				addressCliente = data.data.ipfs[0].publicData.ethAddress;
				break;
			case "SOL":
				addressCliente = data.data.ipfs[0].publicData.solanaAddress;
				break;
			case "MINA":
				addressCliente = data.data.ipfs[0].publicData.minaAddress;
				break;

			default:
		}

		return addressCliente;
	} catch (error) {
		console.log(error);
		return null;
	}
};
const calculatePriceZelfName = async (zelfName, crypto, duration) => {
	const data = [
		{
			Length: "1 Year",
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
		{
			Length: "2 Years",
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
		{
			Length: "3 Years",
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
		{
			Length: "4 Years",
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
		{
			Length: "5 Years",
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
		{
			Length: "Lifetime",
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
	];

	function getValue(length, year) {
		// Busca el objeto que coincide con el Length
		const lengthData = data.find((item) => item.Length === length);

		if (!lengthData) {
			throw new Error(`No se encontró el Length "${length}".`);
		}

		// Busca el valor basado en el año
		const key = Object.keys(lengthData).find((k) => {
			if (k.includes("-")) {
				// Manejo de rangos (por ejemplo, "5-15")
				const [start, end] = k.split("-").map(Number);
				return year >= start && year <= end;
			}
			return Number(k) === year; // Comparación directa para claves numéricas
		});

		if (!key) {
			throw new Error(
				`No se encontró un valor para el año "${year}" en el Length "${length}".`
			);
		}

		return lengthData[key];
	}

	// Ejemplo de uso:
	try {
		console.log(getValue("1 Year", 15)); // 240
	} catch (error) {
		console.error(error.message);
	}
};

///funcion para carcular el valor en crypto segun la moneda /USDT
/**
 * @param {string} crypto
 */
const calculateCryptoValue = async (crypto) => {
	try {
		const { price } = await getTickerPrice({ symbol: `${crypto}USDT` });

		if (!price) {
			throw new Error(
				`No se encontró información para la criptomoneda: ${crypto}`
			);
		}

		const cryptoValue = priceBase / price;

		return {
			crypto,
			cryptoValue: cryptoValue.toFixed(8),
			ratePriceInUSDT: parseFloat(price).toFixed(5),
		};
	} catch (error) {
		console.error("Error al obtener el valor de la criptomoneda:");
		throw error;
	}
};
module.exports = {
	getCheckout,
};
