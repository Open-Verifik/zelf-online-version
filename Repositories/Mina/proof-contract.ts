import { Field, SmartContract, state, State, method, PublicKey, Signature, Mina, PrivateKey, AccountUpdate, Poseidon } from "o1js";

class ProofContract extends SmartContract {
	@state(Field) proofs = State<Field>();

	// Initialize the contract
	init() {
		super.init();
		this.proofs.set(Field.zero);
	}

	// Method to add a proof
	@method addProof(proof: Field) {
		const currentProofs = this.proofs.get();
		this.proofs.assertEquals(currentProofs);

		// Store the new proof
		this.proofs.set(Poseidon.hash([currentProofs, proof]));
	}

	// Method to verify a proof
	@method verifyProof(proof: Field) {
		const currentProofs = this.proofs.get();
		this.proofs.assertEquals(currentProofs);

		const proofHash = Poseidon.hash([proof]);
		const isValid = currentProofs.equals(proofHash);

		isValid.assertTrue();
	}
}

export { ProofContract };
