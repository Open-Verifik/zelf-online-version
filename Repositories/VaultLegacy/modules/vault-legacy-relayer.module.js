/**
 * VaultLegacy relayer health — compare server wallet vs on-chain VaultRegistry.relayer().
 */

const path = require("path");
const fs = require("fs");
const { ethers } = require("ethers");

let _contract = null;

const getReadOnlyContract = () => {
    if (_contract) return _contract;

    const rpcUrl = process.env.LEGACY_AVALANCHE_RPC_URL || "https://api.avax-test.network/ext/bc/C/rpc";
    const contractAddress = process.env.LEGACY_VAULT_REGISTRY_ADDRESS;
    if (!contractAddress) return null;

    const abiPath = path.resolve(__dirname, "../contracts/VaultRegistry.json");
    const artifact = JSON.parse(fs.readFileSync(abiPath, "utf8"));
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    _contract = new ethers.Contract(contractAddress, artifact.abi, provider);
    return _contract;
};

const getServerRelayerAddress = () => {
    const pk = process.env.LEGACY_RELAYER_PRIVATE_KEY;
    if (!pk) return null;
    try {
        return new ethers.Wallet(pk).address;
    } catch {
        return null;
    }
};

/**
 * @returns {Promise<{
 *   contractAddress: string|null,
 *   onChainRelayer: string|null,
 *   serverRelayer: string|null,
 *   relayerMatches: boolean,
 *   relayerPrivateKeyConfigured: boolean,
 * }>}
 */
const getRelayerHealth = async () => {
    const contractAddress = process.env.LEGACY_VAULT_REGISTRY_ADDRESS || null;
    const serverRelayer = getServerRelayerAddress();
    let onChainRelayer = null;

    try {
        const contract = getReadOnlyContract();
        if (contract) {
            onChainRelayer = await contract.relayer();
        }
    } catch (e) {
        console.warn("[VaultLegacy] Could not read relayer() from contract:", e.message);
    }

    const relayerMatches =
        Boolean(serverRelayer && onChainRelayer) &&
        serverRelayer.toLowerCase() === String(onChainRelayer).toLowerCase();

    return {
        contractAddress,
        onChainRelayer,
        serverRelayer,
        relayerMatches,
        relayerPrivateKeyConfigured: Boolean(process.env.LEGACY_RELAYER_PRIVATE_KEY),
    };
};

const assertRelayerMatchesContract = async () => {
    const health = await getRelayerHealth();
    if (!health.relayerPrivateKeyConfigured) {
        const err = new Error("LEGACY_RELAYER_PRIVATE_KEY is not configured");
        err.status = 503;
        throw err;
    }
    if (!health.onChainRelayer) {
        const err = new Error("Could not read VaultRegistry relayer from chain");
        err.status = 503;
        throw err;
    }
    if (!health.relayerMatches) {
        const err = new Error(
            `Relayer mismatch: server wallet is ${health.serverRelayer} but contract relayer() is ${health.onChainRelayer}. ` +
                "Set LEGACY_RELAYER_PRIVATE_KEY to the relayer wallet for this LEGACY_VAULT_REGISTRY_ADDRESS, or call setRelayer on the contract."
        );
        err.status = 503;
        err.details = health;
        throw err;
    }
    return health;
};

module.exports = {
    getRelayerHealth,
    assertRelayerMatchesContract,
    getServerRelayerAddress,
};
