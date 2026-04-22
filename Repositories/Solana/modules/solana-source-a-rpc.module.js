const { getCleanInstance } = require("../../../Core/axios");
const { generateRandomUserAgent } = require("../../../Core/helpers");
const {
	getNaasNodeUrl,
	NAAS_CHAIN,
	refreshNaasCatalogAfterUnauthorized,
	isNaasNodeUnauthorizedError,
} = require("../../../Core/naas-gateway-catalog");
const moment = require("moment");
const { getTickerPrice } = require("../../binance/modules/binance.module");
const { getKnownSplDisplay, WSOL_MINT } = require("./solana-spl-known-metadata");
const { enrichSplTokenRowsWithJupiter } = require("./jupiter-spl-metadata.module");

const instance = getCleanInstance(30000);

/** JSON-RPC base URL from nodes catalog gateway */
const SPL_TOKEN_PROGRAM = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";

/** Cap SPL rows bundled into address overview (full list via GET …/token/:id with pagination). */
const MAX_SPL_IN_ADDRESS_OVERVIEW = 200;

const solanaBookBase = async () => getNaasNodeUrl(NAAS_CHAIN.SOLANA);

let rpcSeq = 0;
const rpcCall = async (method, params, { retried401 = false } = {}) => {
	const url = await solanaBookBase();
	const id = ++rpcSeq;
	try {
		const { data } = await instance.post(
			url,
			{ jsonrpc: "2.0", id, method, params },
			{
				headers: {
					"Content-Type": "application/json",
					"user-agent": generateRandomUserAgent(),
				},
			},
		);
		if (data.error) {
			const err = new Error(data.error.message || JSON.stringify(data.error));
			err.rpcCode = data.error.code;
			throw err;
		}
		return data.result;
	} catch (err) {
		if (!retried401 && isNaasNodeUnauthorizedError(err)) {
			await refreshNaasCatalogAfterUnauthorized();
			return rpcCall(method, params, { retried401: true });
		}
		throw err;
	}
};

function mapSignatureToTxRow(sig, ownerAddress) {
	const ts = sig.blockTime ?? 0;
	const status = sig.err ? "Failed" : "Success";
	return {
		hash: sig.signature,
		block: sig.slot != null ? String(sig.slot) : "",
		date: ts ? moment.unix(ts).format("YYYY-MM-DD HH:mm:ss") : "",
		age: ts ? moment.unix(ts).fromNow() : "",
		from: "",
		method: "signature",
		traffic: "",
		to: "",
		amount: 0,
		fiatAmount: "0",
		from_token_account: "",
		to_token_account: ownerAddress,
		status,
		asset: "SOL",
		timestamp: ts,
	};
}

function parsedTokenAccountsToHoldings(ownerAddress, value) {
	const rows = Array.isArray(value) ? value : [];
	const tokens = [];

	for (const row of rows) {
		const info = row?.account?.data?.parsed?.info;
		if (!info || info.state !== "initialized") continue;
		const ta = info.tokenAmount;
		if (!ta) continue;
		const raw = ta.amount != null ? String(ta.amount) : "0";
		const decimals = Number(ta.decimals ?? 0);
		const ui = ta.uiAmount != null ? Number(ta.uiAmount) : Number(raw) / 10 ** decimals;

		const mint = info.mint || "";
		const known = getKnownSplDisplay(mint);

		tokens.push({
			fiatBalance: 0,
			name: known?.name || `SPL ${mint.slice(0, 4)}…${mint.slice(-4)}`,
			amount: ui,
			price: 0,
			symbol: known?.symbol || "SPL",
			image: known?.image || "",
			address: row.pubkey,
			tokenAddress: mint,
			tokenType: "SPL",
			owner: ownerAddress,
		});
	}

	return {
		total: tokens.length,
		balance: 0,
		fiatBalance: 0,
		tokens,
	};
}

const getSignatures = async (address, limit) => {
	const cap = Math.min(1000, Math.max(1, limit || 25));
	const result = await rpcCall("getSignaturesForAddress", [address, { limit: cap }]);
	return Array.isArray(result) ? result : [];
};

const getAddress = async (params) => {
	const address = params.id;
	const balRes = await rpcCall("getBalance", [address, { commitment: "confirmed" }]);
	const rawLamports = balRes != null && typeof balRes === "object" && "value" in balRes ? balRes.value : balRes;
	const value = Number(rawLamports);
	const balanceSol = value / 1e9;

	const { price } = await getTickerPrice({ symbol: "SOL" });
	const priceNum = Number(price) || 0;

	const tokenResult = await rpcCall("getTokenAccountsByOwner", [
		address,
		{ programId: SPL_TOKEN_PROGRAM },
		{ encoding: "jsonParsed" },
	]);
	const tokenHoldings = parsedTokenAccountsToHoldings(address, tokenResult?.value);
	await enrichSplTokenRowsWithJupiter(tokenHoldings.tokens);
	const splTotal = tokenHoldings.tokens.length;
	if (splTotal > MAX_SPL_IN_ADDRESS_OVERVIEW) {
		tokenHoldings.tokens = tokenHoldings.tokens.slice(0, MAX_SPL_IN_ADDRESS_OVERVIEW);
	}
	tokenHoldings.total = splTotal;

	const sigs = await getSignatures(address, 20);
	const transactions = sigs.map((s) => mapSignatureToTxRow(s, address));

	const fiatBalance = parseFloat((balanceSol * priceNum).toFixed(4));

	const _response = {
		address,
		balance: `${balanceSol}`,
		fiatBalance,
		type: "system_account",
		account: {
			asset: "SOL",
			fiatBalance: fiatBalance.toFixed(5),
			price: `${priceNum}`,
		},
		tokenHoldings,
		transactions,
	};

	const hasSolToken = tokenHoldings.tokens.some((t) => t.tokenType === "SOL" && t.symbol === "SOL");
	if (!hasSolToken) {
		tokenHoldings.tokens.unshift({
			tokenType: "SOL",
			fiatBalance,
			symbol: "SOL",
			name: "Solana",
			price: priceNum,
			amount: balanceSol,
			image: "https://vtxz26svcpnbg5ncfansdb5zt33ec2bwco6uuah3g3sow3pewfma.arweave.zelf.world/rO-delUT2hN1oigbIYe5nvZBaDYTvUoA-zbk623ksVg",
		});
	}

	if (tokenHoldings.fiatBalance) _response.fiatBalance += tokenHoldings.fiatBalance;
	_response.fiatBalance = parseFloat(Number(_response.fiatBalance).toFixed(4));

	return _response;
};

const getTokens = async (params, query = {}) => {
	const address = params.id;
	const page = Math.max(0, parseInt(String(query.page ?? "0"), 10) || 0);
	const show = Math.min(100, Math.max(1, parseInt(String(query.show ?? "50"), 10) || 50));

	const tokenResult = await rpcCall("getTokenAccountsByOwner", [
		address,
		{ programId: SPL_TOKEN_PROGRAM },
		{ encoding: "jsonParsed" },
	]);
	const full = parsedTokenAccountsToHoldings(address, tokenResult?.value);
	await enrichSplTokenRowsWithJupiter(full.tokens);
	const start = page * show;
	const slice = full.tokens.slice(start, start + show);
	return {
		total: full.total,
		balance: full.balance,
		fiatBalance: full.fiatBalance,
		tokens: slice,
	};
};

const getTransactions = async (params, query) => {
	const address = params.id;
	const page = parseInt(String(query.page), 10);
	const show = parseInt(String(query.show), 10);
	const limit = Math.min(1000, Math.max(1, Number.isFinite(show) ? show : 25));

	const sigs = await getSignatures(address, limit);
	const transactions = sigs.map((s) => mapSignatureToTxRow(s, address));

	return {
		pagination: {
			records: String(transactions.length),
			pages: String(Number.isFinite(page) ? page : 0),
			page: Number.isFinite(page) ? page : 0,
		},
		transactions,
	};
};

module.exports = {
	solanaBookBase,
	getAddress,
	getTokens,
	getTransactions,
	parsedTokenAccountsToHoldings,
};
