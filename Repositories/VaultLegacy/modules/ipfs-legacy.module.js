/**
 * IPFS Manager for ZelfLegacy Inheritance
 * Handles uploading/retrieving files to/from IPFS via Pinata.
 *
 * Ported from ZelfLegacyAvax/backend/ipfs-manager.js
 */

const axios = require("axios");

class IPFSManager {
    constructor(pinataApiKey, pinataSecretKey) {
        this.pinataApiKey = pinataApiKey;
        this.pinataSecretKey = pinataSecretKey;
        this.pinataEndpoint = "https://api.pinata.cloud/pinning/pinJSONToIPFS";
    }

    /**
     * Upload JSON data to IPFS via Pinata
     * @param {object} jsonData
     * @param {string} name
     * @returns {Promise<string>} IPFS CID
     */
    async uploadJSON(jsonData, name) {
        const response = await axios.post(
            this.pinataEndpoint,
            { pinataContent: jsonData, pinataMetadata: { name } },
            {
                headers: {
                    "Content-Type": "application/json",
                    pinata_api_key: this.pinataApiKey,
                    pinata_secret_api_key: this.pinataSecretKey,
                },
            }
        );

        console.log(`✅ Uploaded to IPFS: ${name} -> ${response.data.IpfsHash}`);
        return response.data.IpfsHash;
    }

    /**
     * Upload encrypted password share to IPFS
     * @param {object} encryptedShare - { ciphertext, dataToEncryptHash }
     * @param {string} shareName
     * @param {string} vaultId
     * @returns {Promise<string>} IPFS CID
     */
    async uploadEncryptedShare(encryptedShare, shareName, vaultId) {
        const shareData = {
            ciphertext: encryptedShare.ciphertext,
            dataToEncryptHash: encryptedShare.dataToEncryptHash,
            shareName,
            vaultId,
            timestamp: new Date().toISOString(),
        };

        return await this.uploadJSON(shareData, `vault-${vaultId}-${shareName}`);
    }

    /**
     * Upload password shares manifest to IPFS
     * @param {string} passwordpartyCID
     * @param {string} passwordlawyerCID
     * @param {string} vaultId
     * @returns {Promise<string>} Manifest CID
     */
    async uploadPasswordSharesManifest(passwordpartyCID, passwordlawyerCID, vaultId) {
        const manifest = {
            passwordparty: `ipfs://${passwordpartyCID}`,
            passwordlawyer: `ipfs://${passwordlawyerCID}`,
            version: "1.0",
            type: "single-ben",
            vaultId,
        };

        return await this.uploadJSON(manifest, `vault-${vaultId}-manifest`);
    }

    /**
     * Retrieve data from IPFS
     * @param {string} cid
     * @returns {Promise<object>}
     */
    async retrieve(cid) {
        const response = await axios.get(`https://gateway.pinata.cloud/ipfs/${cid}`);
        return response.data;
    }
}

module.exports = IPFSManager;
