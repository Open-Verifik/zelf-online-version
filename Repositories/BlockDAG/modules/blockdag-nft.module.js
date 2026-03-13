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

    if (!signature || !message) throw new Error("400:missing_signature_data");

    // Verify EVM signature
    const recoveredAddress = ethers.verifyMessage(message, signature);

    if (recoveredAddress.toLowerCase() !== owner.toLowerCase()) throw new Error("401:signature_mismatch");

    return { verified: true, address: recoveredAddress };

    // if (walletType === "zelf") {
    //     if (!proof || !faceBase64) throw new Error("400:missing_zelf_proof_data");

    //     // Verify ZelfProof by attempting to decrypt it
    //     // If decryption works, the proof is valid and belongs to the user
    //     const decrypted = await ZelfProofModule.decrypt({
    //         faceBase64,
    //         password, // Optional depending on setup
    //         zelfProof: proof,
    //         os: "WEB", // Assumed context
    //     });

    //     if (!decrypted || decrypted.error) {
    //         throw new Error("401:invalid_zelf_proof");
    //     }

    //     // Return decrypted metadata in case we need it
    //     return decrypted;
    // } else if (walletType === "external") {
    //     if (!signature || !message) throw new Error("400:missing_signature_data");

    //     // Verify EVM signature
    //     const recoveredAddress = ethers.verifyMessage(message, signature);

    //     if (recoveredAddress.toLowerCase() !== owner.toLowerCase()) throw new Error("401:signature_mismatch");

    //     return { verified: true, address: recoveredAddress };
    // } else {
    //     throw new Error("400:invalid_wallet_type");
    // }
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

    // Pinata allows max 9 keyvalues per pin. Only filterable fields; display content lives in JSON body.
    const ipfsMetadata = {
        category: "blockdag_nft_collection",
        owner: ethers.getAddress(owner),
        contractAddress: contractAddress || "",
        name: name,
        symbol: symbol,
        walletType: walletType,
        collectionCategory: category || "Art",
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
 * Delete a Collection from IPFS
 * @param {string} id - IPFS Hash / Pinata ID
 * @param {Object} authdUser - The full auth payload { walletType, owner, signature, message, etc }
 */
const deleteCollection = async (id, authdUser) => {
    // 1. Fetch existing IPFS metadata payload to discover true owner
    const existingFile = await IPFS.getFileById(id);

    if (!existingFile || !existingFile.publicData) throw new Error("404:collection_not_found");

    const { owner: actualOwner } = existingFile.publicData;

    if (!actualOwner) throw new Error("400:collection_owner_undefined");
    if (!authdUser) throw new Error("400:missing_auth_payload_body_empty");

    // 2. Mathematically verify the user holds the private key to the requested `owner` address
    await _validateAuth(authdUser);

    // 3. Prevent malicious signatures from other users
    if (actualOwner.toLowerCase() !== authdUser.owner.toLowerCase()) throw new Error("403:unauthorized");

    // 4. Message binding: signed message must authorize the exact id being deleted (prevents signature reuse)
    const collMatch = authdUser.message.match(/^I authorize deleting collection (.+?)\. Timestamp: \d+$/);
    if (!collMatch || collMatch[1] !== id) throw new Error("400:message_id_mismatch");

    // 5. Securely unpin file
    const result = await IPFS.deleteFiles([id]);
    return { success: true, result };
};

/**
 * Delete an NFT item from IPFS (owner-only).
 * Use for orphaned drafts (uploaded but mint failed) to remove duplicates.
 * @param {string} id - IPFS file ID / Pinata ID
 * @param {Object} authdUser - { walletType, owner, signature, message } or Zelf proof
 */
const deleteItem = async (id, authdUser) => {
    const existingFile = await IPFS.getFileById(id);
    if (!existingFile || !existingFile.publicData) throw new Error("404:item_not_found");

    const { owner: actualOwner } = existingFile.publicData;
    if (!actualOwner) throw new Error("400:item_owner_undefined");
    if (!authdUser) throw new Error("400:missing_auth_payload_body_empty");

    await _validateAuth(authdUser);
    if (actualOwner.toLowerCase() !== authdUser.owner.toLowerCase()) throw new Error("403:unauthorized");

    // Message binding: signed message must authorize the exact id being deleted (prevents signature reuse)
    const itemMatch = authdUser.message.match(/^I authorize deleting NFT metadata (.+?) from IPFS\. Timestamp: \d+$/);
    if (!itemMatch || itemMatch[1] !== id) throw new Error("400:message_id_mismatch");

    const result = await IPFS.deleteFiles([id]);
    return { success: true, result };
};

/**
 * Update Collection coverImage, avatarImage, and/or name.
 * Owner-only. Verifies signature, then delete+repin with merged metadata.
 * @param {string} id - Pinata file ID
 * @param {Object} updates - { coverImage?, avatarImage?, name? }
 * @param {Object} authdUser - { walletType, owner, signature, message } or Zelf proof
 */
const updateCollection = async (id, updates, authdUser) => {
    const { coverImage, avatarImage, name } = updates;

    if (!coverImage && !avatarImage && name === undefined) throw new Error("400:provide_cover_image_avatar_image_or_name");

    // 1. Fetch existing file and JSON content
    const existingFile = await IPFS.getFileById(id);

    if (!existingFile || !existingFile.publicData) throw new Error("404:collection_not_found");

    const { owner: actualOwner } = existingFile.publicData;
    if (!actualOwner) throw new Error("400:collection_owner_undefined");
    if (!authdUser) throw new Error("400:missing_auth_payload_body_empty");

    // 2. Fetch existing JSON content
    const existingJson = await _fetchIpfsJson(existingFile.url);
    if (!existingJson) throw new Error("404:collection_content_not_found");

    // 3. Verify auth
    await _validateAuth(authdUser);

    if (actualOwner.toLowerCase() !== authdUser.owner.toLowerCase()) throw new Error("403:unauthorized");

    // 4. Merge updates (only non-empty values)
    const collectionData = {
        ...existingJson,
        ...(coverImage && { coverImage }),
        ...(avatarImage && { avatarImage }),
        ...(name !== undefined && { name: name || existingJson.name }),
    };

    // 5. Delete old pin
    await IPFS.deleteFiles([id]);

    // 6. Re-pin with updated content
    const fileName = `collection_${collectionData.name?.replace(/\s+/g, "_") || "collection"}_${Date.now()}.json`;
    // Pinata allows max 9 keyvalues per pin. Only filterable fields; display content in JSON body.
    const ipfsMetadata = {
        category: "blockdag_nft_collection",
        owner: collectionData.owner,
        contractAddress: collectionData.contractAddress || "",
        name: collectionData.name,
        symbol: collectionData.symbol,
        walletType: collectionData.walletType || "external",
        collectionCategory: collectionData.category || "Art",
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

    // Non-standard fields stored as searchable Pinata keyvalues only (not in the token URI JSON).
    // image + description are included so list endpoints can skip the gateway fetch entirely.
    const ipfsMetadata = {
        category: "blockdag_nft_item",
        owner: ethers.getAddress(owner),
        collection: collectionAddress,
        name: name,
        nftCategory: category || "Art",
        image: (image || "").slice(0, 250),
        description: (description || "").slice(0, 200),
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
 * @param {Object} options
 * @param {string} [options.owner] - Filter by owner address
 * @param {number} [options.limit=25] - Max results (capped at 100)
 */
const listCollections = async ({ owner, limit } = {}) => {
    const maxResults = Math.min(Number(limit) || 25, 100);
    let results;

    if (owner) {
        const ownerChecksum = ethers.getAddress(owner);
        const ownerLower = owner.toLowerCase();
        const queries = [IPFS.filter("owner", ownerChecksum, { limit: maxResults })];
        if (ownerLower !== ownerChecksum) queries.push(IPFS.filter("owner", ownerLower, { limit: maxResults }));
        const all = (await Promise.all(queries)).flat();
        const seen = new Set();
        results = all.filter((item) => {
            if (seen.has(item.id)) return false;
            seen.add(item.id);
            return true;
        });
        results = results.filter((item) => item.publicData?.category === "blockdag_nft_collection");
        results.forEach((item) => {
            if (item.publicData?.owner && item.publicData.owner !== ownerChecksum) {
                IPFS.updateFileKeyvalues(item.id, { owner: ownerChecksum }).catch(() => {});
            }
        });
    } else {
        results = await IPFS.filter("category", "blockdag_nft_collection", { limit: maxResults });
    }

    if (results.length > maxResults) results = results.slice(0, maxResults);

    const enriched = await Promise.all(
        results.map(async (item) => {
            const pd = item.publicData || {};

            // Skip gateway fetch when keyvalues already contain display fields
            if (pd.coverImage) {
                return {
                    name: pd.name || item.name || "",
                    symbol: pd.symbol || "",
                    description: pd.description || "",
                    coverImage: pd.coverImage || "",
                    avatarImage: pd.avatarImage || "",
                    category: pd.collectionCategory || pd.category || "Art",
                    owner: pd.owner || "",
                    contractAddress: pd.contractAddress || "",
                    walletType: pd.walletType || "",
                    verified: false,
                    ipfsUrl: item.url,
                    ipfsId: item.id,
                    cid: item.cid,
                };
            }

            const metadata = await _fetchIpfsJson(item.url);
            return {
                ...metadata,
                ...pd,
                category: metadata?.category || pd.collectionCategory || "Art",
                ipfsUrl: item.url,
                ipfsId: item.id,
                cid: item.cid,
            };
        })
    );

    return enriched;
};

// ── CID-level cache for IPFS gateway JSON fetches (node-cache) ───────────────
// Top CIDs were being re-fetched ~5 000 times each; this eliminates repeat calls.
const NodeCache = require("node-cache");
const _ipfsJsonCache = new NodeCache({
    stdTTL: 600, // 10 minutes
    checkperiod: 120,
    useClones: false,
});

const _extractCid = (url) => {
    const m = url.match(/\/ipfs\/([^/?#]+)/);
    return m ? m[1] : null;
};

const _isDev = config.env === "development";

/**
 * Fetch the actual JSON content stored at an IPFS URL.
 * Results are cached by CID (via node-cache, 10 min TTL) to avoid repeated gateway calls.
 * Returns null if the fetch fails or the content is not valid JSON.
 */
const _fetchIpfsJson = async (url) => {
    if (!url) return null;

    const cid = _extractCid(url);
    const cacheKey = cid || url;

    const cached = _ipfsJsonCache.get(cacheKey);
    if (cached !== undefined) {
        if (_isDev) {
            const { hits, misses } = _ipfsJsonCache.getStats();
            const note = cached === null ? "cached failure (5min)" : "from cache";
            console.log(`[IPFS-cache] HIT  ${cacheKey.slice(0, 20)}…  ← ${note} | session: ${hits} hits, ${misses} gateway fetches`);
        }
        return cached;
    }

    if (_isDev) {
        const { misses } = _ipfsJsonCache.getStats();
        console.log(`[IPFS-cache] MISS ${cacheKey.slice(0, 20)}…  → fetching from gateway (fetch #${misses + 1} this session)`);
    }

    try {
        const res = await fetch(url);
        if (!res.ok) {
            _ipfsJsonCache.set(cacheKey, null, 300); // cache failures for 5 min
            return null;
        }
        const json = await res.json();
        _ipfsJsonCache.set(cacheKey, json);
        return json;
    } catch (e) {
        _ipfsJsonCache.set(cacheKey, null, 300); // cache failures for 5 min
        return null;
    }
};

/**
 * Build a list-view item from Pinata keyvalues only (no gateway fetch).
 * Used when publicData already contains essential fields like image.
 */
const _buildLightItem = (item) => {
    const pd = item.publicData || {};
    return {
        name: pd.name || item.name || "",
        description: pd.description || "",
        image: pd.image || "",
        category: pd.nftCategory || pd.collectionCategory || pd.category || "Art",
        owner: pd.owner || "",
        collection: pd.collection || "",
        contractAddress: pd.contractAddress || pd.collection || "",
        tokenId: pd.tokenId || "",
        mintTxHash: pd.mintTxHash || "",
        ipfsUrl: item.url,
        ipfsId: item.id,
        cid: item.cid,
    };
};

/**
 * Enrich raw IPFS file results with fetched JSON metadata.
 * Skips the gateway fetch when publicData already has the `image` field
 * (items stored after the keyvalue migration). Falls back to gateway
 * fetch (served from CID cache when available) for older items.
 */
const _enrichItems = async (rawResults) => {
    return Promise.all(
        rawResults.map(async (item) => {
            if (item.publicData?.image) return _buildLightItem(item);

            const metadata = await _fetchIpfsJson(item.url);
            return {
                ...metadata,
                ...item.publicData,
                category: metadata?.category || item.publicData?.nftCategory || "Art",
                ipfsUrl: item.url,
                ipfsId: item.id,
                cid: item.cid,
            };
        })
    );
};

/**
 * Check if a string looks like an IPFS CID (v0 Qm... or v1 bafy.../bafk.../bafz...).
 */
const _isIpfsCid = (s) => {
    if (!s || typeof s !== "string") return false;
    const t = s.trim();
    return t.startsWith("Qm") || t.startsWith("baf") || t.startsWith("ba") || /^[a-zA-Z0-9]{46,}$/.test(t);
};

/**
 * Get a single NFT item by Pinata file ID or IPFS CID.
 * Prefers CID lookup when the id looks like a CID (standard, content-addressed).
 */
const getItem = async (id) => {
    if (!id) throw new Error("400:missing_id");

    let item;

    if (_isIpfsCid(id)) {
        // Lookup by IPFS CID (standard, content-addressed)
        const results = await IPFS.filter("cid", id.trim());
        item = results[0];
    } else {
        // Lookup by Pinata file ID (UUID)
        try {
            item = await IPFS.getFileById(id);
        } catch {
            throw new Error("404:nft_not_found");
        }
        if (item?.publicData?.category !== "blockdag_nft_item") {
            throw new Error("404:nft_not_found");
        }
    }

    if (!item) throw new Error("404:nft_not_found");

    const metadata = await _fetchIpfsJson(item.url);

    return {
        ...metadata,
        ...item.publicData,
        category: metadata?.category || item.publicData?.nftCategory || "Art",
        ipfsUrl: item.url,
        ipfsId: item.id,
        cid: item.cid,
    };
};

/**
 * Get items for a single collection.
 * Uses single-key filter (Pinata only supports one key) — filter by "collection" to avoid category's 50-item limit.
 * @param {string} collectionAddress - Contract address of the collection (0x...)
 * @param {Object} options - { owner, limit } for optional filters
 */
const getItemsByCollection = async (collectionAddress, options = {}) => {
    if (!collectionAddress) return [];

    const rawLimit = options.limit != null ? Number(options.limit) : 50;
    const validLimit = [25, 50, 100, 250, 500].includes(rawLimit) ? rawLimit : 50;

    // Pinata supports only ONE key filter — use "collection" (items with this key are NFT items)
    const colNorm = collectionAddress.toLowerCase();
    let results = await IPFS.filter("collection", colNorm, { limit: validLimit });
    if (results.length === 0 && collectionAddress !== colNorm) {
        results = await IPFS.filter("collection", collectionAddress, { limit: validLimit });
    }

    if (options.owner) {
        results = results.filter((item) => item.publicData?.owner?.toLowerCase() === options.owner.toLowerCase());
    }

    return _enrichItems(results);
};

/**
 * List items (optionally filtered by owner or collection).
 * Default limit: 50 (max 200). Reduces Pinata + gateway request volume.
 */
const listItems = async (filterParams) => {
    const { owner, collection, limit } = filterParams;
    const maxResults = Math.min(Number(limit) || 50, 200);

    if (collection) {
        return getItemsByCollection(collection, { owner, limit: limit || 50 });
    }

    if (owner) {
        const ownerChecksum = ethers.getAddress(owner);
        const ownerLower = owner.toLowerCase();
        const queries = [IPFS.filter("owner", ownerChecksum, { limit: maxResults })];
        if (ownerLower !== ownerChecksum) queries.push(IPFS.filter("owner", ownerLower, { limit: maxResults }));
        const all = (await Promise.all(queries)).flat();
        const seen = new Set();
        let results = all.filter((item) => {
            if (seen.has(item.id)) return false;
            seen.add(item.id);
            return true;
        });
        results.forEach((item) => {
            if (item.publicData?.owner && item.publicData.owner !== ownerChecksum) {
                IPFS.updateFileKeyvalues(item.id, { owner: ownerChecksum }).catch(() => {});
            }
        });
        if (results.length > maxResults) results = results.slice(0, maxResults);
        return _enrichItems(results);
    }

    let results = await IPFS.filter("category", "blockdag_nft_item", { limit: maxResults });

    return _enrichItems(results);
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
 */
const updateItemTokenId = async (ipfsFileId, tokenId, txHash) => {
    const keyvalues = {
        tokenId: String(tokenId),
        mintTxHash: txHash || "",
    };
    const newPin = await IPFS.updateFileKeyvalues(ipfsFileId, keyvalues);

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
 * Verifies owner on-chain via ownerOf(tokenId) instead of trusting frontend.
 * Falls back to provided owner if chain call fails.
 *
 * @param {string} ipfsFileId - Current Pinata file ID
 * @param {string|number} tokenId - On-chain token ID
 * @param {string} txHash - Mint/sale tx hash
 * @param {string} [owner] - Hint; overridden by on-chain ownerOf when available.
 */
const replaceNftItemWithNewOwner = async (ipfsFileId, tokenId, txHash, owner) => {
    const item = await getItem(ipfsFileId);
    const publicData = item.publicData || {};
    const collectionAddr = item.collection || publicData.collection || "";

    let resolvedOwner = owner ?? item.owner ?? publicData.owner ?? "";
    if (collectionAddr && collectionAddr !== "none" && tokenId) {
        try {
            const rpcUrl = config.blockdag?.rpcUrl || "https://rpc.bdagscan.com";
            const provider = new ethers.JsonRpcProvider(rpcUrl);
            const contract = new ethers.Contract(collectionAddr, ERC721_ABI, provider);
            resolvedOwner = await contract.ownerOf(BigInt(tokenId));
        } catch {
            // Chain call failed — fall back to provided owner
        }
    }

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
    updateCollection,
    deleteCollection,
    deleteItem,
    storeNFT,
    listCollections,
    listItems,
    getItemsByCollection,
    mintOnChain,
    updateItemTokenId,
    replaceNftItemWithNewOwner,
    updatePinKeyvalues,
};
