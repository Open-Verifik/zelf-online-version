const { ARIO, ArweaveSigner, ANT } = require("@ar.io/sdk");
const config = require("../../../Core/config");

//qNvAoz0TgcH7DMg8BCVn8jF32QH5L6T29VjHxhHqqGE
ARIO.init({ processId: config.arns.processId });

// create under name logic here
const createUnderName = async (payload) => {
	const { parentName, undername } = payload;

	const processId = config.arns.processId;

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

	const owner = await ant.getOwner();

	console.log({ owner });

	const records = await ant.getRecords();

	console.log({ records });

	return {
		records,
		owner,
	};

	try {
		// Create the under name
		const newUnderName = await ant.setRecord(
			{
				undername,
				transactionId: config.arwave.transactionId,
				ttlSeconds: 3600,
			},
			// optional additional tags
			{
				tags: [],
			}
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
