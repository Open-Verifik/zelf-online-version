/**
 * Avalanche Manager for ZelfLegacy
 * Interacts with VaultRegistry smart contract on Avalanche C-Chain.
 *
 * Ported from ZelfLegacyAvax/backend/avalanche-manager.js
 */

const { ethers } = require("ethers");
const path = require("path");

const { txWaitTimeoutMs, isTransactionWaitTimeout } = require("../legacy-timeouts");

class AvalancheManager {
    constructor(rpcUrl, contractAddress, privateKey) {
        this.provider = new ethers.JsonRpcProvider(rpcUrl);
        this.contractAddress = contractAddress;

        // Load ABI from the compiled Hardhat artifacts bundled with this repository
        const artifactPath = path.join(__dirname, "../contracts/VaultRegistry.json");
        const VaultRegistryArtifact = require(artifactPath);
        this.contractABI = VaultRegistryArtifact.abi;

        if (privateKey) {
            this.relayerWallet = new ethers.Wallet(privateKey, this.provider);
            console.log(`🔑 Relayer wallet: ${this.relayerWallet.address}`);
        }

        this.contract = new ethers.Contract(this.contractAddress, this.contractABI, this.provider);

        if (this.relayerWallet) {
            this.contract = this.contract.connect(this.relayerWallet);
        }
    }

    async _waitReceipt(tx) {
        try {
            return await tx.wait(1, txWaitTimeoutMs);
        } catch (e) {
            if (isTransactionWaitTimeout(e)) {
                const err = new Error("Transaction confirmation timed out");
                err.status = 504;
                err.txHash = tx.hash;
                err.code = "TX_WAIT_TIMEOUT";
                throw err;
            }
            throw e;
        }
    }

    /** Create a new vault (Relayed) */
    async createVault(testatorAddress, vaultId, beneficiaries, lawyer, heartbeatInterval, ipfsCid, ipfsCidValidator, threshold) {
        const tx = await this.contract.createVault(testatorAddress, vaultId, beneficiaries, lawyer, threshold, heartbeatInterval, ipfsCid, ipfsCidValidator);
        const receipt = await this._waitReceipt(tx);
        return { transactionHash: tx.hash, blockNumber: receipt.blockNumber, vaultId, owner: testatorAddress, relayer: this.relayerWallet.address };
    }

    /** Update heartbeat (Relayed) */
    async updateHeartbeat(testatorAddress, vaultId) {
        const tx = await this.contract.updateHeartbeat(vaultId);
        const receipt = await this._waitReceipt(tx);
        return { transactionHash: tx.hash, blockNumber: receipt.blockNumber, vaultId };
    }

    /** Cancel vault (Relayed) */
    async cancelVault(testatorAddress, vaultId) {
        const tx = await this.contract.cancelVault(vaultId);
        const receipt = await this._waitReceipt(tx);
        return { transactionHash: tx.hash, blockNumber: receipt.blockNumber, vaultId };
    }

    /** Change lawyer (Relayed) */
    async changeLawyer(testatorAddress, vaultId, newLawyer) {
        const tx = await this.contract.changeLawyer(vaultId, newLawyer);
        const receipt = await this._waitReceipt(tx);
        return { transactionHash: tx.hash, blockNumber: receipt.blockNumber, vaultId, newLawyer };
    }

    /** Check if a vault is claimable */
    async isClaimable(vaultId) {
        return await this.contract.isClaimable(vaultId);
    }

    /** Get vault details */
    async getVault(vaultId) {
        const vault = await this.contract.getVault(vaultId);
        return {
            owner: vault.owner,
            beneficiaries: [...vault.beneficiaries],
            lawyer: vault.lawyer,
            heartbeatInterval: Number(vault.heartbeatInterval),
            lastPing: Number(vault.lastPing),
            createdAt: Number(vault.createdAt),
            activationDate: Number(vault.activationDate),
            ipfsCid: vault.ipfsCid,
            ipfsCidValidator: vault.ipfsCidValidator,
            state: Number(vault.state),
            threshold: Number(vault.threshold),
            exists: vault.exists,
        };
    }

    /** Get all vault IDs for a beneficiary */
    async getBeneficiaryVaults(beneficiaryAddress) {
        try {
            const vaultIds = await this.contract.getBeneficiaryVaults(beneficiaryAddress);
            return [...new Set(vaultIds)];
        } catch {
            return [];
        }
    }

    /** Get full vault data for all vaults where address is a beneficiary */
    async getBeneficiaryVaultsData(beneficiaryAddress) {
        try {
            const vaultIds = await this.getBeneficiaryVaults(beneficiaryAddress);
            const vaults = [];
            for (const vaultId of vaultIds) {
                try {
                    const vaultData = await this.getVault(vaultId);
                    vaults.push({ vaultId: vaultId.toString(), ...vaultData });
                } catch (e) {
                    console.warn(`⚠️ Could not fetch vault ${vaultId}:`, e.message);
                }
            }
            return vaults;
        } catch {
            return [];
        }
    }

    /** Get all vault IDs for an owner (testator) */
    async getUserVaults(ownerAddress) {
        try {
            const vaultIds = await this.contract.getUserVaults(ownerAddress);
            return [...new Set(vaultIds)];
        } catch {
            return [];
        }
    }

    /** Get all vault IDs for a lawyer */
    async getLawyerVaults(lawyerAddress) {
        try {
            const vaultIds = await this.contract.getLawyerVaults(lawyerAddress);
            return [...new Set(vaultIds)];
        } catch {
            return [];
        }
    }

    /** Accept a vault (Lawyer only) */
    async acceptVault(lawyerAddress, vaultId) {
        const vault = await this.contract.getVault(vaultId);
        if (vault.lawyer.toLowerCase() !== lawyerAddress.toLowerCase()) throw new Error("Unauthorized: not vault lawyer");
        const tx = await this.contract.acceptVault(vaultId);
        const receipt = await this._waitReceipt(tx);
        return { transactionHash: tx.hash, blockNumber: receipt.blockNumber, vaultId };
    }

    /** Reject a vault (Lawyer only) */
    async rejectVault(lawyerAddress, vaultId) {
        const vault = await this.contract.getVault(vaultId);
        if (vault.lawyer.toLowerCase() !== lawyerAddress.toLowerCase()) throw new Error("Unauthorized: not vault lawyer");
        const tx = await this.contract.rejectVault(vaultId);
        const receipt = await this._waitReceipt(tx);
        return { transactionHash: tx.hash, blockNumber: receipt.blockNumber, vaultId };
    }

    /** Confirm death (Lawyer only) */
    async confirmDeath(lawyerAddress, vaultId) {
        const vault = await this.contract.getVault(vaultId);
        if (vault.lawyer.toLowerCase() !== lawyerAddress.toLowerCase()) throw new Error("Unauthorized: not vault lawyer");
        const tx = await this.contract.confirmDeath(vaultId);
        const receipt = await this._waitReceipt(tx);
        return { transactionHash: tx.hash, blockNumber: receipt.blockNumber, vaultId };
    }

    /** Execute vault (record beneficiary acceptance) */
    async executeVault(beneficiaryAddress, vaultId) {
        const isBen = await this.contract.isBeneficiary(vaultId, beneficiaryAddress);
        if (!isBen) throw new Error("Unauthorized: not a beneficiary");

        const alreadyExecuted = await this.contract.executedBeneficiaries(vaultId, beneficiaryAddress);
        if (alreadyExecuted) throw new Error("Beneficiary already accepted this vault");

        const tx = await this.contract.executeVault(vaultId, beneficiaryAddress);
        const receipt = await this._waitReceipt(tx);

        const event = receipt.logs
            .map((log) => {
                try {
                    return this.contract.interface.parseLog(log);
                } catch {
                    return null;
                }
            })
            .find((e) => e && e.name === "VaultExecuted");

        const executedCount = event ? Number(event.args.executedCount) : null;
        const threshold = event ? Number(event.args.threshold) : null;

        return {
            transactionHash: tx.hash,
            blockNumber: receipt.blockNumber,
            vaultId,
            executedCount,
            threshold,
            fullyExecuted: executedCount !== null && executedCount >= threshold,
        };
    }

    /** Get execution status for a vault */
    async getExecutionStatus(vaultId) {
        const [executedCount, threshold] = await this.contract.getExecutionStatus(vaultId);
        return { executedCount: Number(executedCount), threshold: Number(threshold) };
    }
}

module.exports = AvalancheManager;
