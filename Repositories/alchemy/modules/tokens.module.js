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

const solanaTokens = async (network, name) => {
	try {
		const { data } = await instance.get(
			`https://api-v2.solscan.io/v2/search?keyword=${name}`,
			{
				headers: {
					cookie:
						"cf_clearance=MGXhijMLHJrK_bVkDmYMgsE5J17fN5okVjBRYbLtWFQ-1744129855-1.2.1.1-mbg0YmtPus2SMbsU5VfmK0vaeUr9c7BHkC58w1rYfba9n9XurBEZxWAXkfYrtHF6zu09YeeNdXMbbz24TSSC.schmWu_oLqbK6Coxhe6Xs8DMhi233CHkJp09fcE_plz_kjAqPxzFwNHG.bYmnOeilhSIis.8VQxYdzhb3FiG11J6n95iyGv6yszLXUA1t1_XJkS0Nvas1Zp6K.jhUZkDz3NzvlUj5feHlm5aux8WlNBaGMlKa5C5ZNsQJ4kYcIFQrQvPsvWs61kE1lD1wxc1KRUlk5ulwOZdsiLlnXJqj1Fy7Q_qnFPJyvDwfClyzIaa0QesdzN30elRXfMLqTAyXm0_r7.fMB9na_732qOZ8I; _ga_PS3V7B7KV0=GS1.1.1746207412.1.0.1746207412.0.0.0; _ga=GA1.1.1518694017.1746207413",
					origin: "https://solscan.io",
					priority: "u=1, i",
					referer: "https://solscan.io/",
				},
			}
		);

		function extractTokenInfo(tokens) {
			return tokens
				.filter((token) => token.icon !== undefined)
				.map((token) => ({
					network,
					tokenContractAddress: token.address,
					name: token.name,
					logo: token.icon,
				}));
		}
		return extractTokenInfo(data.data[0].result);
	} catch (error) {
		return [];
	}
};

const ethereumTokens = async (network, name) => {
	try {
		const { data } = await instance.get(
			`https://etherscan.io/searchHandler?term=${name}&filterby=0&curPath=%3Fps%3D100&i=0`,
			{
				headers: {
					"user-agent":
						"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
				},
			}
		);
		function extractTokenInfo(tokens) {
			return tokens
				.filter((token) => token.img !== "")
				.map((token) => ({
					network,
					tokenContractAddress: token.address,
					name: token.title,
					logo: `https://etherscan.io/token/images/${token.img}`,
				}));
		}
		return extractTokenInfo(data);
	} catch (error) {
		return [];
	}
};

const avalancheTokens = async (network, name) => {
	try {
		const { data } = await instance.get(
			`https://cdn.routescan.io/api/search?query=${name}&limit=10&chainId=all&ecosystem=avalanche&filter=erc20&filter=erc721&filter=addresses`,
			{
				headers: {
					"user-agent":
						"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
				},
			}
		);

		function extractTokenInfo(tokens) {
			return tokens
				.filter((token) => token.detail.icon !== null)
				.map((token) => ({
					network,
					tokenContractAddress: token.address,
					name: token.name,
					logo: token.detail.icon,
				}));
		}
		return extractTokenInfo(data.erc20.items);
	} catch (error) {
		return [];
	}
};

const polygonTokens = async (network, name) => {
	try {
		const { data } = await instance.get(
			`https://polygonscan.com/searchHandler?term=${name}&filterby=0`,
			{
				headers: {
					"user-agent":
						"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
				},
			}
		);

		function extractTokenInfo(tokens) {
			return tokens
				.filter((token) => token.img !== "")
				.map((token) => ({
					network,
					tokenContractAddress: token.address,
					name: token.title,
					logo: `https://polygonscan.com/token/images/${token.img}`,
				}));
		}
		return extractTokenInfo(data);
	} catch (error) {
		return [];
	}
};

const bnbTokens = async (network, name) => {
	try {
		const { data } = await instance.get(
			`https://bscscan.com/searchHandler?term=${name}&filterby=0`,
			{
				headers: {
					"user-agent":
						"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
				},
			}
		);

		function extractTokenInfo(tokens) {
			return tokens
				.filter((token) => token.img !== "")
				.map((token) => ({
					network,
					tokenContractAddress: token.address,
					name: token.title,
					logo: `https://bscscan.com/token/images/${token.img}`,
				}));
		}
		return extractTokenInfo(data);
	} catch (error) {
		console.log(error);
		return [];
	}
};

const suiTokens = async (network, name) => {
	try {
		const { data } = await instance.get(
			`https://internal.suivision.xyz/mainnet/api/coinsList?search=${name}&sortBy=volume`,
			{
				headers: {
					"x-api-signature": "bbd71d268d649ab4a07a2c8919dccb82",
					"x-api-timestamp": "1746457766",
					"x-app-id": "0cb54fd6672bb5bb0f423d30adb8207c",
					"user-agent":
						"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
				},
			}
		);

		function extractTokenInfo(tokens) {
			return tokens
				.filter((token) => token.img !== "")
				.map((token) => ({
					network,
					tokenContractAddress: token.coinID,
					name: token.name,
					logo: `${token.iconUrl}`,
				}));
		}
		return extractTokenInfo(data.result.data);
	} catch (error) {
		return [];
	}
};

const tokenOklin = async (tokenContractAddress, network) => {
	const existingRecord = await MongoORM.buildQuery(
		{
			where_tokenContractAddress: tokenContractAddress,
			where_network: network,
			findOne: true,
		},
		modelTokens,
		null,
		[]
	);

	if (existingRecord) {
		delete existingRecord._doc.updatedAt;
		delete existingRecord._doc.createdAt;
		delete existingRecord._doc._id;
		delete existingRecord._doc.__v;
		return existingRecord;
	}
	const t = Date.now();
	const networkPaths = {
		solana: `data/latest/sol/tokens`,
		ethereum: `eth/tokens`,
		avalanche: `avaxc/tokens`,
		polygon: `polygon/tokens`,
		bnb: `bsc/tokens`,
		sui: `sui/tokens`,
	};

	const path = networkPaths[network];
	if (!path) {
		const error = new Error("unsupported_network");
		error.status = 400;
		throw error;
	}

	const url = `${urlBaseOklin}/api/explorer/v2/${path}/${tokenContractAddress}?t=${t}`;

	try {
		const { data } = await axios.get(url, {
			httpsAgent: agent,
			headers: {
				"X-Apikey": get_ApiKey().getApiKey(),
				"User-Agent":
					"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36",
			},
		});

		const response = {
			tokenContractAddress: data.data.mint || data.data.tokenContractAddress,
			network,
			name: data.data.name,
			symbol: data.data.symbol,
			tokenType: data.data.tokenType,
			logo: await formatLogoBase64(data.data.logoUrl),
			decimals: data.data.decimals || data.data.precision,
		};
		if (!existingRecord) {
			const responseToken = new modelTokens(response);

			await responseToken.save();
		}

		return response;
	} catch (e) {
		const error = new Error("token_not_found");
		error.status = 404;
		throw error;
	}
};

const formatLogoBase64 = async (url) => {
	try {
		const response = await axios.get(url, {
			responseType: "arraybuffer",
		});

		const base64 = Buffer.from(response.data, "binary").toString("base64");
		const contentType = response.headers["content-type"];
		return `data:${contentType};base64,${base64}`;
	} catch (error) {
		console.error("Error al convertir imagen:", error.message);
		return null;
	}
};
module.exports = {
	solanaTokens,
	ethereumTokens,
	avalancheTokens,
	polygonTokens,
	bnbTokens,
	suiTokens,
	tokenOklin,
};
