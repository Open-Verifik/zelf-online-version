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

const transactionsEvm = async (address, limit) => {
	try {
		const txEth = await etherscanModule.getTransactionsList({
			address: address,
			page: "1",
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

const transactionsSolana = async (address, limit) => {
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

const transactionsSui = async (address, limit) => {
	try {
		console.log({ address });
		const { data } = await instance.get(
			`https://suiscan.xyz/api/sui-backend/mainnet/api/accounts/${address}/transactions?transactionsParticipationType=RECEIVER&orderBy=DESC&size=10`,
			{
				headers: {
					accept: "application/json, text/plain, */*",
					"user-agent":
						"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
					"x-kl-ksospc-ajax-request": "Ajax_Request",
					cookie:
						"_ga=GA1.1.1781611108.1742916716; cf_clearance=3Fw2UtX2ymCc.AOpyviAENMTVYhC212lNGmWlcUNXww-1746840416-1.2.1.1-znyvklsJcsgoZj.K2tNnJSNlj7JCeC3DuC30ci5K8jgLEKioiTd8V6ByniFW22FjcEiGkoFdWnGYm_EhaelDXM0hGZk7M0zGksrg8Cemg02tK6NLzln4kNNVbqJ7cb5HPGO2eU7Drl5O1dOwcctLTWOKdDOnWq1LhL3KkM29y.YgIKJek0NrADa3nZF45BpErGuPP09KwDe8449QU8TzFeVWP9RhEO5gkpmU46WFyzGrYcXy.7Pt2bw4RUCmc4xIAZNLTRQYc9D23YaHewJ.nUAQtffDLZAYL7JHzvOpsJVVTbrtdATGwDdjcpPRL4zmXDlJmt1.9xWhFs2p7StivHogQc8t2z1eJGTkYM8v4P0; accDetailsView=list; _ga_5BET56DB9H=GS2.1.s1746840414$o21$g1$t1746840531$j0$l0$h0; version39Leaderboard=false",
				},
			}
		);
		console.log(data);
		return data;
	} catch (error) {
		console.log(error);
	}
};

const transactionsBitcoin = async (direccion, limite) => {
	let todasLasTransacciones = [];
	let afterTxid = null;

	try {
		while (todasLasTransacciones.length < limite) {
			const url = afterTxid
				? `https://mempool.space/api/address/${direccion}/txs?after_txid=${afterTxid}`
				: `https://mempool.space/api/address/${direccion}/txs`;

			const { data } = await instance.get(url, {
				headers: {
					"User-agent":
						"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
					"x-kl-ksospc-ajax-request": "Ajax_Request",
				},
			});

			if (!data.length) break;

			todasLasTransacciones.push(...data);

			afterTxid = data[data.length - 1].txid;
		}

		return extraerInfoMinimaTx(todasLasTransacciones.slice(0, limite));
	} catch (error) {
		console.error("Error al obtener transacciones:", error);
		return [];
	}
};

function extraerInfoMinimaTx(data) {
	return data.map((tx) => {
		return {
			timestamp: tx.status.block_time
				? new Date(tx.status.block_time * 1000).toISOString()
				: null,
			transactionId: tx.txid,
			networkFee: tx.fee.toString(),
			status: tx.status.confirmed ? "success" : "pending",
			blockNumber: tx.status.block_height
				? tx.status.block_height.toString()
				: null,
			network: "bitcoin",
			viewExplorer: `https://mempool.space/tx/${tx.txid}`,
		};
	});
}

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
				addressOwner: tx.to?.toLowerCase() || "",
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
	transactionsEvm,
	transactionsSolana,
	transactionsBitcoin,
	transactionsSui,
};
