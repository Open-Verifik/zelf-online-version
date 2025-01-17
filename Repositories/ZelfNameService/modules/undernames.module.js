const { ARIO, ArweaveSigner, ANT } = require("@ar.io/sdk");
const config = require("../../../Core/config");

const ario = ARIO.init();

// create under name logic here
const createUnderName = async (payload) => {
	const { parentName, underName } = payload;
	const processId = "Z9a5VqgeVkkJRWPT8UNl9ub_NPjzxPxLSXPQMCXB9po";

	const record = await ario.getArNSRecord({ name: parentName });

	console.log({ record });

	const walletKey = {
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

	if (!parentName || !underName) {
		return null;
	}

	// in a node environment
	const ant = ANT.init({
		signer: new ArweaveSigner(walletKey),
		processId,
	});

	console.log({ ant });

	const owner = await ant.getOwner();

	console.log({ owner });

	const records = await ant.getRecords();

	console.log({ records });

	try {
		// Create the under name
		const newUnderName = await ant.setRecord(
			{
				undername: "random",
				transactionId: processId,
				ttlSeconds: 3600,
			},
			// optional additional tags
			{ tags: [{ name: "App-Name", value: "My-Awesome-App" }] }
		);

		console.log({ newUnderName });
	} catch (error) {
		console.error({ error });
	}
};

module.exports = {
	createUnderName,
};
