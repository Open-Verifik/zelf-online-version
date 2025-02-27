const { getCleanInstance } = require("../../../Core/axios");
const instance = getCleanInstance(30000);
const Model = require("../models/dataAnalytics.model");

/**
 * @param {*} params
 */

const get_data_analytics = async (params, query) => {
	try {
		const { symbol, network, idAseet } = await idAseet_(params.asset);

		const statistics = await instance.get(
			`https://api.coinmarketcap.com/aggr/v3.1/mobile/coin-detail?id=${idAseet}&langCode=${query.langCode}&convertId=5426`,
			{
				headers: {
					"user-agent": "Dart/3.2 (dart:io)",
					appversion: "4.63.1",
					platform: "android",
				},
			}
		);

		delete statistics.data.data.urls.message_board;
		delete statistics.data.data.urls.announcement;

		const response = {
			price: {
				price: statistics.data.data.statistics.price,
				priceChangePercentage1h:
					statistics.data.data.statistics.priceChangePercentage1h,
				priceChangePercentage1y:
					statistics.data.data.statistics.priceChangePercentage1y,
				priceChangePercentage24h:
					statistics.data.data.statistics.priceChangePercentage24h,
				priceChangePercentage30d:
					statistics.data.data.statistics.priceChangePercentage30d,
				priceChangePercentage60d:
					statistics.data.data.statistics.priceChangePercentage60d,
				priceChangePercentage7d:
					statistics.data.data.statistics.priceChangePercentage7d,
				priceChangePercentage90d:
					statistics.data.data.statistics.priceChangePercentage90d,
				priceChangePercentageAll:
					statistics.data.data.statistics.priceChangePercentageAll,
				priceChangePercentageYesterday:
					statistics.data.data.statistics.priceChangePercentageYesterday,
			},
			about: {
				symbol: symbol,
				network: network,
				description: statistics.data.data.description,
				urls: statistics.data.data.urls,
				information: {
					marketCap: statistics.data.data.statistics.marketCap,
					marketCapChangePercentage24h:
						statistics.data.data.statistics.marketCapChangePercentage24h,
					volume: statistics.data.data.volume,
					volumeChangePercentage24h:
						statistics.data.data.volumeChangePercentage24h,
					totalSupply: statistics.data.data.statistics.totalSupply,
					circulatingSupply: statistics.data.data.statistics.circulatingSupply,
					holders:
						statistics.data?.data?.analysisV2?.addressByTimeHeld
							?.holdersPercent,
				},
				performance24h: {
					volume: statistics.data.data.statistics.volumeYesterday,
					volumePriceChangePercentage:
						statistics.data.data.statistics.ytdPriceChangePercentage,
					traders:
						statistics.data?.data?.analysisV2?.addressByTimeHeld
							?.tradersPercent,
				},
			},
		};

		return response;
	} catch (error) {
		console.log(error);
		error = new Error("asset_not_found");
		error.status = 404;
		throw error;
	}
};

const get_chart_data = async (asset, range) => {
	try {
		const { idAseet } = await idAseet_(asset);

		const chart_data = await instance.get(
			`https://api.coinmarketcap.com/data-api/v3.3/cryptocurrency/detail/chart?id=${idAseet}&interval=5m&convertId=2781%2C5426&range=${range}`,
			{
				headers: {
					"user-agent": "Dart/3.2 (dart:io)",
					appversion: "4.63.1",
					platform: "android",
				},
			}
		);

		return chart_data.data.data;
	} catch (error) {
		error.status = 404;
		throw error;
	}
};

const idAseet_ = async (asset) => {
	try {
		const cryptod = await Model.findOne(
			{
				"crypto.symbol": asset,
			},
			{ "crypto.$": 1 }
		);

		if (cryptod && cryptod.crypto.length > 0) {
			const { symbol, name: network, id: idAseet } = cryptod.crypto[0];

			return {
				symbol,
				network,
				idAseet,
			};
		}

		const cryptoResponse = await instance.get(
			"https://s3.coinmarketcap.com/generated/core/crypto/app-search.json",
			{
				headers: {
					"user-agent": "Dart/3.2 (dart:io)",
					appversion: "4.63.1",
					platform: "android",
				},
			}
		);

		const formatCryptoData = (data) => {
			const { fields, values } = data;
			const ignoredFields = new Set([
				"type",
				"rank",
				"address",
				"search_score",
			]);

			return values.map((valueArray) => {
				let obj = {};
				fields.forEach((field, index) => {
					if (!ignoredFields.has(field)) {
						obj[field] = valueArray[index];
					}
				});
				return obj;
			});
		};

		const findTokenBySymbol = (symbol) => {
			return formatCryptoData(cryptoResponse.data).find(
				(token) => token.symbol === symbol
			);
		};

		const result = findTokenBySymbol(asset);

		if (!result) {
			const error = new Error("asset_not_found");
			error.status = 404;
			throw error;
		}

		await Model.findOneAndUpdate(
			{},
			{ $set: { crypto: formatCryptoData(cryptoResponse.data) } },
			{ new: true, upsert: true }
		);

		return {
			symbol: result.symbol,
			network: result.name,
			idAseet: result.id,
		};
	} catch (error) {
		throw error;
	}
};

module.exports = {
	get_data_analytics,
	get_chart_data,
};
