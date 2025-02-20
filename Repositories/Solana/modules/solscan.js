const { getCleanInstance } = require("../../../Core/axios");
const instance = getCleanInstance(30000);
const endpoint = `https://api-v2.solscan.io/v2`;
const moment = require("moment");
const getAddress = async (params) => {
	try {
		const { data } = await instance.get(
			`${endpoint}/account?address=${params.id}`,
			{
				headers: {
					cookie:
						"__cf_bm=6Nb_BhzZtOdGxVrRrnJoN83pN6rfOtlvuRxjI90nJ0E-1728040658-1.0.1.1-wWYmBJNnH55RvNIFlxo41XFAhHH4kt68pEvyR2fW2Zb_6hVNARhlKxBPCqoZQ_ZhtRQjCeFp6vReppgZbEYgbw; cf_clearance=ibbR6Iox6IDDq4r5WTmuKO0tkKPcwv8GloL.CCp7V3w-1728040665-1.2.1.1-Ef84Taqzk5aSmCiHV321WYtxUv7EIDJTG0SDgp4J.kjIs6gG9J7GVpSV9HE12tuH7xN5vtzdNt1sm6dOee1c20DQO2Lqd.rymeTv.0g340.1jEjK1BnkO4QUlkmEWdbBHzBOc43akGgAef7InJnNEKcg2eO5dPLXT0waBuDCHTs1VMJWBHhfeAE9jZz4C.pPKJKtUDvCyqvR.KRlokRlHo_gnzTVUQDawAtgdLimOOWAK5huvgGQURDoHngS1E5ne03ScjMqfL9HGKME7wXjsK1M9v6zX0WjGMiRDiXkMX3H8oZieb0wyG.j.UKR7jS3K9ElZYtMaZ2kTH1dRJ2DW13.4Q.H3Q.RZlc7Bv3a9FEKf79.2TUxXaiGtKqFH9IbCrPVxFCQ09YxgSp_U0H0AA; _ga=GA1.1.1401977830.1728040664; _ga_PS3V7B7KV0=GS1.1.1728040664.1.1.1728040689.0.0.0; __cf_bm=Mz6cAvTNjPAeUi30bGhjWOHzNal5QLqwS2T6omWu3c8-1728267695-1.0.1.1-oPl.fRzgy_UIvX86I4hXorbEOT5HKcOEAxcTsfbsYnUgtBpIH.Cck88Gm0KcosZyt6sRto_BNTjyJegI2oYryQ",
					"if-none-match": 'W/"622-Ukdydv8vKaxhKj3QjdlU5A1PS9k"',
					origin: "https://solscan.io",
					priority: "u=1, i",
					referer: "https://solscan.io/",
					"sol-aut": "5GvLD-NW7B9dls0fKbJHWeJeCUXOPQAbf70dKwfI:",
					"user-agent":
						"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.106 Safari/537.36",
				},
			}
		);

		const price_usdt = await instance.get(
			`${endpoint}/account/domain?address=${params.id}`,
			{
				headers: {
					cookie:
						"__cf_bm=6Nb_BhzZtOdGxVrRrnJoN83pN6rfOtlvuRxjI90nJ0E-1728040658-1.0.1.1-wWYmBJNnH55RvNIFlxo41XFAhHH4kt68pEvyR2fW2Zb_6hVNARhlKxBPCqoZQ_ZhtRQjCeFp6vReppgZbEYgbw; cf_clearance=ibbR6Iox6IDDq4r5WTmuKO0tkKPcwv8GloL.CCp7V3w-1728040665-1.2.1.1-Ef84Taqzk5aSmCiHV321WYtxUv7EIDJTG0SDgp4J.kjIs6gG9J7GVpSV9HE12tuH7xN5vtzdNt1sm6dOee1c20DQO2Lqd.rymeTv.0g340.1jEjK1BnkO4QUlkmEWdbBHzBOc43akGgAef7InJnNEKcg2eO5dPLXT0waBuDCHTs1VMJWBHhfeAE9jZz4C.pPKJKtUDvCyqvR.KRlokRlHo_gnzTVUQDawAtgdLimOOWAK5huvgGQURDoHngS1E5ne03ScjMqfL9HGKME7wXjsK1M9v6zX0WjGMiRDiXkMX3H8oZieb0wyG.j.UKR7jS3K9ElZYtMaZ2kTH1dRJ2DW13.4Q.H3Q.RZlc7Bv3a9FEKf79.2TUxXaiGtKqFH9IbCrPVxFCQ09YxgSp_U0H0AA; _ga=GA1.1.1401977830.1728040664; _ga_PS3V7B7KV0=GS1.1.1728040664.1.1.1728040689.0.0.0; __cf_bm=Mz6cAvTNjPAeUi30bGhjWOHzNal5QLqwS2T6omWu3c8-1728267695-1.0.1.1-oPl.fRzgy_UIvX86I4hXorbEOT5HKcOEAxcTsfbsYnUgtBpIH.Cck88Gm0KcosZyt6sRto_BNTjyJegI2oYryQ",
					"if-none-match": 'W/"622-Ukdydv8vKaxhKj3QjdlU5A1PS9k"',
					origin: "https://solscan.io",
					priority: "u=1, i",
					referer: "https://solscan.io/",
					"sol-aut": "5GvLD-NW7B9dls0fKbJHWeJeCUXOPQAbf70dKwfI:",
					"user-agent":
						"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.106 Safari/537.36",
				},
			}
		);

		const result = data.data;

		const { transactions } = await getTransfers(
			{ id: params.id },
			{ page: 1, show: 10 }
		);

		const _response = {
			address: result.account,
			balance: `${result.lamports / 1_000_000_000 || 0}`,
			fiatBalance: 0,
			type: result.type,
			account: {
				asset: "SOL",
				fiatBalance: "0",
				price: `${price_usdt.data.metadata.tokens.So11111111111111111111111111111111111111112.price_usdt}`,
			},
			tokenHoldings: null,

			transactions: transactions,
		};

		if (_response) {
			_response.fiatBalance = (
				_response.balance * _response.account.price
			).toFixed(5);

			_response.account.fiatBalance = (
				_response.balance * _response.account.price
			).toFixed(5);

			_response.fiatBalance = parseFloat(_response.account.fiatBalance);
		}

		_response.tokenHoldings = await getTokens({ id: params.id });

		_response.tokenHoldings.tokens.unshift({
			tokenType: "SOL",
			fiatBalance: _response.fiatBalance,
			symbol: "SOL",
			name: "Solana",
			price: _response.account.price,
			amount: parseFloat(_response.balance).toFixed(5),
			image:
				"https://vtxz26svcpnbg5ncfansdb5zt33ec2bwco6uuah3g3sow3pewfma.arweave.zelf.world/rO-delUT2hN1oigbIYe5nvZBaDYTvUoA-zbk623ksVg",
		});

		if (_response.tokenHoldings.fiatBalance)
			_response.fiatBalance += _response.tokenHoldings.fiatBalance;

		// round up to 4 decimal places
		_response.fiatBalance = parseFloat(_response.fiatBalance.toFixed(4));

		return _response;
	} catch (error) {
		return null;
	}
};

const getTransactionsList = async (params, query) => {
	const { data } = await instance.get(
		`${endpoint}/account/transaction?address=${params.id}&limit=${query.show}`,
		{
			headers: {
				cookie:
					"__cf_bm=6Nb_BhzZtOdGxVrRrnJoN83pN6rfOtlvuRxjI90nJ0E-1728040658-1.0.1.1-wWYmBJNnH55RvNIFlxo41XFAhHH4kt68pEvyR2fW2Zb_6hVNARhlKxBPCqoZQ_ZhtRQjCeFp6vReppgZbEYgbw; cf_clearance=ibbR6Iox6IDDq4r5WTmuKO0tkKPcwv8GloL.CCp7V3w-1728040665-1.2.1.1-Ef84Taqzk5aSmCiHV321WYtxUv7EIDJTG0SDgp4J.kjIs6gG9J7GVpSV9HE12tuH7xN5vtzdNt1sm6dOee1c20DQO2Lqd.rymeTv.0g340.1jEjK1BnkO4QUlkmEWdbBHzBOc43akGgAef7InJnNEKcg2eO5dPLXT0waBuDCHTs1VMJWBHhfeAE9jZz4C.pPKJKtUDvCyqvR.KRlokRlHo_gnzTVUQDawAtgdLimOOWAK5huvgGQURDoHngS1E5ne03ScjMqfL9HGKME7wXjsK1M9v6zX0WjGMiRDiXkMX3H8oZieb0wyG.j.UKR7jS3K9ElZYtMaZ2kTH1dRJ2DW13.4Q.H3Q.RZlc7Bv3a9FEKf79.2TUxXaiGtKqFH9IbCrPVxFCQ09YxgSp_U0H0AA; _ga=GA1.1.1401977830.1728040664; _ga_PS3V7B7KV0=GS1.1.1728040664.1.1.1728040689.0.0.0; __cf_bm=Mz6cAvTNjPAeUi30bGhjWOHzNal5QLqwS2T6omWu3c8-1728267695-1.0.1.1-oPl.fRzgy_UIvX86I4hXorbEOT5HKcOEAxcTsfbsYnUgtBpIH.Cck88Gm0KcosZyt6sRto_BNTjyJegI2oYryQ",
				"if-none-match": 'W/"622-Ukdydv8vKaxhKj3QjdlU5A1PS9k"',
				origin: "https://solscan.io",
				priority: "u=1, i",
				referer: "https://solscan.io/",
				"sol-aut": "5GvLD-NW7B9dls0fKbJHWeJeCUXOPQAbf70dKwfI:",
				"user-agent":
					"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.106 Safari/537.36",
			},
		}
	);

	return { transactions: formatData(data.data.transactions) };
};

const getTransaction = async (params, query) => {
	const { data } = await instance.get(
		`${endpoint}/transaction/detail?tx=${params.id}`,
		{
			headers: {
				cookie:
					"__cf_bm=6Nb_BhzZtOdGxVrRrnJoN83pN6rfOtlvuRxjI90nJ0E-1728040658-1.0.1.1-wWYmBJNnH55RvNIFlxo41XFAhHH4kt68pEvyR2fW2Zb_6hVNARhlKxBPCqoZQ_ZhtRQjCeFp6vReppgZbEYgbw; cf_clearance=ibbR6Iox6IDDq4r5WTmuKO0tkKPcwv8GloL.CCp7V3w-1728040665-1.2.1.1-Ef84Taqzk5aSmCiHV321WYtxUv7EIDJTG0SDgp4J.kjIs6gG9J7GVpSV9HE12tuH7xN5vtzdNt1sm6dOee1c20DQO2Lqd.rymeTv.0g340.1jEjK1BnkO4QUlkmEWdbBHzBOc43akGgAef7InJnNEKcg2eO5dPLXT0waBuDCHTs1VMJWBHhfeAE9jZz4C.pPKJKtUDvCyqvR.KRlokRlHo_gnzTVUQDawAtgdLimOOWAK5huvgGQURDoHngS1E5ne03ScjMqfL9HGKME7wXjsK1M9v6zX0WjGMiRDiXkMX3H8oZieb0wyG.j.UKR7jS3K9ElZYtMaZ2kTH1dRJ2DW13.4Q.H3Q.RZlc7Bv3a9FEKf79.2TUxXaiGtKqFH9IbCrPVxFCQ09YxgSp_U0H0AA; _ga=GA1.1.1401977830.1728040664; _ga_PS3V7B7KV0=GS1.1.1728040664.1.1.1728040689.0.0.0; __cf_bm=Mz6cAvTNjPAeUi30bGhjWOHzNal5QLqwS2T6omWu3c8-1728267695-1.0.1.1-oPl.fRzgy_UIvX86I4hXorbEOT5HKcOEAxcTsfbsYnUgtBpIH.Cck88Gm0KcosZyt6sRto_BNTjyJegI2oYryQ",
				"if-none-match": 'W/"622-Ukdydv8vKaxhKj3QjdlU5A1PS9k"',
				origin: "https://solscan.io",
				priority: "u=1, i",
				referer: "https://solscan.io/",
				"sol-aut": "5GvLD-NW7B9dls0fKbJHWeJeCUXOPQAbf70dKwfI:",
				"user-agent":
					"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.106 Safari/537.36",
			},
		}
	);

	return { transaction: data.data };
};

const getTokens = async (params) => {
	try {
		const { data } = await instance.get(
			`${endpoint}/account/tokens?address=${params.id}`,
			{
				headers: {
					cookie:
						"__cf_bm=6Nb_BhzZtOdGxVrRrnJoN83pN6rfOtlvuRxjI90nJ0E-1728040658-1.0.1.1-wWYmBJNnH55RvNIFlxo41XFAhHH4kt68pEvyR2fW2Zb_6hVNARhlKxBPCqoZQ_ZhtRQjCeFp6vReppgZbEYgbw; cf_clearance=ibbR6Iox6IDDq4r5WTmuKO0tkKPcwv8GloL.CCp7V3w-1728040665-1.2.1.1-Ef84Taqzk5aSmCiHV321WYtxUv7EIDJTG0SDgp4J.kjIs6gG9J7GVpSV9HE12tuH7xN5vtzdNt1sm6dOee1c20DQO2Lqd.rymeTv.0g340.1jEjK1BnkO4QUlkmEWdbBHzBOc43akGgAef7InJnNEKcg2eO5dPLXT0waBuDCHTs1VMJWBHhfeAE9jZz4C.pPKJKtUDvCyqvR.KRlokRlHo_gnzTVUQDawAtgdLimOOWAK5huvgGQURDoHngS1E5ne03ScjMqfL9HGKME7wXjsK1M9v6zX0WjGMiRDiXkMX3H8oZieb0wyG.j.UKR7jS3K9ElZYtMaZ2kTH1dRJ2DW13.4Q.H3Q.RZlc7Bv3a9FEKf79.2TUxXaiGtKqFH9IbCrPVxFCQ09YxgSp_U0H0AA; _ga=GA1.1.1401977830.1728040664; _ga_PS3V7B7KV0=GS1.1.1728040664.1.1.1728040689.0.0.0; __cf_bm=Mz6cAvTNjPAeUi30bGhjWOHzNal5QLqwS2T6omWu3c8-1728267695-1.0.1.1-oPl.fRzgy_UIvX86I4hXorbEOT5HKcOEAxcTsfbsYnUgtBpIH.Cck88Gm0KcosZyt6sRto_BNTjyJegI2oYryQ",
					"if-none-match": 'W/"622-Ukdydv8vKaxhKj3QjdlU5A1PS9k"',
					origin: "https://solscan.io",
					priority: "u=1, i",
					referer: "https://solscan.io/",
					"sol-aut": "uommLFJFHe0I=7pB9dls0fKSHLSixPco",
					"user-agent":
						"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.106 Safari/537.36",
				},
			}
		);

		const tokenHoldings = {
			total: data.data.tokens.length,
			balance: 0,
			fiatBalance: 0,
			tokens: [],
		};

		try {
			for (let index = 0; index < data.data.tokens.length; index++) {
				const token = data.data.tokens[index];

				tokenHoldings.fiatBalance += token.value || 0;

				const tokenData = {
					fiatBalance: token.value,
					name: token.tokenName,
					amount: token.balance,
					price: token.priceUsdt,
					symbol: token.tokenSymbol,
					image: token.tokenIcon,
					address: token.address,
					tokenAddress: token.tokenAddress,
					tokenType: "token",
					//reputation: token.reputation,
					//quantity: token.amount,
					//decimals: token.decimals,
					owner: token.owner,
				};

				tokenData.fiatBalance = parseFloat(tokenData.fiatBalance?.toFixed(4));
				// do the same for amount
				tokenData.amount = parseFloat(tokenData.amount.toFixed(4));

				tokenHoldings.tokens.push(tokenData);
			}
		} catch (exception) {
			console.error({ exception });
		}

		return tokenHoldings;
	} catch (error) {
		return null;
	}
};

const getTransfers = async (params, query) => {
	try {
		const { data } = await instance.get(
			`${endpoint}/account/transfer?address=${params.id}&page=${query.page}&page_size=${query.show}&remove_spam=false&exclude_amount_zero=false`,

			{
				headers: {
					cookie:
						"__cf_bm=6Nb_BhzZtOdGxVrRrnJoN83pN6rfOtlvuRxjI90nJ0E-1728040658-1.0.1.1-wWYmBJNnH55RvNIFlxo41XFAhHH4kt68pEvyR2fW2Zb_6hVNARhlKxBPCqoZQ_ZhtRQjCeFp6vReppgZbEYgbw; cf_clearance=ibbR6Iox6IDDq4r5WTmuKO0tkKPcwv8GloL.CCp7V3w-1728040665-1.2.1.1-Ef84Taqzk5aSmCiHV321WYtxUv7EIDJTG0SDgp4J.kjIs6gG9J7GVpSV9HE12tuH7xN5vtzdNt1sm6dOee1c20DQO2Lqd.rymeTv.0g340.1jEjK1BnkO4QUlkmEWdbBHzBOc43akGgAef7InJnNEKcg2eO5dPLXT0waBuDCHTs1VMJWBHhfeAE9jZz4C.pPKJKtUDvCyqvR.KRlokRlHo_gnzTVUQDawAtgdLimOOWAK5huvgGQURDoHngS1E5ne03ScjMqfL9HGKME7wXjsK1M9v6zX0WjGMiRDiXkMX3H8oZieb0wyG.j.UKR7jS3K9ElZYtMaZ2kTH1dRJ2DW13.4Q.H3Q.RZlc7Bv3a9FEKf79.2TUxXaiGtKqFH9IbCrPVxFCQ09YxgSp_U0H0AA; _ga=GA1.1.1401977830.1728040664; _ga_PS3V7B7KV0=GS1.1.1728040664.1.1.1728040689.0.0.0; __cf_bm=Mz6cAvTNjPAeUi30bGhjWOHzNal5QLqwS2T6omWu3c8-1728267695-1.0.1.1-oPl.fRzgy_UIvX86I4hXorbEOT5HKcOEAxcTsfbsYnUgtBpIH.Cck88Gm0KcosZyt6sRto_BNTjyJegI2oYryQ",
					"if-none-match": 'W/"622-Ukdydv8vKaxhKj3QjdlU5A1PS9k"',
					origin: "https://solscan.io",
					priority: "u=1, i",
					referer: "https://solscan.io/",
					"sol-aut": "uommLFJFHe0I=7pB9dls0fKSHLSixPco",
					"user-agent":
						"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.106 Safari/537.36",
				},
			}
		);

		const tokensArray = Object.values(data.metadata.tokens);

		return { transactions: formatDataTranfe(data.data, tokensArray) };
	} catch (error) {
		console.error({ error });
		return null;
	}
};
const getTransfer = async (params) => {
	return { id: params.id };
};

function formatData(transactions) {
	return transactions.map((tx) => ({
		txHash: tx.txHash,
		block_time: new Date(tx.blockTime * 1000),
		block: tx.slot,
		fee_SOL: tx.fee / 1_000_000_000,
		status: tx.status,
		signer_by: tx.signer,
	}));
}

function formatDataTranfe(transactions, token) {
	return transactions.map((tx) => ({
		hash: tx.trans_id,
		block: tx.block_id.toString(),
		date: new Date(tx.block_time * 1000),
		age: moment(tx.block_time * 1000).fromNow(),
		from: tx.from_address,
		method:
			tx.activity_type === "ACTIVITY_SPL_TRANSFER"
				? "transfer"
				: tx.activity_type,
		traffic: tx.flow.toUpperCase(),
		to: tx.to_address,
		amount: (tx.amount / Math.pow(10, tx.token_decimals)).toFixed(
			tx.token_decimals
		),
		fiatAmount: tx.value.toString(),
		from_token_account: tx.from_token_account,
		to_token_account: tx.to_token_account,

		status: "Success",
		asset: token.find((token) => token.token_address === tx.token_address)
			.token_symbol,
	}));
}
module.exports = {
	getAddress,
	getTokens,
	getTransactionsList,
	getTransaction,
	getTransfers,
	getTransfer,
};
