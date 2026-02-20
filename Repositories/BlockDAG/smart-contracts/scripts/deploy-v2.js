/**
 * Deploy ZelfNFTFactory V2 (with ERC-2981 royalty support) and ZelfMarketplace V2
 * on BlockDAG Mainnet.
 *
 * Run:
 *   node scripts/deploy-v2.js
 *
 * After deployment, update your .env:
 *   BLOCKDAG_FACTORY_ADDRESS=0x...
 *   BLOCKDAG_MARKETPLACE_V2_ADDRESS=0x...
 *
 * Also update lib/nft/contracts.ts in the frontend.
 */

require("dotenv").config({ path: require("path").resolve(__dirname, "../../../.env") });
const { ethers } = require("ethers");
const path = require("path");
const fs = require("fs");

const RPC_URL = "https://rpc.bdagscan.com";
const CHAIN_ID = 1404;

// Load compiled artifacts
function loadArtifact(name) {
    const artifactPath = path.resolve(__dirname, `../artifacts/contracts/${name}.sol/${name}.json`);
    if (!fs.existsSync(artifactPath)) {
        throw new Error(`Artifact not found: ${artifactPath}. Run 'npx hardhat compile' first.`);
    }
    return JSON.parse(fs.readFileSync(artifactPath, "utf8"));
}

async function main() {
    const provider = new ethers.JsonRpcProvider(RPC_URL);

    let wallet;
    if (process.env.BLOCKDAG_DEPLOYER_PRIVATE_KEY) {
        wallet = new ethers.Wallet(process.env.BLOCKDAG_DEPLOYER_PRIVATE_KEY, provider);
    } else if (process.env.WALRUS_PRIVATE_KEY) {
        const mnemonic = process.env.WALRUS_PRIVATE_KEY.trim();
        const base = ethers.Wallet.fromPhrase(mnemonic);
        wallet = base.connect(provider);
    } else {
        console.error("❌ No private key found. Set BLOCKDAG_DEPLOYER_PRIVATE_KEY or WALRUS_PRIVATE_KEY in .env");
        process.exit(1);
    }

    const balance = await provider.getBalance(wallet.address);
    console.log(`\n🔑 Deployer:  ${wallet.address}`);
    console.log(`💰 Balance:   ${ethers.formatEther(balance)} BDAG`);
    console.log(`📡 Chain:     ${CHAIN_ID} (${RPC_URL})\n`);

    if (balance === 0n) {
        console.error("❌ Wallet has no BDAG. Fund it before deploying.");
        process.exit(1);
    }

    // ── 1. Deploy ZelfNFTFactory V2 ──────────────────────────────────────────
    console.log("🚀 Deploying ZelfNFTFactory V2...");
    const factoryArtifact = loadArtifact("ZelfNFTFactory");
    const Factory = new ethers.ContractFactory(factoryArtifact.abi, factoryArtifact.bytecode, wallet);
    const factory = await Factory.deploy();
    await factory.waitForDeployment();
    const factoryAddress = await factory.getAddress();
    console.log(`   ✅ ZelfNFTFactory V2:    ${factoryAddress}`);

    // ── 2. Deploy ZelfMarketplace V2 ─────────────────────────────────────────
    console.log("🚀 Deploying ZelfMarketplace V2...");
    const marketplaceArtifact = loadArtifact("ZelfMarketplace");
    const Marketplace = new ethers.ContractFactory(marketplaceArtifact.abi, marketplaceArtifact.bytecode, wallet);
    // Pass deployer as the initial fee recipient (treasury wallet)
    const marketplace = await Marketplace.deploy(wallet.address);
    await marketplace.waitForDeployment();
    const marketplaceAddress = await marketplace.getAddress();
    console.log(`   ✅ ZelfMarketplace V2:   ${marketplaceAddress}`);

    // ── Summary ───────────────────────────────────────────────────────────────
    console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Deployment complete!

📝 Add these to your .env:
   BLOCKDAG_FACTORY_ADDRESS=${factoryAddress}
   BLOCKDAG_MARKETPLACE_V2_ADDRESS=${marketplaceAddress}

📝 Update lib/nft/contracts.ts:
   ZELF_NFT_FACTORY_ADDRESS = "${factoryAddress}"
   ZELF_MARKETPLACE_ADDRESS = "${marketplaceAddress}"

📡 Verify on bdagscan.com:
   Factory:     https://bdagscan.com/address/${factoryAddress}
   Marketplace: https://bdagscan.com/address/${marketplaceAddress}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
}

main().catch((err) => {
    console.error("❌ Deployment failed:", err.message || err);
    process.exit(1);
});
