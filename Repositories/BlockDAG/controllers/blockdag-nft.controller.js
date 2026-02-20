const BlockDagNftModule = require("../modules/blockdag-nft.module");

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
 * List Collections
 */
const getCollections = async (ctx) => {
    try {
        const result = await BlockDagNftModule.listCollections();
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
        const result = await BlockDagNftModule.listItems(ctx.query);
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
 * Get a single NFT item by Pinata file ID
 */
const getItem = async (ctx) => {
    try {
        const { id } = ctx.params;
        const result = await BlockDagNftModule.getItem(id);
        ctx.body = { success: true, data: result };
    } catch (error) {
        const status = parseInt(error.message?.split(":")[0]) || 500;
        ctx.status = status;
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
    createNFT,
    getCollections,
    getItems,
    getItem,
    getDefaultCollection,
    deployDefaultCollection,
};
