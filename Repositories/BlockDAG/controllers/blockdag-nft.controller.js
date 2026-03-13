const BlockDagNftModule = require("../modules/blockdag-nft.module");
const httpHandler = require("../../../Core/http-handler");

/**
 * Upload a file to IPFS
 */
const upload = async (ctx) => {
    try {
        const file = ctx.request.files ? ctx.request.files.file : null;
        if (!file) {
            console.error("Upload failed: No file found in ctx.request.files", ctx.request.files);
            const err = new Error("400:no_file_uploaded");
            err.status = 400;
            throw err;
        }

        console.log("File received for upload:", file.originalFilename || file.name, "Mime:", file.mimetype);

        const result = await BlockDagNftModule.upload(file);

        ctx.body = {
            success: true,
            ...result,
        };
    } catch (error) {
        ctx.status = error.status || 500;
        ctx.body = {
            success: false,
            error: error.message,
        };
    }
};

/**
 * Create a new NFT Collection
 */
const createCollection = async (ctx) => {
    try {
        const result = await BlockDagNftModule.storeCollection(ctx.request.body, ctx.state.user);
        ctx.body = {
            success: true,
            data: result,
        };
    } catch (error) {
        ctx.status = error.status || 500;
        ctx.body = {
            success: false,
            error: error.message,
        };
    }
};

/**
 * Create a new NFT Item
 */
const createNFT = async (ctx) => {
    try {
        const result = await BlockDagNftModule.storeNFT(ctx.request.body, ctx.state.user);
        ctx.body = {
            success: true,
            data: result,
        };
    } catch (error) {
        ctx.status = error.status || 500;
        ctx.body = {
            success: false,
            error: error.message,
        };
    }
};

/**
 * Update a Collection (coverImage, avatarImage, and/or name). Owner-only.
 */
const updateCollection = async (ctx) => {
    try {
        const { id } = ctx.request.params;
        const { coverImage, avatarImage, name, ...auth } = ctx.request.body;

        const result = await BlockDagNftModule.updateCollection(id, { coverImage, avatarImage, name }, auth);

        ctx.body = {
            success: true,
            data: result,
        };
    } catch (error) {
        const _exception = httpHandler.errorHandler(error, ctx);
        ctx.status = _exception.status || 500;
        ctx.body = {
            code: _exception.code,
            message: _exception.message,
        };
    }
};

/**
 * Delete a Collection
 */
const deleteCollection = async (ctx) => {
    try {
        const { id } = ctx.request.params;

        const result = await BlockDagNftModule.deleteCollection(id, ctx.request.body);

        ctx.body = {
            success: true,
            data: result,
        };
    } catch (error) {
        const _exception = httpHandler.errorHandler(error, ctx);

        ctx.status = _exception.status || 500;

        ctx.body = {
            code: _exception.code,
            message: _exception.message,
        };
    }
};

/**
 * Delete an NFT item from IPFS (owner-only, for orphaned drafts)
 */
const deleteItem = async (ctx) => {
    try {
        const { id } = ctx.request.params;

        const result = await BlockDagNftModule.deleteItem(id, ctx.request.body);

        ctx.body = {
            success: true,
            data: result,
        };
    } catch (error) {
        const _exception = httpHandler.errorHandler(error, ctx);

        ctx.status = _exception.status || 500;

        ctx.body = {
            code: _exception.code,
            message: _exception.message,
        };
    }
};

/**
 * List Collections
 */
const getCollections = async (ctx) => {
    try {
        const { owner, limit } = ctx.request.query;
        const result = await BlockDagNftModule.listCollections({ owner, limit });
        ctx.body = {
            success: true,
            data: result,
        };
    } catch (error) {
        ctx.status = error.status || 500;
        ctx.body = {
            success: false,
            error: error.message,
        };
    }
};

/**
 * List Items
 */
const getItems = async (ctx) => {
    try {
        const result = await BlockDagNftModule.listItems(ctx.request.query);
        ctx.body = {
            success: true,
            data: result,
        };
    } catch (error) {
        ctx.status = error.status || 500;
        ctx.body = {
            success: false,
            error: error.message,
        };
    }
};

/**
 * Get items for a collection by collection address (contract address).
 * Dedicated endpoint — uses single-key filter by "collection" (Pinata limitation).
 */
const getCollectionItems = async (ctx) => {
    try {
        const { id } = ctx.request.params;
        const { owner, limit } = ctx.request.query;
        const result = await BlockDagNftModule.getItemsByCollection(id, { owner, limit });
        ctx.body = {
            success: true,
            data: result,
        };
    } catch (error) {
        ctx.status = error.status || 500;
        ctx.body = {
            success: false,
            error: error.message,
        };
    }
};

/**
 * Get a single NFT item by query param ?cid= (IPFS CID).
 */
const getItemByQuery = async (ctx) => {
    try {
        const { cid } = ctx.request.query;
        if (!cid) {
            ctx.status = 400;
            ctx.body = { success: false, error: "cid query parameter is required" };
            return;
        }
        const result = await BlockDagNftModule.getItem(cid);
        _surfaceTokenId(result);
        ctx.body = { success: true, data: result };
    } catch (error) {
        const status = parseInt(error.message?.split(":")[0]) || 500;
        ctx.status = status;
        ctx.body = { success: false, error: error.message };
    }
};

const _surfaceTokenId = (result) => {
    const kv = result?.publicData || result?.metadata?.keyvalues || {};
    if (kv.tokenId != null && result) {
        result.tokenId = kv.tokenId;
        result.mintTxHash = kv.mintTxHash || null;
    }
};

/**
 * Get a single NFT item by path param (CID or Pinata file ID)
 */
const getItem = async (ctx) => {
    try {
        const { id } = ctx.request.params;
        const result = await BlockDagNftModule.getItem(id);
        _surfaceTokenId(result);
        ctx.body = { success: true, data: result };
    } catch (error) {
        const status = parseInt(error.message?.split(":")[0]) || 500;
        ctx.status = status;
        ctx.body = { success: false, error: error.message };
    }
};

/**
 * Persist on-chain tokenId after frontend mint.
 * Body: { tokenId: string|number, txHash: string, owner?: string }
 * When owner is provided (e.g. after buy/acceptOffer), uses delete+re-pin and returns newIpfsId.
 */
const updateTokenId = async (ctx) => {
    try {
        const { id } = ctx.request.params;

        const { tokenId, txHash, owner } = ctx.request.body;

        if (tokenId == null) {
            ctx.status = 400;

            ctx.body = { success: false, error: "tokenId is required" };

            return;
        }

        const result = await BlockDagNftModule.replaceNftItemWithNewOwner(id, tokenId, txHash, owner);

        ctx.body = { success: true, data: result };
    } catch (error) {
        console.error("[updateTokenId] error:", error?.message, "status:", error?.status);
        // Clamp status to a valid HTTP range — Pinata SDK can return non-standard codes
        const raw = error?.status || error?.statusCode || 500;
        ctx.status = typeof raw === "number" && raw >= 400 && raw <= 599 ? raw : 500;
        ctx.body = { success: false, error: error.message };
    }
};

/**
 * Mint an NFT on-chain via the server deployer wallet.
 * Used when minting to the shared ZNS collection (owner-only mint).
 * Body: { collectionAddress, recipientAddress, tokenURI, walletType, owner, signature, message }
 */
const mintNFT = async (ctx) => {
    try {
        const { collectionAddress, recipientAddress, tokenURI } = ctx.request.body;
        const result = await BlockDagNftModule.mintOnChain(collectionAddress, recipientAddress, tokenURI);
        ctx.body = { success: true, data: result };
    } catch (error) {
        ctx.status = error.status || 500;
        ctx.body = { success: false, error: error.message };
    }
};

/**
 * Get or deploy the default Zelf Name Service collection
 */
const getDefaultCollection = async (ctx) => {
    try {
        const result = await BlockDagNftModule.getDefaultCollection();
        ctx.body = { success: true, data: result };
    } catch (error) {
        ctx.status = error.status || 500;
        ctx.body = { success: false, error: error.message };
    }
};

/**
 * Deploy the default Zelf Name Service collection (admin only)
 */
const deployDefaultCollection = async (ctx) => {
    try {
        const result = await BlockDagNftModule.deployDefaultCollection();
        ctx.body = { success: true, data: result };
    } catch (error) {
        ctx.status = error.status || 500;
        ctx.body = { success: false, error: error.message };
    }
};

module.exports = {
    upload,
    createCollection,
    updateCollection,
    deleteCollection,
    deleteItem,
    createNFT,
    mintNFT,
    getCollections,
    getItems,
    getCollectionItems,
    getItem,
    getItemByQuery,
    getDefaultCollection,
    deployDefaultCollection,
    updateTokenId,
};
