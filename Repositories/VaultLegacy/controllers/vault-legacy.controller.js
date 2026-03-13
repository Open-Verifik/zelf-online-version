/**
 * VaultLegacy Controller (Koa)
 * Routes handler layer adapted from ZelfLegacyAvax Express endpoints.
 */

const Module = require("../modules/vault-legacy.module");

// ---- Vault share endpoints ----

const collectShares = async (ctx) => {
    try {
        const result = await Module.collectShares(ctx.request.body);
        ctx.body = { success: true, ...result };
    } catch (error) {
        ctx.status = error.status || 500;
        ctx.body = { error: error.message };
    }
};

const getShares = async (ctx) => {
    try {
        const result = await Module.getShares(ctx.params.vaultId);
        ctx.body = { success: true, ...result };
    } catch (error) {
        ctx.status = error.status || 500;
        ctx.body = { error: error.message };
    }
};

const getManifest = async (ctx) => {
    try {
        const result = await Module.getManifest(ctx.params.cid);
        ctx.body = { success: true, ...result };
    } catch (error) {
        ctx.status = error.status || 500;
        ctx.body = { error: error.message };
    }
};

const getManifestByVault = async (ctx) => {
    try {
        const result = await Module.getManifestByVault(ctx.params.vaultId);
        ctx.body = { success: true, ...result };
    } catch (error) {
        ctx.status = error.status || 500;
        ctx.body = { error: error.message };
    }
};

// ---- Avalanche vault endpoints ----

const createVault = async (ctx) => {
    try {
        const result = await Module.createVault(ctx.request.body);
        ctx.body = { success: true, ...result };
    } catch (error) {
        ctx.status = error.status || 500;
        ctx.body = { error: error.message };
    }
};

const updateHeartbeat = async (ctx) => {
    try {
        const result = await Module.updateHeartbeat(ctx.request.body);
        ctx.body = { success: true, ...result };
    } catch (error) {
        ctx.status = error.status || 500;
        ctx.body = { error: error.message };
    }
};

const cancelVault = async (ctx) => {
    try {
        const result = await Module.cancelVault(ctx.request.body);
        ctx.body = { success: true, ...result };
    } catch (error) {
        ctx.status = error.status || 500;
        ctx.body = { error: error.message };
    }
};

const changeLawyer = async (ctx) => {
    try {
        const result = await Module.changeLawyer(ctx.request.body);
        ctx.body = { success: true, ...result };
    } catch (error) {
        ctx.status = error.status || 500;
        ctx.body = { error: error.message };
    }
};

const confirmDeath = async (ctx) => {
    try {
        const result = await Module.confirmDeath(ctx.request.body);
        ctx.body = { success: true, result };
    } catch (error) {
        ctx.status = error.status || 500;
        ctx.body = { error: error.message };
    }
};

const getVault = async (ctx) => {
    try {
        const result = await Module.getVault(ctx.params.vaultId);
        ctx.body = { success: true, ...result };
    } catch (error) {
        ctx.status = error.status || 500;
        ctx.body = { error: error.message };
    }
};

const getBeneficiaryVaults = async (ctx) => {
    try {
        const result = await Module.getBeneficiaryVaults(ctx.params.address);
        ctx.body = { success: true, ...result };
    } catch (error) {
        ctx.status = error.status || 500;
        ctx.body = { error: error.message };
    }
};

const getBeneficiaryVaultsData = async (ctx) => {
    try {
        const result = await Module.getBeneficiaryVaultsData(ctx.params.address);
        ctx.body = { success: true, ...result };
    } catch (error) {
        ctx.status = error.status || 500;
        ctx.body = { error: error.message };
    }
};

const getOwnerVaults = async (ctx) => {
    try {
        const result = await Module.getOwnerVaults(ctx.params.address);
        ctx.body = { success: true, ...result };
    } catch (error) {
        ctx.status = error.status || 500;
        ctx.body = { error: error.message };
    }
};

const getLawyerVaults = async (ctx) => {
    try {
        const result = await Module.getLawyerVaults(ctx.params.address);
        ctx.body = { success: true, ...result };
    } catch (error) {
        ctx.status = error.status || 500;
        ctx.body = { error: error.message };
    }
};

const executeVault = async (ctx) => {
    try {
        const result = await Module.executeVault(ctx.request.body);
        ctx.body = { success: true, ...result };
    } catch (error) {
        ctx.status = error.status || 500;
        ctx.body = { error: error.message };
    }
};

const getExecutionStatus = async (ctx) => {
    try {
        const result = await Module.getExecutionStatus(ctx.params.vaultId);
        ctx.body = { success: true, ...result };
    } catch (error) {
        ctx.status = error.status || 500;
        ctx.body = { error: error.message };
    }
};

const acceptVault = async (ctx) => {
    try {
        const result = await Module.acceptVault(ctx.request.body);
        ctx.body = { success: true, result };
    } catch (error) {
        ctx.status = error.status || 500;
        ctx.body = { error: error.message };
    }
};

const rejectVault = async (ctx) => {
    try {
        const result = await Module.rejectVault(ctx.request.body);
        ctx.body = { success: true, result };
    } catch (error) {
        ctx.status = error.status || 500;
        ctx.body = { error: error.message };
    }
};

module.exports = {
    collectShares,
    getShares,
    getManifest,
    getManifestByVault,
    createVault,
    updateHeartbeat,
    cancelVault,
    changeLawyer,
    confirmDeath,
    getVault,
    getBeneficiaryVaults,
    getBeneficiaryVaultsData,
    getOwnerVaults,
    getLawyerVaults,
    executeVault,
    getExecutionStatus,
    acceptVault,
    rejectVault,
};
