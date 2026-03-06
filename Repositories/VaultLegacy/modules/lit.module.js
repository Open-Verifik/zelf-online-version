/**
 * Lit Protocol Manager for ZelfLegacy Inheritance
 * SDK v8 (Naga network) - Handles encryption/decryption of password shares
 *
 * Ported from ZelfLegacyAvax/backend/lit-manager.js
 */

const { createLitClient } = require("@lit-protocol/lit-client");
const { nagaDev } = require("@lit-protocol/networks");
const { LIT_ABILITY } = require("@lit-protocol/constants");
const { LitAccessControlConditionResource, RecapSessionCapabilityObject } = require("@lit-protocol/auth-helpers");
const { SiweMessage } = require("siwe");
const { ethers } = require("ethers");

class LitManager {
	constructor(privateKey) {
		this.litClient = null;
		this.chain = "fuji"; // Avalanche Fuji testnet
		this.privateKey = privateKey;
		this.relayerAddress = new ethers.Wallet(privateKey).address.toLowerCase();
	}

	/**
	 * Initialize Lit Protocol v8 client
	 */
	async connect() {
		if (this.litClient) {
			return;
		}

		console.log("🔗 Connecting to Lit Protocol (nagaDev)...");
		this.litClient = await createLitClient({ network: nagaDev });
		console.log("✅ Connected to Lit Protocol (v8 / Naga)");
	}

	/**
	 * Build EVM contract conditions for VaultRegistry.isClaimable
	 */
	_buildConditions(contractAddress, vaultId) {
		return [
			{
				contractAddress,
				functionName: "isClaimable",
				functionParams: [vaultId],
				functionAbi: {
					name: "isClaimable",
					inputs: [{ name: "vaultId", type: "bytes32" }],
					outputs: [{ name: "", type: "bool" }],
					stateMutability: "view",
					type: "function",
				},
				chain: this.chain,
				returnValueTest: {
					key: "",
					comparator: "=",
					value: "true",
				},
			},
		];
	}

	/**
	 * Encrypt a password share with Lit Protocol access control.
	 * @param {string} passwordShare
	 * @param {string} vaultId
	 * @param {string} contractAddress
	 * @returns {Promise<{ciphertext: string, dataToEncryptHash: string}>}
	 */
	async encryptPasswordShare(passwordShare, vaultId, contractAddress) {
		await this.connect();

		const evmContractConditions = this._buildConditions(contractAddress, vaultId);

		const encrypted = await this.litClient.encrypt({
			dataToEncrypt: passwordShare,
			evmContractConditions,
			chain: this.chain,
		});

		return {
			ciphertext: encrypted.ciphertext,
			dataToEncryptHash: encrypted.dataToEncryptHash,
		};
	}

	/**
	 * Decrypt a password share (only works if isClaimable == true).
	 * @param {string} ciphertext
	 * @param {string} dataToEncryptHash
	 * @param {string} vaultId
	 * @param {string} contractAddress
	 * @returns {Promise<string>}
	 */
	async decryptPasswordShare(ciphertext, dataToEncryptHash, vaultId, contractAddress) {
		await this.connect();

		const evmContractConditions = this._buildConditions(contractAddress, vaultId);

		const { ed25519 } = require("@noble/curves/ed25519");
		const secretKeyBytes = ed25519.utils.randomPrivateKey();
		const publicKeyBytes = ed25519.getPublicKey(secretKeyBytes);
		const secretKey = Buffer.from(secretKeyBytes).toString("hex");
		const publicKey = Buffer.from(publicKeyBytes).toString("hex");

		const expiration = new Date(Date.now() + 1000 * 60 * 60).toISOString(); // 1 hour
		const relayerWallet = new ethers.Wallet(this.privateKey);

		const authContext = {
			sessionKeyPair: { publicKey, secretKey },
			authNeededCallback: async () => {
				const accResource = new LitAccessControlConditionResource("*");
				const recapObject = new RecapSessionCapabilityObject();
				recapObject.addCapabilityForResource(accResource, LIT_ABILITY.AccessControlConditionDecryption);

				let siweMessage = new SiweMessage({
					domain: "localhost",
					address: relayerWallet.address,
					statement: `Lit Protocol Decryption for vault ${vaultId}`,
					uri: `lit:session:${publicKey}`,
					version: "1",
					chainId: 1,
					nonce: publicKey.slice(0, 8),
					expirationTime: expiration,
					issuedAt: new Date().toISOString(),
				});

				siweMessage = recapObject.addToSiweMessage(siweMessage);
				const messageToSign = siweMessage.prepareMessage();
				const signature = await relayerWallet.signMessage(messageToSign);

				return {
					sig: signature,
					derivedVia: "web3.eth.personal.sign",
					signedMessage: messageToSign,
					address: relayerWallet.address,
				};
			},
			authConfig: {
				expiration,
				resources: [
					{
						resource: new LitAccessControlConditionResource("*"),
						ability: LIT_ABILITY.AccessControlConditionDecryption,
					},
				],
			},
		};

		const decrypted = await this.litClient.decrypt({
			data: { ciphertext, dataToEncryptHash },
			evmContractConditions,
			authContext,
			chain: this.chain,
		});

		return Buffer.from(decrypted.decryptedData).toString("utf-8");
	}

	/**
	 * Disconnect from Lit Protocol
	 */
	async disconnect() {
		if (this.litClient) {
			await this.litClient.disconnect();
			this.litClient = null;
		}
	}
}

module.exports = LitManager;
