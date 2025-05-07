const Module = require("../modules/alchemy-scrapping.module");

const balance = async (ctx) => {
	const { addresses } = ctx.request.body;
	try {
		const data = await Module.getBalance(addresses);

		ctx.body = { data };
	} catch (error) {
		console.error(error);

		ctx.status = error.status || 500;

		ctx.body = { error: error.message };
	}
};
const transactions = async (ctx) => {
	const { addresses } = ctx.request.body;

	try {
		const data = await Module.getTransactions(addresses);

		ctx.body = { data };
	} catch (error) {
		console.error(error);

		ctx.status = error.status || 500;

		ctx.body = { error: error.message };
	}
};

const gas_pricing = async (ctx) => {
	const { network } = ctx.request.query;
	try {
		const data = await Module.gas_pricing(network);

		ctx.body = { data };
	} catch (error) {
		console.error(error);

		ctx.status = error.status || 500;

		ctx.body = { error: error.message };
	}
};

const tokens = async (ctx) => {
	const { network, name, explore } = ctx.request.query;

	try {
		const data = await Module.getTokens(network, name, explore);

		ctx.body = { data };
	} catch (error) {
		console.error(error);

		ctx.status = error.status || 500;

		ctx.body = { error: error.message };
	}
};

const token = async (ctx) => {
	const { tokenContractAddress, network } = ctx.request.query;

	try {
		const data = await Module.tokenOklin(tokenContractAddress, network);

		ctx.body = { data };
	} catch (error) {
		console.error(error);

		ctx.status = error.status || 500;

		ctx.body = { error: error.message };
	}
};
module.exports = {
	balance,
	transactions,
	gas_pricing,
	tokens,
	token,
};
