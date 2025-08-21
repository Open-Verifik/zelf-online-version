const { TurboFactory, USD, WinstonToTokenAmount, productionTurboConfiguration } = require("@ardrive/turbo-sdk");
const Arweave = require("arweave");
const fs = require("fs");
const path = require("path");
const config = require("../../../Core/config");
const axios = require("axios");
const arweaveUrl = `https://arweave.zelf.world`;
const explorerUrl = `https://viewblock.io/arweave/tx`;

const owner = config.arwave.env === "development" ? config.arwave.hold.owner : config.arwave.owner;

const graphql = `${arweaveUrl}/graphql`;

const zelfNameRegistration = async (zelfProofQRCode, zelfNameObject) => {
	const { zelfProof, hasPassword, publicData } = zelfNameObject;

	const env = config.arwave.env;

	/**
	 * Generate a key from the arweave wallet.
	 */

	const jwk = {
		kty: "RSA",
		n: env === "development" ? config.arwave.hold.n : config.arwave.n,
		e: env === "development" ? config.arwave.hold.e : config.arwave.e,
		d: env === "development" ? config.arwave.hold.d : config.arwave.d,
		p: env === "development" ? config.arwave.hold.p : config.arwave.p,
		q: env === "development" ? config.arwave.hold.q : config.arwave.q,
		dp: env === "development" ? config.arwave.hold.dp : config.arwave.dp,
		dq: env === "development" ? config.arwave.hold.dq : config.arwave.dq,
		qi: env === "development" ? config.arwave.hold.qi : config.arwave.qi,
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

	fs.writeFileSync(tempFilePath, buffer);

	const tags = [
		{
			name: "Content-Type",
			value: "image/png",
		},
		{
			name: "zelfProof",
			value: zelfProof,
		},
	];

	if (hasPassword) {
		tags.push({
			name: "hasPassword",
			value: hasPassword,
		});
	}

	const publicKeys = Object.keys(publicData);

	for (let index = 0; index < publicKeys.length; index++) {
		const publicKey = publicKeys[index];

		if (publicKey === "zelfProof" || publicKey === "hasPassword") {
			continue;
		}

		tags.push({
			name: publicKey,
			value: `${publicData[publicKey]}`,
		});
	}

	// if the size is greater than 100kb, we need to skip the upload
	if (fileSize > 100 * 1024) {
		console.info("skipping upload because the file size is greater than 100kb", {
			fileInKb: fileSize / 1024,
			fileInMb: fileSize / 1024 / 1024,
		});

		return {
			skipped: true,
		};
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

const search = async (queryParams = {}) => {
	if (!queryParams.key || !queryParams.value) return null;

	const tagsToSearch = `[{ name: "${queryParams.key}", values: "${queryParams.value}" }]`;

	const query = {
		query: `
    {
 		transactions(
			tags: ${tagsToSearch},
			owners: ["${owner}"]
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
			...queryParams,
			available: true,
		};
	}

	return searchResults;
};

const arweaveIDToBase64 = async (id) => {
	try {
		const encryptedResponse = await axios.get(`${arweaveUrl}/${id}`, {
			responseType: "arraybuffer",
		});

		if (encryptedResponse?.data) {
			const base64Image = Buffer.from(encryptedResponse.data).toString("base64");

			return `data:image/png;base64,${base64Image}`;
		}
	} catch (exception) {
		console.error({ VWEx: exception });

		return exception?.message;
	}
};

module.exports = {
	zelfNameRegistration,
	search,
	arweaveIDToBase64,
};
