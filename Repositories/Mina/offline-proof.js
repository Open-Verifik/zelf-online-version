const { Field, Poseidon, isReady, shutdown } = require("o1js");

const createProof = async (content) => {
	// Convert the hash to a BigInt
	const hashBigInt = BigInt(`0x${Buffer.from(content, "base64").toString("hex")}`);

	// Generate the proof using Poseidon hash
	const hashField = Poseidon.hash([Field(hashBigInt)]);

	const proof = hashField.toString();

	return proof;
};

const validateProof = async (proof, content) => {
	const hashBigInt = BigInt(`0x${Buffer.from(content, "base64").toString("hex")}`);

	const hashField = Poseidon.hash([Field(hashBigInt)]);

	const isValid = hashField.toString() === proof;

	return isValid;
};

module.exports = {
	createProof,
	validateProof,
};
