const { ARIO, ArweaveSigner, ANT } = require("@ar.io/sdk");
const config = require("../../../Core/config");

const ario = ARIO.init();

// create under name logic here
const createUnderName = async (payload) => {
	const { parentName, undername } = payload;
	const processId = config.arwave.processId;

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

	if (!parentName || !undername) {
		return null;
	}

	// in a node environment
	const ant = ANT.init({
		signer: new ArweaveSigner(walletKey),
		processId,
	});

	// const owner = await ant.getOwner();

	// const records = await ant.getRecords();

	try {
		// Create the under name
		const newUnderName = await ant.setRecord(
			{
				undername,
				transactionId: "SGsts42Qi3dNiSAl6pSOwcNInPsLqZ1yExAuSQyrjos",
				ttlSeconds: 3600,
			},
			// optional additional tags
			{ tags: [{ name: "App-Name", value: "My-Awesome-App" }] }
		);

		return newUnderName;
	} catch (error) {
		console.error({ newUnderNameError: error });
	}

	return null;
};

module.exports = {
	createUnderName,
};
