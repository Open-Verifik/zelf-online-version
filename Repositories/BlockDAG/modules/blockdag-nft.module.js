/**
 * BlockDAG NFT Module
 * Dual Wallet Support: Zelf (Biometric) & External (EVM/MetaMask)
 * Storage: IPFS (Decentralized)
 */
const IPFS = require("../../../Core/ipfs");
const ZelfProofModule = require("../../ZelfProof/modules/zelf-proof.module");
const { ethers } = require("ethers");
const config = require("../../../Core/config");
const fs = require("fs");

const FACTORY_ABI = [
    // V2: createCollection now takes royaltyBps
    "function createCollection(string name, string symbol, uint256 maxSupply, uint96 royaltyBps) public returns (address)",
    "event CollectionCreated(address indexed collectionAddress, string name, string symbol, address indexed owner, uint96 royaltyBps)",
];

const ERC721_ABI = [
    "function mint(address to, string uri) public returns (uint256)",
    "function ownerOf(uint256 tokenId) view returns (address)",
    "function totalSupply() view returns (uint256)",
    "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
];

/**
 * Get the default Zelf Name Service collection address.
 * If configured via env, return immediately.
 */
const getDefaultCollection = async () => {
    const configured = config.blockdag?.defaultCollectionAddress;

    if (configured && ethers.isAddress(configured)) {
        return { address: configured, deployed: false };
    }

    return { address: null, deployed: false };
};

/**
 * Deploy the official Zelf Name Service collection via factory
 * using a server-side wallet private key (BLOCKDAG_DEPLOYER_PRIVATE_KEY).
 * Only call once and store the resulting address in BLOCKDAG_DEFAULT_COLLECTION_ADDRESS.
 */
const deployDefaultCollection = async () => {
    const pk = process.env.BLOCKDAG_DEPLOYER_PRIVATE_KEY;
    if (!pk) throw new Error("400:BLOCKDAG_DEPLOYER_PRIVATE_KEY not set");

    const provider = new ethers.JsonRpcProvider(config.blockdag.rpcUrl);
    const wallet = new ethers.Wallet(pk, provider);
    const factory = new ethers.Contract(config.blockdag.factoryAddress, FACTORY_ABI, wallet);

    const tx = await factory.createCollection("Zelf Name Service", "ZNS", BigInt(0));
    const receipt = await tx.wait();

    let newAddress = null;
    for (const log of receipt.logs) {
        try {
            const parsed = factory.interface.parseLog(log);
            if (parsed && parsed.name === "CollectionCreated") {
                newAddress = parsed.args[0];
                break;
            }
        } catch (e) {
            // ignore
        }
    }

    if (!newAddress) throw new Error("500:failed_to_extract_collection_address");

    console.log(`\n✅ Default Zelf Name Service collection deployed: ${newAddress}`);
    console.log(`   → Update your .env: BLOCKDAG_DEFAULT_COLLECTION_ADDRESS=${newAddress}\n`);

    return { address: newAddress, deployed: true };
};

/**
 * Validate authentication based on wallet type
 * @param {Object} params
 * @param {string} params.walletType - 'zelf' or 'external'
 * @param {string} params.proof - ZelfProof (if zelf)
 * @param {string} params.signature - EVM signature (if external)
 * @param {string} params.message - Original message signed (if external)
 * @param {string} params.ownerAddress - Expected owner address
 * @param {string} params.faceBase64 - Face biometric (if zelf)
 * @param {string} params.password - Password (if zelf)
 */
const _validateAuth = async (params) => {
    const { walletType, proof, signature, message, owner, faceBase64, password } = params;

    if (walletType === "zelf") {
        if (!proof || !faceBase64) throw new Error("400:missing_zelf_proof_data");

        // Verify ZelfProof by attempting to decrypt it
        // If decryption works, the proof is valid and belongs to the user
        const decrypted = await ZelfProofModule.decrypt({
            faceBase64,
            password, // Optional depending on setup
            zelfProof: proof,
            os: "WEB", // Assumed context
        });

        if (!decrypted || decrypted.error) {
            throw new Error("401:invalid_zelf_proof");
        }

        // Return decrypted metadata in case we need it
        return decrypted;
    } else if (walletType === "external") {
        if (!signature || !message) throw new Error("400:missing_signature_data");

        // Verify EVM signature
        const recoveredAddress = ethers.verifyMessage(message, signature);

        if (recoveredAddress.toLowerCase() !== owner.toLowerCase()) {
            throw new Error("401:signature_mismatch");
        }

        return { verified: true, address: recoveredAddress };
    } else {
        throw new Error("400:invalid_wallet_type");
    }
};

/**
 * Store Collection Metadata to IPFS
 * @param {Object} data
 * @param {Object} authdUser
 */
const storeCollection = async (data, authdUser) => {
    const {
        name,
        symbol,
        description,
        coverImage,
        avatarImage,
        contractAddress,
        maxSupply,
        royaltyBps,
        walletType,
        proof,
        signature,
        message,
        owner,
        faceBase64,
        password,
        category,
    } = data;

    // 1. Validate Auth
    await _validateAuth({ walletType, proof, signature, message, owner, faceBase64, password });

    // 2. Prepare Metadata
    const collectionData = {
        name,
        symbol,
        description,
        coverImage,
        avatarImage,
        contractAddress,
        maxSupply,
        royaltyBps,
        owner,
        createdAt: new Date().toISOString(),
        verified: false, // Default
        walletType,
        category,
    };

    // 3. Pin to IPFS
    const fileName = `collection_${name.replace(/\s+/g, "_")}_${Date.now()}.json`;

    const ipfsMetadata = {
        category: "blockdag_nft_collection",
        owner: owner,
        contractAddress: contractAddress || "",
        name: name,
        symbol: symbol,
        walletType: walletType,
        collectionCategory: category || "Art", // Store for easy Pinata querying
    };

    const base64Data = Buffer.from(JSON.stringify(collectionData)).toString("base64");
    const base64Json = `data:application/json;base64,${base64Data}`;
    const ipfsResult = await IPFS.pinFile(base64Json, fileName, "application/json", ipfsMetadata);

    return {
        success: true,
        ipfs: ipfsResult,
        collection: collectionData,
    };
};

/**
 * Store NFT Metadata to IPFS
 * @param {Object} data
 * @param {Object} authdUser
 */
const storeNFT = async (data, authdUser) => {
    const { name, description, image, attributes, collectionAddress, walletType, proof, signature, message, owner, faceBase64, password, category } =
        data;

    // 1. Validate Auth
    await _validateAuth({ walletType, proof, signature, message, owner, faceBase64, password });

    // 2. Prepare Metadata — ERC-721 / OpenSea standard
    const nftData = {
        name,
        description,
        image,
        external_url: "https://zelf.world",
        category: category || "Art",
        attributes: attributes || [],
        properties: {
            files: [
                {
                    type: "image/png",
                    uri: image,
                },
            ],
            category: "image",
        },
    };

    // 3. Pin to IPFS (ERC-721 standard JSON metadata)
    const fileName = `nft_${name.replace(/\s+/g, "_")}_${Date.now()}.json`;

    // Non-standard fields stored as searchable Pinata keyvalues only (not in the token URI JSON)
    const ipfsMetadata = {
        category: "blockdag_nft_item",
        owner: owner,
        collection: collectionAddress,
        name: name,
        nftCategory: category || "Art", // Store for easy Pinata filtering
    };

    const base64Data = Buffer.from(JSON.stringify(nftData)).toString("base64");
    const base64Json = `data:application/json;base64,${base64Data}`;
    const ipfsResult = await IPFS.pinFile(base64Json, fileName, "application/json", ipfsMetadata);

    // Note: on-chain minting is handled by the frontend (user signs their own tx).
    // After minting, the frontend calls PATCH /api/blockdag/nft/item/:ipfsId/token
    // to persist the tokenId back into the IPFS metadata.

    return {
        success: true,
        ipfs: ipfsResult,
        nft: nftData,
    };
};

/**
 * List collections — enriched with real IPFS JSON content.
 * Optionally filtered by owner address (case-insensitive).
 */
const listCollections = async ({ owner } = {}) => {
    let results = await IPFS.filter("category", "blockdag_nft_collection");

    if (owner) {
        results = results.filter((item) => item.publicData?.owner?.toLowerCase() === owner.toLowerCase());
    }

    const enriched = await Promise.all(
        results.map(async (item) => {
            const metadata = await _fetchIpfsJson(item.url);
            return {
                ...metadata,
                ...item.publicData,
                // Fix key collision with Pinata root key
                category: metadata?.category || item.publicData?.collectionCategory || "Art",
                ipfsUrl: item.url,
                ipfsId: item.id,
            };
        })
    );

    return enriched;
};

/**
 * Fetch the actual JSON content stored at an IPFS URL.
 * Returns null if the fetch fails or the content is not valid JSON.
 */
const _fetchIpfsJson = async (url) => {
    if (!url) return null;
    try {
        const res = await fetch(url);
        if (!res.ok) return null;
        return await res.json();
    } catch (e) {
        return null;
    }
};

/**
 * Get a single NFT item by its Pinata file ID.
 * Returns the Pinata keyvalue metadata merged with the real IPFS JSON content.
 */
const getItem = async (id) => {
    if (!id) throw new Error("400:missing_id");

    // List all NFT items and find the one matching this ID
    const results = await IPFS.filter("category", "blockdag_nft_item");
    const item = results.find((r) => r.id === id);

    if (!item) throw new Error("404:nft_not_found");

    const metadata = await _fetchIpfsJson(item.url);

    return {
        ...metadata,
        ...item.publicData,
        category: metadata?.category || item.publicData?.nftCategory || "Art",
        ipfsUrl: item.url,
        ipfsId: item.id,
    };
};

/**
 * List items (optionally filtered by owner or collection)
 */
const listItems = async (filterParams) => {
    const { owner, collection } = filterParams;

    // Base filter
    let results = await IPFS.filter("category", "blockdag_nft_item");

    // Client-side filtering
    if (owner) {
        results = results.filter((item) => item.publicData?.owner?.toLowerCase() === owner.toLowerCase());
    }

    if (collection) {
        results = results.filter((item) => item.publicData?.collection?.toLowerCase() === collection.toLowerCase());
    }

    // Fetch real NFT metadata from IPFS in parallel
    const enriched = await Promise.all(
        results.map(async (item) => {
            const metadata = await _fetchIpfsJson(item.url);
            return {
                // Real ERC-721 fields from the stored JSON (name, image, description, attributes, etc.)
                ...metadata,
                // Pinata searchable fields as fallback / supplement
                ...item.publicData,
                category: metadata?.category || item.publicData?.nftCategory || "Art",
                ipfsUrl: item.url,
                ipfsId: item.id,
            };
        })
    );

    return enriched;
};

/**
 * Upload an image/file to IPFS
 * @param {Object} file - The file object from ctx.request.files.file
 */
const upload = async (file) => {
    if (!file) throw new Error("400:no_file_provided");

    // Read the file and convert to base64
    const fileContent = fs.readFileSync(file.filepath);
    const base64Data = fileContent.toString("base64");
    const mimeType = file.mimetype || "application/octet-stream";

    // Construct data URI required by IPFS.pinFile
    const dataUri = `data:${mimeType};base64,${base64Data}`;
    const fileName = `blockdag_nft_media_${Date.now()}_${file.originalFilename || "file"}`.replace(/[^a-zA-Z0-9_.-]/g, "_");

    // Searchable metadata for the media
    const ipfsMetadata = {
        category: "blockdag_nft_media",
        originalName: file.originalFilename || "unknown",
    };

    const ipfsResult = await IPFS.pinFile(dataUri, fileName, mimeType, ipfsMetadata);

    if (!ipfsResult) {
        throw new Error("500:ipfs_upload_failed");
    }

    return {
        url: ipfsResult.url,
        ipfsHash: ipfsResult.cid,
    };
};

/**
 * Mint an NFT on-chain using the collection owner's (deployer) wallet.
 * Called automatically by storeNFT after IPFS metadata is uploaded.
 *
 * @param {string} collectionAddress  ERC-721 contract address
 * @param {string} recipientAddress   Wallet that will receive the token
 * @param {string} tokenURI           IPFS metadata URL
 * @returns {{ tokenId: number, txHash: string }}
 */
const mintOnChain = async (collectionAddress, recipientAddress, tokenURI) => {
    const rpcUrl = config.blockdag?.rpcUrl || "https://rpc.bdagscan.com";
    const provider = new ethers.JsonRpcProvider(rpcUrl);

    let wallet;
    if (config.blockdag?.deployerPrivateKey) {
        wallet = new ethers.Wallet(config.blockdag.deployerPrivateKey, provider);
    } else if (process.env.BLOCKDAG_DEPLOYER_PRIVATE_KEY) {
        wallet = new ethers.Wallet(process.env.BLOCKDAG_DEPLOYER_PRIVATE_KEY, provider);
    } else if (process.env.WALRUS_PRIVATE_KEY) {
        const mnemonic = process.env.WALRUS_PRIVATE_KEY.trim();
        const base = ethers.Wallet.fromPhrase(mnemonic);
        wallet = base.connect(provider);
    } else {
        throw new Error("No deployer private key configured for on-chain minting");
    }

    const collection = new ethers.Contract(collectionAddress, ERC721_ABI, wallet);
    const tx = await collection.mint(recipientAddress, tokenURI);
    const receipt = await tx.wait();

    // tokenId is the return value of mint() — read from Transfer event
    let tokenId = null;
    for (const log of receipt.logs) {
        try {
            const parsed = collection.interface.parseLog({
                topics: [...log.topics],
                data: log.data,
            });
            if (parsed && parsed.name === "Transfer") {
                tokenId = (parsed.args[2] || parsed.args.tokenId).toString();
                break;
            }
        } catch (e) {}
    }

    return { tokenId, txHash: receipt.hash };
};

/**
 * Update an NFT item's on-chain tokenId.
 * Uses IPFS.updateItemTokenId (SDK update when possible).
 */
const updateItemTokenId = async (ipfsFileId, tokenId, txHash) => {
    const newPin = await IPFS.updateItemTokenId(ipfsFileId, tokenId, txHash);

    return {
        success: true,
        method: newPin.method || "update",
        newIpfsId: newPin.id || ipfsFileId,
        newCid: newPin.cid,
        newUrl: newPin.url,
        tokenId,
        txHash,
    };
};

/**
 * Replace an NFT pin with updated metadata (tokenId, txHash, owner).
 * Pinata does NOT allow updating keyvalues — we must delete and re-pin.
 * Returns the new Pinata file ID; frontend must redirect to the new URL.
 *
 * @param {string} ipfsFileId - Current Pinata file ID
 * @param {string|number} tokenId - On-chain token ID
 * @param {string} txHash - Mint/sale tx hash
 * @param {string} [owner] - New owner (when provided, e.g. after buy/acceptOffer). Otherwise keeps existing owner.
 */
const replaceNftItemWithNewOwner = async (ipfsFileId, tokenId, txHash, owner) => {
    const item = await getItem(ipfsFileId);
    const publicData = item.publicData || {};
    const resolvedOwner = owner ?? item.owner ?? publicData.owner ?? "";

    const keyvalues = {
        category: "blockdag_nft_item",
        collection: item.collection || publicData.collection || "",
        name: item.name || publicData.name || "NFT",
        owner: resolvedOwner,
        tokenId: String(tokenId),
        mintTxHash: txHash || publicData.mintTxHash || "",
    };

    const newPin = await IPFS.updateFileKeyvalues(ipfsFileId, keyvalues);

    return {
        success: true,
        newIpfsId: newPin.id ?? ipfsFileId,
        newCid: newPin.cid,
        newUrl: newPin.url,
        tokenId,
        txHash,
    };
};

/**
 * Generic Pinata keyvalue update for any pinned file.
 * Delegates to IPFS.updateFileKeyvalues.
 */
const updatePinKeyvalues = async (ipfsFileId, keyvalues) => {
    return IPFS.updateFileKeyvalues(ipfsFileId, keyvalues);
};

module.exports = {
    upload,
    getItem,
    getDefaultCollection,
    deployDefaultCollection,
    storeCollection,
    storeNFT,
    listCollections,
    listItems,
    mintOnChain,
    updateItemTokenId,
    replaceNftItemWithNewOwner,
    updatePinKeyvalues,
};
