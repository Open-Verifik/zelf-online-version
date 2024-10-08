const { Field, Poseidon, isReady, shutdown } = require("o1js");

async function createProof(qrHash) {
	// Convert the hash to a BigInt
	const hashBigInt = BigInt(`0x${Buffer.from(qrHash, "base64").toString("hex")}`);

	// Generate the proof using Poseidon hash
	const hashField = Poseidon.hash([Field(hashBigInt)]);

	const proof = hashField.toString();

	return proof;
}

async function verifyProof(proof, qrHash) {
	const hashBigInt = BigInt(`0x${Buffer.from(qrHash, "base64").toString("hex")}`);

	const hashField = Poseidon.hash([Field(hashBigInt)]);

	const isValid = hashField.toString() === proof;

	return isValid;
}

module.exports = { createProof, verifyProof };
