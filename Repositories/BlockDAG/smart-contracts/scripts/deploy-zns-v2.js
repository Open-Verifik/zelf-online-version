/**
 * Deploy a new default Zelf Name Service (ZNS) collection using the V2 Factory.
 * The V2 factory supports royalties (ERC-2981).
 *
 * Run: node scripts/deploy-zns-v2.js
 *
 * After deployment, update your .env:
 *   BLOCKDAG_DEFAULT_COLLECTION_ADDRESS=0x...
 */
require("dotenv").config({ path: require("path").resolve(__dirname, "../../../../.env") });
const { ethers } = require("ethers");
const path = require("path");
const fs = require("fs");

const FACTORY_V2_ADDRESS = "0x0c5ED1dCB6b59E7A4712223829A49E6A48B69476";
const FACTORY_V2_ABI = [
    "function createCollection(string name, string symbol, uint256 maxSupply, uint96 royaltyBps) public returns (address)",
    "event CollectionCreated(address indexed collectionAddress, string name, string symbol, address indexed owner, uint96 royaltyBps)",
];

const RPC_URL = "https://rpc.bdagscan.com";

async function main() {
    const provider = new ethers.JsonRpcProvider(RPC_URL);

    let wallet;
    const mnemonic = process.env.WALRUS_PRIVATE_KEY?.trim();
    if (process.env.BLOCKDAG_DEPLOYER_PRIVATE_KEY) {
        wallet = new ethers.Wallet(process.env.BLOCKDAG_DEPLOYER_PRIVATE_KEY, provider);
    } else if (mnemonic && mnemonic.includes(" ")) {
        wallet = ethers.Wallet.fromPhrase(mnemonic).connect(provider);
    } else if (mnemonic) {
        wallet = new ethers.Wallet(mnemonic, provider);
    } else {
        console.error("❌ No private key found.");
        process.exit(1);
    }

    const balance = await provider.getBalance(wallet.address);
    console.log(`\n🔑 Deployer: ${wallet.address}`);
    console.log(`💰 Balance:  ${ethers.formatEther(balance)} BDAG\n`);

    const factory = new ethers.Contract(FACTORY_V2_ADDRESS, FACTORY_V2_ABI, wallet);

    console.log("🚀 Creating ZNS V2 collection (5% royalty)...");
    const tx = await factory.createCollection(
        "Zelf Name Service",
        "ZNS",
        0, // unlimited supply
        500 // 5% royalty in basis points
    );
    const receipt = await tx.wait();

    // Parse CollectionCreated event
    const iface = new ethers.Interface(FACTORY_V2_ABI);
    let collectionAddress = null;
    for (const log of receipt.logs) {
        try {
            const parsed = iface.parseLog(log);
            if (parsed?.name === "CollectionCreated") {
                collectionAddress = parsed.args.collectionAddress;
                break;
            }
        } catch {}
    }

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`✅ ZNS V2 Collection deployed!`);
    console.log(`   Address:   ${collectionAddress}`);
    console.log(`   Royalty:   5% (500 bps)`);
    console.log(`   Tx:        https://bdagscan.com/tx/${receipt.hash}`);
    console.log(`\n📝 Add to your .env:`);
    console.log(`   BLOCKDAG_DEFAULT_COLLECTION_ADDRESS=${collectionAddress}`);
    console.log(`\n📝 Update lib/nft/contracts.ts:`);
    console.log(`   ZELF_SHARED_COLLECTION_ADDRESS = "${collectionAddress}"`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
}

main().catch((err) => {
    console.error("❌ Failed:", err.message);
    process.exit(1);
});
