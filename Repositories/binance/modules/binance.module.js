const config = require("../../../Core/config");
const { getCleanInstance } = require("../../../Core/axios");
const instance = getCleanInstance(30000);

/**
 * @param {*} params
 */
const getTickerPrice = async (params) => {
	try {
		let url = `https://api.exchange.coinbase.com/products/${params.symbol}-USD/ticker`;

		const { data } = await instance.get(url);

		return { price: data.price };
	} catch (error) {
		throw new Error(`409:${error.response.data.msg}`);
	}
};

/**
 * @param {*} params
 */
const getKlines = async (params) => {
	try {
		const { data } = await instance.get(
			`${config.binance.urlBinance}api/v3/klines?symbol=${params.symbol}&interval=${params.interval}&limit=${parseInt(params.limit)}`
		);

		return data;
	} catch (error) {
		throw new Error(`409:${error.response.data.msg}`);
	}
};

module.exports = {
	getTickerPrice,
	getKlines,
};
