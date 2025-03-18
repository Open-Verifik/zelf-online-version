const config = require("../config");
const QuickNode = require("@quicknode/sdk");
const { JsonRpcProvider } = require("ethers");

const rpcUrl = `${config.ethereum.url}${config.ethereum.apiKey}`;

const sendTransaction = async (data) => {
	let provider;
	try {
		provider = new JsonRpcProvider(rpcUrl);
		console.log("Provider after init:", provider);
		console.log("sendTransaction exists:", typeof provider.sendTransaction === "function");
	} catch (error) {
		console.error("Provider init error:", error);
	}

	switch (data.network) {
		case "ethereum":
			provider.getNetwork().then((network) => console.log(network));
			return await sendEVMTransaction(data, provider);

		default:
			break;
	}

	return null;
};

const sendEVMTransaction = async (data, provider) => {
	try {
		const { signedTx } = data;

		const txResponse = await provider.send("eth_sendRawTransaction", [signedTx]);
		// await txResponse.wait();

		return txResponse;
	} catch (error) {
		console.error({ error });
		return error.message;
	}
};

module.exports = {
	sendTransaction,
};
