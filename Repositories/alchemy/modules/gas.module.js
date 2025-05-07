const { getCleanInstance } = require("../../../Core/axios");
const instance = getCleanInstance(30000);
const gasEthereum = async (network) => {
	// const { data } = await instance.get("http://gasext.etherscan.com:3000/gas", {
	// 	headers: {
	// 		origin: "chrome-extension://joeoaocmnapjmkhjndfflecmdaldkpbn",
	// 		"user-agent":
	// 			"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
	// 	},
	// });
	const { data } = await instance.get(
		"https://etherscan.io/autoUpdateGasTracker.ashx?sid=ce19538c0a0e8f45e4a5b711771932fd",
		{
			headers: {
				Cookie:
					"ASP.NET_SessionId=trqua3c1lajpwkpaa1k1rmvy; __cflb=02DiuFnsSsHWYH8WqVXaqSXf986r8yFDreJWZaszSEd4G; _ga_T1JC9RNQXV=GS1.1.1746455336.1.0.1746455336.60.0.0; etherscan_offset_datetime=-5; cf_clearance=ji7iB_5q0fQqCH4dph.e8VSasMgwYMNkIZIG4ftRApA-1746455339-1.2.1.1-Qz1rCOT5gwkrnf7_DyWiA46Oz50tgHXyI_1Drszde7xwTiR5RQKvY9lq2tZ_.qUmFaZ7HTPf6TQuVNyGg6U39hcouF4_QTKwz7dsgOi2J57GZ_vs2Pd9QolPsKVpKtR2eOx7SqX4VMzBns.3TF02MipvsF3ahCW_8iDq1ISe4J32zE9BZ3SMiNYET8jX_KRm8551XUUN6UcYq9UJbmdrod0NqHVCulaPZ7FeuKafRKI6ZAlxP4IxTBH9YWsPkTRrM05rgCoSvs4J11vhCTEnj0h8kFTefkau_jN449JZFRyWsAqKJvYpMWvWKKOsh29n4mV_nK4JUM0wYQzMs4dEXvrItA4FMCoG6cQEbLd7e8g; _ga=GA1.2.909415190.1746455337; _gid=GA1.2.1980277448.1746455339; _gat_gtag_UA_46998878_6=1",
				"user-agent":
					"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
			},
		}
	);

	const response = {
		network,
		viewExplorer: "https://etherscan.io/gastracker",
		priceEstimates: {
			slow: {
				level: "slow",
				value: `${data.lowPrice}`,
				unit: "gwei",
				estimatedSeconds: `${data.lowGasEstimate.match(/\d+/)[0]}`,
				priceUsd: data.lowGasPriceUsd.replace("$", ""),
			},
			standard: {
				level: "standard",
				value: `${data.avgPrice}`,
				unit: "gwei",
				estimatedSeconds: `${data.avgGasEstimate.match(/\d+/)[0]}`,
				priceUsd: data.avgGasPriceUsd.replace("$", ""),
			},
			fast: {
				level: "fast",
				value: `${data.highPrice}`,
				unit: "gwei",
				estimatedSeconds: `${data.highGasEstimate.match(/\d+/)[0]}`,
				priceUsd: data.highGasPriceUsd.replace("$", ""),
			},
		},
	};

	return response;
};
const gasSolana = async (network) => {
	const { data } = await instance.get(
		"https://api-v2.solscan.io/v2/common/sol-market?tokenAddress=So11111111111111111111111111111111111111112",
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
					"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
			},
		}
	);

	const response = {
		network,
		viewExplorer: "https://solscan.io/analysis/fee_tracker",
		priceEstimates: {
			slow: {
				level: "slow",
				value: `${data.data.min_fee}`,
				unit: "sol",
				estimatedSeconds: "30-60",
			},
			standard: {
				level: "standard",
				value: `${data.data.avg_fee}`,
				unit: "sol",
				estimatedSeconds: "10-30",
			},
			fast: {
				level: "fast",
				value: `${data.data.max_fee}`,
				unit: "sol",
				estimatedSeconds: "5-10",
			},
		},
	};
	return response;
};
const gasPolygon = async (network) => {
	const { data } = await instance.get(
		"https://gpoly.blockscan.com/gasapi.ashx?apikey=key&method=gasoracle",
		{
			headers: {
				"user-agent":
					"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
			},
		}
	);

	const response = {
		network,
		viewExplorer: "https://polygonscan.com/gastracker",
		priceEstimates: {
			slow: {
				level: "slow",
				value: `${data.result.SafeGasPrice}`,
				unit: "gwei",
				estimatedSeconds: "30-60",
			},
			standard: {
				level: "standard",
				value: `${data.result.ProposeGasPrice}`,
				unit: "gwei",
				estimatedSeconds: "10-30",
			},
			fast: {
				level: "fast",
				value: `${data.result.FastGasPrice}`,
				unit: "gwei",
				estimatedSeconds: "5-10",
			},
		},
	};

	return response;
};
const gasAvalanche = async (network) => {};
const gasBnb = async (network) => {
	const { data } = await instance.get(
		"https://gbsc.blockscan.com/gasapi.ashx?apikey=key&method=gasoracle",
		{
			headers: {
				"user-agent":
					"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
			},
		}
	);

	const response = {
		network,
		viewExplorer: "https://bscscan.com/gastracker",
		priceEstimates: {
			slow: {
				level: "slow",
				value: `${data.result.SafeGasPrice}`,
				unit: "gwei",
				estimatedSeconds: "30-60",
			},
			standard: {
				level: "standard",
				value: `${data.result.ProposeGasPrice}`,
				unit: "gwei",
				estimatedSeconds: "10-30",
			},
			fast: {
				level: "fast",
				value: `${data.result.FastGasPrice}`,
				unit: "gwei",
				estimatedSeconds: "5-10",
			},
		},
	};

	return response;
};

module.exports = {
	gasEthereum,
	gasSolana,
	gasPolygon,
	gasAvalanche,
	gasBnb,
};
