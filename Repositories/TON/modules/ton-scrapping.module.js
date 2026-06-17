const moment = require("moment");
const { getTickerPrice } = require("../../binance/modules/binance.module");
const { tonApiGet } = require("./ton-api.client");
const { nanotonToTonString, jettonAmountToString } = require("./ton-jetton.util");

const TON_LOGO = "https://cdn.zelf.world/icons/ic_ton.png";

const encodeAccountId = (address) => encodeURIComponent(String(address || "").trim());

const buildNativeTonToken = (balanceTon, price, fiatBalance) => ({
	_fiatBalance: String(fiatBalance ?? 0),
	address_token: "TON",
	amount: String(balanceTon ?? "0"),
	fiatBalance: fiatBalance ?? 0,
	image: TON_LOGO,
	name: "Toncoin",
	price: price ?? "0",
	symbol: "TON",
	tokenType: "TON",
});

const mapJettonBalances = (balances = [], priceTon) =>
	balances.map((item) => {
		const jetton = item.jetton || {};
		const decimals = jetton.decimals ?? 9;
		const amount = jettonAmountToString(item.balance ?? 0, decimals);
		const symbol = jetton.symbol || "JETTON";
		const price = item.price?.prices?.USD ?? priceTon ?? "0";
		const fiat = Number(amount) * Number(price);
		return {
			_fiatBalance: String(fiat || 0),
			address_token: jetton.address || "",
			amount,
			fiatBalance: fiat || 0,
			image: jetton.image || "",
			name: jetton.name || symbol,
			price: String(price),
			symbol,
			tokenType: symbol,
		};
	});

const mapEventsToTransactions = (events = [], address) =>
	events
		.map((event) => {
			const actions = event.actions || [];
			const tonTransfer = actions.find((a) => a.type === "TonTransfer" && a.TonTransfer);
			const jettonTransfer = actions.find((a) => a.type === "JettonTransfer" && a.JettonTransfer);
			const transfer = tonTransfer?.TonTransfer || jettonTransfer?.JettonTransfer;
			if (!transfer) return null;

			const from = transfer.sender?.address || transfer.recipient?.address || "";
			const to = transfer.recipient?.address || "";
			const amountRaw = transfer.amount ?? 0;
			const amount =
				tonTransfer != null
					? nanotonToTonString(amountRaw)
					: jettonAmountToString(amountRaw, jettonTransfer?.JettonTransfer?.jetton?.decimals ?? 9);
			const asset = tonTransfer != null ? "TON" : jettonTransfer?.JettonTransfer?.jetton?.symbol || "JETTON";
			const ts = event.timestamp ? event.timestamp * 1000 : Date.now();

			return {
				_amount: amount,
				_source: event,
				age: moment(ts).fromNow(),
				amount: Number(amount).toFixed(6),
				asset,
				block: String(event.lt || "0"),
				date: moment(ts).format("YYYY-MM-DD HH:mm:ss"),
				fiatBalance: 0,
				from,
				gas: "0",
				hash: event.event_id || "",
				method: tonTransfer ? "TonTransfer" : "JettonTransfer",
				timestamp: ts,
				to,
				traffic: from === address ? "OUT" : "IN",
				txnFee: "0",
				status: event.in_progress ? "pending" : "success",
			};
		})
		.filter(Boolean)
		.sort((a, b) => b.timestamp - a.timestamp);

const getAddress = async (params) => {
	const address = String(params.id || "").trim();
	let price = "0";

	try {
		const priceData = await getTickerPrice({ symbol: "TON" });
		price = priceData.price || "0";
	} catch (_) {
		/* price optional */
	}

	try {
		const account = await tonApiGet(`/accounts/${encodeAccountId(address)}`);
		const balanceTon = nanotonToTonString(account.balance ?? 0);
		const fiatBalance = Number(balanceTon) * Number(price);

		let jettonBalances = [];
		try {
			const jettons = await tonApiGet(`/accounts/${encodeAccountId(address)}/jettons`);
			jettonBalances = mapJettonBalances(jettons.balances || [], price);
		} catch (error) {
			console.error("TON jettons fetch:", error.message);
		}

		let transactions = [];
		try {
			const events = await tonApiGet(`/accounts/${encodeAccountId(address)}/events`, { limit: 10 });
			transactions = mapEventsToTransactions(events.events || [], address);
		} catch (error) {
			console.error("TON events fetch:", error.message);
		}

		const tokens = [buildNativeTonToken(balanceTon, price, fiatBalance), ...jettonBalances.filter((t) => t.symbol !== "TON")];

		return {
			_balance: balanceTon,
			_fiatBalance: String(fiatBalance),
			address,
			balance: balanceTon,
			fiatBalance,
			account: {
				asset: "TON",
				fiatBalance,
				price,
			},
			tokenHoldings: {
				balance: String(fiatBalance),
				total: tokens.length,
				tokens,
			},
			transactions,
		};
	} catch (error) {
		console.error("Error in TON getAddress:", error.message);
		return {
			_balance: "0",
			_fiatBalance: "0",
			address,
			balance: "0",
			fiatBalance: 0,
			account: { asset: "TON", fiatBalance: 0, price },
			tokenHoldings: {
				balance: "0",
				total: 1,
				tokens: [buildNativeTonToken("0", price, 0)],
			},
			transactions: [],
		};
	}
};

const getTokens = async (params, query = {}) => {
	const dashboard = await getAddress(params);
	const tokens = dashboard.tokenHoldings?.tokens || [];
	const page = Number(query.page || 0);
	const show = Number(query.show || 10);
	return tokens.slice(page * show, page * show + show);
};

const getTransactions = async (params, query = {}) => {
	const address = String(params.id || "").trim();
	const page = String(query.page ?? "0");
	const show = String(query.show ?? "10");
	const limit = Number(show) || 10;
	const offset = (Number(page) || 0) * limit;

	try {
		const events = await tonApiGet(`/accounts/${encodeAccountId(address)}/events`, {
			limit,
			before_lt: query.before_lt,
		});
		const transactions = mapEventsToTransactions(events.events || [], address);
		return {
			pagination: { records: String(transactions.length), page, show },
			transactions,
		};
	} catch (error) {
		console.error("Error in TON getTransactions:", error.message);
		return {
			pagination: { records: "0", page, show },
			transactions: [],
		};
	}
};

const getTransaction = async (params) => {
	const eventId = String(params.id || "").trim();
	try {
		const event = await tonApiGet(`/accounts/${encodeAccountId(eventId.split(":")[0] || eventId)}/events/${encodeURIComponent(eventId)}`);
		const txs = mapEventsToTransactions([event], "");
		if (!txs.length) {
			const error = new Error("transaction_not_found");
			error.status = 404;
			throw error;
		}
		return txs[0];
	} catch (error) {
		if (error.status === 404) throw error;
		const error404 = new Error("transaction_not_found");
		error404.status = 404;
		throw error404;
	}
};

module.exports = {
	getAddress,
	getTokens,
	getTransactions,
	getTransaction,
};
