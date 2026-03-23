# BlockDAG NFT — edit metadata (title, description, properties)

## Scope

- Owners may update **title** (`name`), **description**, and **properties** (`attributes` / traits) for an existing `blockdag_nft_item`.
- **Image is never changed** — canonical `image` is read from existing pinned JSON (legacy pins may still have `image` in keyvalues for fallback only) and written back into the new JSON only.
- **`description` and `image` are not stored in Pinata keyvalues** (not indexed for search). Full **description**, **image**, and **attributes** live in the **pinned ERC-721 JSON**, same as a standard NFT metadata file.
- **New mints (`storeNFT`)** omit `description` and `image` from keyvalues; description max **5000** characters (Joi + JSON body).

## Authorization (strict owner-only)

1. **EIP-191 signature** — `owner`, `signature`, and `message` are required. `_validateAuth` recovers the signer and requires it to match `owner`.
2. **Message binding** — Message must match:
   `I authorize updating NFT metadata for item <ipfsFileId> in collection <checksummedAddress>. Timestamp: <number>`
   and must contain the substring `collection <checksummedCollection>` for `_ensureMessageIncludesCollection`.
3. **On-chain verification when minted** — If the item has a `collection` and non-empty `tokenId`, the backend calls **`ownerOf(tokenId)`** on the collection contract via the configured BlockDAG JSON-RPC provider. The recovered signer address **must equal** the on-chain owner.
4. **Drafts (not minted yet)** — If there is no `tokenId` on the pin, the Pinata keyvalue **`owner`** must match the signer.

## API

- **Route:** `PATCH /api/blockdag/nft/item/:id/metadata`
- **JWT session (required):** See [`blockdag-nft.routes.js`](file:///Users/miguel/zelf/Repositories/BlockDAG/routes/blockdag-nft.routes.js) / [`protected-repositories.js`](file:///Users/miguel/zelf/Routes/protected-repositories.js) / [`server.js`](file:///Users/miguel/zelf/server.js).
- **Body:** `name?`, `description?` (max **5000**), `attributes?`, plus `walletType`, `owner`, `signature`, `message`. At least one of `name`, `description`, or `attributes` must be present (Joi).
- **Storage:** **Delete old Pinata file + re-pin** updated JSON (same pattern as `updateCollection`). Response includes **`newIpfsId`** / **`newCid`**. Clients should **navigate to the new asset id** (old Pinata id is removed).
- **Pinata keyvalues** on the new pin: `category`, `owner`, `collection`, `name`, `nftCategory`, and when present `tokenId`, `mintTxHash` — **no** `image`, **no** `description`, **no** `attributesJson`.

## Reads (`getItem` / list enrichment)

- **Description**, **image**, and **attributes** are taken from **gateway JSON** first; legacy keyvalues on old pins are only fallbacks when needed.
- **`_enrichItems`** always fetches JSON so list views still show description without a keyvalue copy.

## Frontend

- **landing-zelf-nextjs** — create + asset edit: description **5000** max; after metadata save, **redirect** if `data.newIpfsId` differs from the previous id.

## Limitations

- Re-pinning produces a **new IPFS CID**. On-chain **`tokenURI`** still points at the **old** CID until updated by a contract that supports URI updates — external wallets may show stale metadata. Zelf app uses **Pinata file id** / API responses for navigation after edit.
