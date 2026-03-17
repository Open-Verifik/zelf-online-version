# Deploy Option B: On-Chain Reject Offer

This document describes how to deploy the `rejectOffer` feature (Option B) so NFT owners can reject offers on-chain. The offer is refunded to the offerer and removed from the contract.

## Prerequisites

- Node.js and npm
- `.env` with `BLOCKDAG_DEPLOYER_PRIVATE_KEY` or `WALRUS_PRIVATE_KEY`
- BDAG in the deployer wallet for gas

## 1. Compile the Contract

From the smart-contracts directory:

```bash
cd Repositories/BlockDAG/smart-contracts
npx hardhat compile
```

## 2. Deploy ZelfMarketplace V3

The current `deploy-v2.js` deploys both Factory and Marketplace. To deploy only the updated Marketplace (with `rejectOffer`):

**Option A: Use existing deploy script** (deploys both Factory and Marketplace)

```bash
node scripts/deploy-v2.js
```

This will output new addresses. Use the new `ZelfMarketplace` address.

**Option B: Create a marketplace-only deploy script** (recommended if you only need the marketplace update)

Create `scripts/deploy-marketplace-v3.js`:

```javascript
/**
 * Deploy ZelfMarketplace V3 (adds rejectOffer) on BlockDAG Mainnet.
 * Run: node scripts/deploy-marketplace-v3.js
 */
require("dotenv").config({ path: require("path").resolve(__dirname, "../../../../.env") });
const { ethers } = require("ethers");
const path = require("path");
const fs = require("fs");

const RPC_URL = "https://rpc.bdagscan.com";

function loadArtifact(name) {
    const artifactPath = path.resolve(__dirname, `../artifacts/contracts/${name}.sol/${name}.json`);
    return JSON.parse(fs.readFileSync(artifactPath, "utf8"));
}

async function main() {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(process.env.BLOCKDAG_DEPLOYER_PRIVATE_KEY, provider);
    const feeRecipient = process.env.BLOCKDAG_FEE_RECIPIENT || wallet.address;

    const artifact = loadArtifact("ZelfMarketplace");
    const Marketplace = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
    const marketplace = await Marketplace.deploy(feeRecipient);
    await marketplace.waitForDeployment();
    const addr = await marketplace.getAddress();

    console.log(`\n✅ ZelfMarketplace V3: ${addr}`);
    console.log(`\nUpdate landing-zelf-nextjs lib/nft/contracts.ts:`);
    console.log(`   ZELF_MARKETPLACE_ADDRESS = "${addr}"\n`);
}

main().catch((e) => { console.error(e); process.exit(1); });
```

Then run:

```bash
node scripts/deploy-marketplace-v3.js
```

## 3. Update Frontend

### 3.1 Add ABI and contract address

In `landing-zelf-nextjs/lib/nft/contracts.ts`:

- Update `ZELF_MARKETPLACE_ADDRESS` with the new deployed address
- Add to `ZELF_MARKETPLACE_ABI`:

```typescript
"function rejectOffer(address nftAddress, uint256 tokenId, address offerer) external",
```

### 3.2 Add `rejectOffer` to useMarketplace

In `landing-zelf-nextjs/hooks/useMarketplace.ts`:

- Add `rejectOffer` callback (similar to `acceptOffer`, but calls `mp.rejectOffer(nftAddress, tokenId, offerer)`)
- Add gas estimation in `lib/nft/gas-estimation.ts` for `estimateRejectOfferGas`
- Export `rejectOffer` from the hook

### 3.3 Replace localStorage Reject with contract call

In `app/[locale]/nft/asset/[id]/page.tsx` and `app/[locale]/nft/profile/[address]/page.tsx`:

- Change the Reject button `onClick` from `rejectOfferLocally(...)` to `await marketplace.rejectOffer(collectionAddr, nft.tokenId, o.offerer)`
- On success: refresh offers (no need for localStorage)
- Remove the `isOfferRejected` filter (offers are removed on-chain)
- Optionally keep the localStorage helpers as fallback during migration, or remove `lib/nft/rejected-offers.ts` entirely

## 4. Migration Notes

**Important:** Deploying a new marketplace creates a **new contract**. Existing listings and offers remain on the **old** contract.

- **New listings/offers** will use the new contract
- **Existing listings** on the old contract: users must cancel and re-list on the new contract if they want to use `rejectOffer`
- **Existing offers** on the old contract: offerers can still cancel; owners cannot reject (old contract has no `rejectOffer`)

If you need to migrate existing activity, consider:
- Announcing the cutover date
- Providing a UI notice: "New marketplace deployed. Cancel old listings and re-list to use Reject Offer."

## 5. Verify on BDAGscan

After deployment:

```
https://bdagscan.com/address/<NEW_MARKETPLACE_ADDRESS>
```

Use the contract verification feature if desired (Hardhat verify plugin).
