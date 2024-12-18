const { TurboFactory, USD, WinstonToTokenAmount, productionTurboConfiguration } = require("@ardrive/turbo-sdk");
const Arweave = require("arweave");
const fs = require("fs");
const path = require("path");
const config = require("../../../Core/config");
const axios = require("axios");
const arweaveUrl = `https://arweave.net`;
const explorerUrl = `https://viewblock.io/arweave/tx`;
const graphql = `https://arweave-search.goldsky.com/graphql`;
const moment = require("moment");

const zelfNameHold = async (zelfProofQRCode, zelfNameObject) => {
	/**
	 * Generate a key from the arweave wallet.
	 */

	// const jwk = {
	// 	kty: "RSA",
	// 	n: config.arwave.n,
	// 	e: config.arwave.e,
	// 	d: config.arwave.d,
	// 	p: config.arwave.p,
	// 	q: config.arwave.q,
	// 	dp: config.arwave.dp,
	// 	dq: config.arwave.dq,
	// 	qi: config.arwave.qi,
	// 	kid: "2011-04-29",
	// };

	const jwk = {
		kty: "RSA",
		n: config.arwave.hold.n,
		e: config.arwave.hold.e,
		d: config.arwave.hold.d,
		p: config.arwave.hold.p,
		q: config.arwave.hold.q,
		dp: config.arwave.hold.dp,
		dq: config.arwave.hold.dq,
		qi: config.arwave.hold.qi,
		kid: "2011-04-29",
	};

	/**
	 * Get the address associated with the generated wallet.
	 */
	// const arweave = new Arweave({});
	// const address = await arweave.wallets.jwkToAddress(jwk);

	/**
	 * Use the arweave key to create an authenticated turbo client
	 */
	const turboAuthClient = TurboFactory.authenticated({
		privateKey: jwk,
		...productionTurboConfiguration,
	});

	// Convert base64 string to a buffer
	const base64Data = zelfProofQRCode.replace(/^data:image\/\w+;base64,/, "");

	const buffer = Buffer.from(base64Data, "base64");

	const fileSize = buffer.length;

	const tempFilePath = path.join(__dirname, `${zelfNameObject.zelfName}.png`);

	// Write buffer to a temporary file
	fs.writeFileSync(tempFilePath, buffer);

	const tags = [
		{
			name: "Content-Type",
			value: "image/png",
		},
		{
			name: "zelfProof",
			value: zelfNameObject.zelfProof,
		},
		{
			name: "hasPassword",
			value: zelfNameObject.hasPassword,
		},
		{
			name: "expiresAt",
			value: moment().add(12, "hour").format("YYYY-MM-DD"),
		},
		{
			name: "coinbase_id",
			value: zelfNameObject.coinbaseCharge?.id,
		},
		{
			name: "coinbase_hosted_url",
			value: zelfNameObject.coinbaseCharge?.hosted_url,
		},
		{
			name: "coinbase_expires_at",
			value: zelfNameObject.coinbaseCharge?.expires_at,
		},
		{
			name: "coinbase_created_at",
			value: zelfNameObject.coinbaseCharge?.created_at,
		},
	];

	const publicKeys = Object.keys(zelfNameObject.publicData);

	for (let index = 0; index < publicKeys.length; index++) {
		const publicKey = publicKeys[index];

		tags.push({
			name: publicKey,
			value: zelfNameObject.publicData[publicKey],
		});
	}

	/**
	 * Post the temporary file to the Turbo service with metadata.
	 */
	const uploadResult = await turboAuthClient.uploadFile({
		fileStreamFactory: () => fs.createReadStream(tempFilePath),
		fileSizeFactory: () => fileSize,
		dataItemOpts: {
			tags,
		},
	});

	// Clean up the temporary file after upload
	fs.unlinkSync(tempFilePath);

	return {
		...uploadResult,
		url: `${arweaveUrl}/${uploadResult.id}`,
		explorerUrl: `${explorerUrl}/${uploadResult.id}`,
	};
};

const _zelfNameHold = async (zelfProofQRCode) => {
	/**
	 * Generate a key from the arweave wallet.
	 */
	const arweave = new Arweave({});

	const jwk = {
		kty: "RSA",
		n: config.arwave.n,
		e: config.arwave.e,
		d: config.arwave.d,
		p: config.arwave.p,
		q: config.arwave.q,
		dp: config.arwave.dp,
		dq: config.arwave.dq,
		qi: config.arwave.qi,
		kid: "2011-04-29",
	};

	/**
	 * Get the address associated with the generated wallet.
	 */
	const address = await arweave.wallets.jwkToAddress(jwk);

	/**
	 * Use the arweave key to create an authenticated turbo client
	 */
	const turboAuthClient = TurboFactory.authenticated({
		privateKey: jwk,
		...productionTurboConfiguration,
	});

	/**
	 * Fetch the balance for the private key.
	 */
	let balance = await turboAuthClient.getBalance();

	// Check if balance is sufficient; assume we need at least 10 USD worth of winc
	const requiredWinc = await turboAuthClient.getWincForFiat({ amount: USD(10) });

	// Convert base64 string to a buffer
	const base64Data = zelfProofQRCode.replace(/^data:image\/\w+;base64,/, ""); //
	const buffer = Buffer.from(base64Data, "base64");

	const fileSize = buffer.length;
	const tempFilePath = path.join(__dirname, "tempFile.png");

	// Write buffer to a temporary file
	fs.writeFileSync(tempFilePath, buffer);

	/**
	 * Post the temporary file to the Turbo service with metadata.
	 */
	const uploadResult = await turboAuthClient.uploadFile({
		fileStreamFactory: () => fs.createReadStream(tempFilePath),
		fileSizeFactory: () => fileSize,
		dataItemOpts: {
			tags: [
				{
					name: "Content-Type",
					value: "image/png",
				},
				{
					name: "zelfName",
					value: "johantest.zelf",
				},
			],
		},
	});

	// Clean up the temporary file after upload
	fs.unlinkSync(tempFilePath);

	return { uploadResult, address };
};

const search = async (zelfName, extraConditions = {}) => {
	if (!zelfName && (!extraConditions.key || !extraConditions.value)) return null;

	const tagsToSearch = zelfName
		? `[{ name: "zelfName", values: "${zelfName}" }]`
		: `[{ name: "${extraConditions.key}", values: "${extraConditions.value}" }]`;

	const query = {
		query: `
    {
 		transactions(
			tags: ${tagsToSearch},
			owners: ["vzrsUNMg17WFPmh73xZguPbn_cZzqnef3btvmn6-YDk"]
		) {
			edges {
				node {
					id
					owner {
						address
					}
					data {
						size
						type
					}
					tags {
						name
						value
					}
				}
			}
		}
	}
  `,
	};

	const result = await axios.post(graphql, query, {
		headers: { "Content-Type": "application/json" },
	});

	const searchResults = result.data?.data?.transactions?.edges;

	if (!searchResults || !searchResults.length) {
		return {
			zelfName,
			available: true,
		};
	}

	return searchResults;
};

module.exports = {
	zelfNameHold,
	search,
};
