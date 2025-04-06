const axios = require("axios");
const moment = require("moment");
const { generateRandomUserAgent } = require("../../../Core/helpers");
const instance = axios.create({ timeout: 30000 });

/**
 * Obtiene el balance de una dirección en Avalanche
 * @param {Object} params - Contiene el id (dirección)
 */
const getBalance = async (params) => {
	try {
		const { data } = await instance.get(
			`https://toncenter.com/api/v3/accountStates?address=${params.id}&include_boc=false`,

			{
				headers: { "user-agent": generateRandomUserAgent() },
			}
		);

		const priceTon = await instance.get(
			`https://api.ton.cat/v2/contracts/blockchain/market_stats`
		);

		return {
			address: params.id,
			fullName: "",
			balance: data.accounts[0].balance,
			_balance: Number(data.accounts[0].balance),
			fiatBalance: data.accounts[0].balance * priceTon.data.quotes.usd.price,
			account: {
				asset: "TON",
				fiatBalance: (
					data.accounts[0].balance * priceTon.data.quotes.usd.price
				).toString(),
				price: priceTon.data.quotes.usd.price,
			},
			tokenHoldings: {
				total: 0,
				balance: 0,
				tokens: [],
			},
			transactions: await getTransactionsList({ id: params.id, show: "10" }),
		};
	} catch (error) {
		console.error({ error });
	}
};

/**
 * Obtiene las transacciones de una dirección
 * @param {Object} params - Contiene el id (dirección)
 * @param {Object} query - Parámetros de paginación
 */
const getTransactionsList = async (params) => {
	const { id, show } = params;

	const url = `https://api.tonscan.com/api/bt/getTransactionsForAddress?address=${id}&limit=${show}`;

	const { data } = await axios.get(url, {
		headers: { "user-agent": generateRandomUserAgent() },
	});

	function formatData(data) {
		return data.reduce((acc, item) => {
			if (item.in.value !== null) {
				acc.push({
					block: item.in.seqno,
					hash: item.in.hash,
					from: item.in.from,
					to: item.in.to,
					method: "call",
					traffic: "IN",
					age: item.in.age,
					date: item.in.date,
					amount: item.in.value.toString(),
					//_amount: item.in.value,
					asset: "TON",
				});
			}

			if (item.out.length > 0) {
				acc.push({
					block: item.out[0].seqno,
					hash: item.out[0].hash,
					_hash: item.out[0]._hash,
					from: item.out[0].from,
					to: item.out[0].to,
					method: "call",
					traffic: "OUT",
					age: item.out[0].age,
					date: item.out[0].date,
					amount: item.out[0].value.toString(),
					//_amount: item.out[0].value,
					asset: "TON",
				});
			}

			return acc;
		}, []);
	}

	function extractFriendlyNameAndMessageType(transactions) {
		return transactions.map((tx) => ({
			in: {
				hash: tx.hash,
				_hash: encodeURIComponent(tx.hash),
				from: tx.in_msg?.source,
				to: tx.in_msg?.destination,
				message_type: tx.in_msg?.message_type || null,
				direction: tx.in_msg?.direction,
				age: moment(tx.in_msg?.utime * 1000).fromNow(),
				date: moment(tx.in_msg?.utime * 1000).format("YYYY-MM-DD HH:mm:ss"),
				value: tx.in_msg?.value || null,
			},
			out: tx.out_msgs.map((outMsg) => ({
				hash: tx.hash,
				_hash: encodeURIComponent(tx.hash),
				from: outMsg.source,
				to: outMsg.destination,
				message_type: outMsg.message_type || null,
				direction: outMsg.direction,
				age: moment(outMsg.utime * 1000).fromNow(),
				date: moment(outMsg.utime * 1000).format("YYYY-MM-DD HH:mm:ss"),
				value: outMsg.value || null,
			})),
		}));
	}

	return formatData(
		extractFriendlyNameAndMessageType(data.json.data.transactions)
	);
};

/**
 * Obtiene detalles de una transacción específica
 * @param {Object} params - Contiene el id (hash de la transacción)
 */
const getTransactionDetail = async (params) => {
	try {
		const { id } = params;

		const url = `https://api.tonscan.com/api/bt/getTransactionByHash?tx_hash=${encodeURIComponent(
			id
		)}`;

		const { data } = await axios.get(url, {
			headers: { "user-agent": generateRandomUserAgent() },
		});

		function extractFriendlyNameAndMessageTypeV2(tx) {
			return {
				in: {
					hash: tx.hash,
					_hash: encodeURIComponent(tx.hash),
					from: tx.in_msg?.source,
					from_friendly: tx.in_msg?.source_friendly_name || null,
					to: tx.in_msg?.destination,
					to_friendly: tx.in_msg?.destination_friendly_name || null,
					message_type: tx.in_msg?.message_type || null,
					direction: tx.in_msg?.direction || null,
					age: moment(tx.in_msg?.utime * 1000).fromNow(),
					date: moment(tx.in_msg?.utime * 1000).format("YYYY-MM-DD HH:mm:ss"),
					value: tx.in_msg?.value || null,
					friendly_name: tx.in_msg?.friendly_name || null,
				},
				out: tx.out_msgs.map((outMsg) => ({
					hash: tx.hash,
					_hash: encodeURIComponent(tx.hash),
					from: outMsg.source,
					from_friendly: outMsg.source_friendly_name || null,
					to: outMsg.destination,
					to_friendly: outMsg.destination_friendly_name || null,
					message_type: outMsg.message_type || null,
					direction: outMsg.direction || null,
					age: moment(outMsg.utime * 1000).fromNow(),
					date: moment(outMsg.utime * 1000).format("YYYY-MM-DD HH:mm:ss"),
					value: outMsg.value || null,
					friendly_name: outMsg.friendly_name || null,
				})),
			};
		}

		function formatSingleData(item) {
			const result = [];

			if (item.in.value !== null) {
				result.push({
					hash: item.in.hash,
					_hash: item.in._hash,
					from: item.in.from,
					to: item.in.to,
					method: item.in.message_type || "call",
					traffic: "IN",
					age: item.in.age,
					date: item.in.date,
					amount: item.in.value.toString(),
					asset: "TON",
				});
			}

			if (item.out.length > 0) {
				item.out.forEach((outMsg) => {
					if (outMsg.value !== null) {
						result.push({
							hash: outMsg.hash,
							_hash: outMsg._hash,
							from: outMsg.from,
							to: outMsg.to,
							method: outMsg.message_type || "call",
							traffic: "OUT",
							age: outMsg.age,
							date: outMsg.date,
							amount: outMsg.value.toString(),
							asset: "TON",
						});
					}
				});
			}

			return result[0];
		}

		return {
			transaction: formatSingleData(
				extractFriendlyNameAndMessageTypeV2(data.json.data.detail)
			),
		};
	} catch (error) {
		console.log(error);
		return { transaction: [] };
	}
};

module.exports = {
	getBalance,
	getTransactionsList,
	getTransactionDetail,
};
