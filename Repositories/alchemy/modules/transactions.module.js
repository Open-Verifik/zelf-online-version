const { getCleanInstance } = require("../../../Core/axios");
const axios = require("axios");
const modelTokens = require("../models/tokens.model");
const instance = getCleanInstance(30000);
const { get_ApiKey } = require("../../Solana/modules/oklink");
const https = require("https");
const MongoORM = require("../../../Core/mongo-orm");
const urlBaseOklin = "https://www.oklink.com";
const agent = new https.Agent({
	rejectUnauthorized: false,
});

const etherscanModule = require("../../etherscan/modules/etherscan-scrapping.module");
const polygoModule = require("../../polygon/modules/polygon-scrapping.module");

const evm_transactions = async (address) => {
	try {
		// Obtener transacciones de Ethereum
		const txEth = await etherscanModule.getTransactionsList({
			address: address,
			page: "0",
			show: "10",
		});
		const formattedEth = formatTransactions(txEth.transactions, "ethereum");

		// Obtener transacciones de Polygon
		const txPol = await polygoModule.getTransactionsList(
			{
				address: address,
				page: "0",
			},
			{ show: "10" }
		);
		const formattedPol = formatTransactions(txPol.transactions, "polygon");

		// Combinar ambas listas y devolver
		const formatted = [...formattedEth, ...formattedPol];
		return formatted;
	} catch (error) {
		console.error("Error fetching transactions:", error);
		return null;
	}

	// Función auxiliar para formatear transacciones
	function formatTransactions(transactions, network) {
		if (!transactions || !Array.isArray(transactions)) return [];

		return transactions.map((tx) => {
			const amountInWei = (parseFloat(tx.amount) * 1e18).toString();
			const feeInWei = (parseFloat(tx.txnFee) * 1e18).toString();

			return {
				timestamp: tx.date,
				transactionId: tx.hash,
				traffic: tx.traffic?.toLowerCase() || "unknown",
				owner: tx.to?.toLowerCase() || "",
				amount: amountInWei,
				to: tx.to?.toLowerCase() || "",
				from: tx.from?.toLowerCase() || "",
				networkFee: feeInWei,
				networkFeePayer: tx.from?.toLowerCase() || "",
				status: "success",
				blockNumber: tx.block,
				network: network,
			};
		});
	}
};

const solana_transactions = async (address) => {
	try {
		const { transactions } = await getTransactionsList({
			address: address,
			page: "0",
			show: "10",
		});

		return transactions;
	} catch (error) {
		return null;
	}
};
const bitcoin_transactions = async (address) => {
	try {
		const { transactions } = await getTransactionsList({
			address: address,
			page: "0",
			show: "10",
		});

		return transactions;
	} catch (error) {
		return null;
	}
};
const sui_transactions = async (address) => {
	try {
		const { transactions } = await getTransactionsList({
			address: address,
			page: "0",
			show: "10",
		});

		return transactions;
	} catch (error) {
		return null;
	}
};

module.exports = {
	evm_transactions,
	solana_transactions,
	bitcoin_transactions,
	sui_transactions,
};
