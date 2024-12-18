const axios = require("axios");
const config = require("../../../Core/config");

/**
 * Create a Coinbase charge
 * @param {string} apiKey - Your Coinbase API key
 * @param {object} chargeData - The charge data to send
 * @returns {Promise<object>} - The response from Coinbase API
 */
const createCoinbaseCharge = async (chargeData) => {
	try {
		const response = await axios.post("https://api.commerce.coinbase.com/charges/", chargeData, {
			headers: {
				"Content-Type": "application/json",
				"X-CC-Api-Key": config.coinbase.key,
			},
		});
		return response.data?.data;
	} catch (error) {
		throw new Error(error.response ? error.response.data : error.message);
	}
};

module.exports = {
	createCoinbaseCharge,
};
