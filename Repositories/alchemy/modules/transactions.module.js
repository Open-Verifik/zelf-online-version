const { getCleanInstance } = require("../../../Core/axios");
const axios = require("axios");
const modelTokens = require("../models/tokens.model");
const instance = getCleanInstance(30000);
const { get_ApiKey } = require("../../Solana/modules/oklink");
const https = require("https");
const urlBaseOklin = "https://www.oklink.com";
const agent = new https.Agent({
	rejectUnauthorized: false,
});

const etherscanModule = require("../../etherscan/modules/etherscan-scrapping.module");
const polygoModule = require("../../polygon/modules/polygon-scrapping.module");
const bnbModule = require("../../bnb/modules/bnb-scrapping.module");
const avaxModule = require("../../Avalanche/modules/avalanche-scrapping.module");
const solanaModule = require("../../Solana/modules/solana-scrapping.module");

const evm_transactions = async (address, limit) => {
	try {
		const txEth = await etherscanModule.getTransactionsList({
			address: address,
			page: "0",
			show: limit,
		});

		const formattedEth = formatTransactions(txEth.transactions, "ethereum");

		const txPol = await polygoModule.getTransactionsList(
			{
				id: address,
			},
			{ show: limit, page: "1" }
		);

		const formattedPol = formatTransactions(txPol.transactions, "polygon");

		const txBnb = await bnbModule.getTransactionsList(
			{
				id: address,
			},
			{ show: limit, page: "1" }
		);

		const formattedBnb = formatTransactions(txBnb.transactions, "bnb");

		const txAvax = await avaxModule.getTransactionsList({
			id: address,
			show: limit,
			page: "1",
		});

		const formattedAvax = formatTransactions(txAvax, "avalanche");

		const formatted = [
			...formattedEth,
			...formattedPol,
			...formattedBnb,
			...formattedAvax,
		];
		return formatted;
	} catch (error) {
		console.error("Error fetching transactions:", error);
		return null;
	}
};

const solana_transactions = async (address, limit) => {
	try {
		const txSolana = await solanaModule.getTransactions(
			{
				id: address,
			},
			{ show: limit, page: "1" }
		);

		const formattedSolana = formatTransactions(txSolana.transactions, "solana");

		return [...formattedSolana];
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

// function formatTransactions(transactions, network) {
// 	if (!transactions || !Array.isArray(transactions)) return [];
// 	try {
// 		return transactions.map((tx) => {
// 			const amountInWei = (parseFloat(tx.amount) * 1e18).toString();
// 			const feeInWei = (parseFloat(tx.txnFee) * 1e18).toString();
// 			console.log(network);
// 			console.log(tx.date);

// 			return {
// 				timestamp: tx.date || tx.age,
// 				transactionId: tx.hash,
// 				traffic: tx.traffic?.toLowerCase() || "unknown",
// 				owner: tx.to?.toLowerCase() || "",
// 				amount: amountInWei,
// 				to: tx.to?.toLowerCase() || "",
// 				from: tx.from?.toLowerCase() || "",
// 				networkFee: feeInWei,
// 				networkFeePayer: tx.from?.toLowerCase() || "",
// 				status: "success",
// 				blockNumber: tx.block,
// 				network: network,
// 			};
// 		});
// 	} catch (error) {
// 		console.log(error);
// 	}
// }
function formatTransactions(transactions, network) {
	if (!transactions || !Array.isArray(transactions)) return [];

	const explorerMap = {
		ethereum: "https://etherscan.io/tx/",
		bnb: "https://bscscan.com/tx/",
		polygon: "https://polygonscan.com/tx/",
		avalanche: "https://snowtrace.io/tx/",
		solana: "https://solscan.io/tx/",
	};

	try {
		return transactions.map((tx) => {
			const amountInWei = (parseFloat(tx.amount) * 1e18).toString();
			const feeInWei = (parseFloat(tx.txnFee) * 1e18).toString();

			let rawDate = tx.date || tx.age;
			let parsedDate;

			if (typeof rawDate === "string" || typeof rawDate === "number") {
				parsedDate = new Date(rawDate);
			} else if (
				typeof rawDate === "object" &&
				typeof rawDate.toDate === "function"
			) {
				parsedDate = rawDate.toDate();
			} else {
				parsedDate = new Date();
			}

			const isoTimestamp = parsedDate.toISOString();

			const explorerBase = explorerMap[network?.toLowerCase()] || "";

			return {
				timestamp: isoTimestamp,
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
				viewExplorer: `${explorerBase}${tx.hash}`,
			};
		});
	} catch (error) {
		console.log(error);
		return [];
	}
}

module.exports = {
	evm_transactions,
	solana_transactions,
	bitcoin_transactions,
	sui_transactions,
};
