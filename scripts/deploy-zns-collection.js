/**
 * One-time script to deploy the official "Zelf Name Service" (ZNS) ERC-721 collection
 * on BlockDAG Mainnet via the ZelfNFTFactory contract.
 *
 * Run: node scripts/deploy-zns-collection.js
 *
 * After successful deployment, copy the printed address into your .env:
 *   BLOCKDAG_DEFAULT_COLLECTION_ADDRESS=0x...
 */

require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const { ethers } = require("ethers");

const FACTORY_ADDRESS = "0x7c6a168455C94092f8d51aBC515B73f4Ed9813a6";
const RPC_URL = "https://rpc.bdagscan.com";
const CHAIN_ID = 1404;

const FACTORY_ABI = [
    "function createCollection(string name, string symbol, uint256 maxSupply) public returns (address)",
    "event CollectionCreated(address indexed collectionAddress, string name, string symbol, address indexed owner)",
];

async function main() {
    // Support both a raw private key and a mnemonic via env vars
    let wallet;

    if (process.env.BLOCKDAG_DEPLOYER_PRIVATE_KEY) {
        const provider = new ethers.JsonRpcProvider(RPC_URL);
        wallet = new ethers.Wallet(process.env.BLOCKDAG_DEPLOYER_PRIVATE_KEY, provider);
    } else if (process.env.WALRUS_PRIVATE_KEY) {
        const mnemonic = process.env.WALRUS_PRIVATE_KEY.trim();
        const provider = new ethers.JsonRpcProvider(RPC_URL);
        const mnemonicWallet = ethers.Wallet.fromPhrase(mnemonic);
        wallet = mnemonicWallet.connect(provider);
    } else {
        console.error("❌ No private key found. Set BLOCKDAG_DEPLOYER_PRIVATE_KEY or WALRUS_PRIVATE_KEY in your .env");
        process.exit(1);
    }

    console.log(`\n🔑 Deploying from: ${wallet.address}`);
    console.log(`📡 RPC: ${RPC_URL} (Chain ${CHAIN_ID})\n`);

    // Check balance
    const provider = wallet.provider;
    const balance = await provider.getBalance(wallet.address);
    console.log(`💰 Balance: ${ethers.formatEther(balance)} BDAG`);

    if (balance === 0n) {
        console.error("❌ Wallet has no BDAG. Please fund it before deploying.");
        process.exit(1);
    }

    const factory = new ethers.Contract(FACTORY_ADDRESS, FACTORY_ABI, wallet);

    console.log("🚀 Deploying Zelf Name Service collection...");
    const tx = await factory.createCollection("Zelf Name Service", "ZNS", BigInt(0));
    console.log(`   Tx hash: ${tx.hash}`);
    console.log("   Waiting for confirmation...");

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
            // ignore logs from other contracts
        }
    }

    if (!newAddress) {
        console.error("❌ Could not find CollectionCreated event in logs.");
        console.log("Receipt:", JSON.stringify(receipt, null, 2));
        process.exit(1);
    }

    console.log(`\n✅ Success! Zelf Name Service collection deployed:`);
    console.log(`   Contract: ${newAddress}`);
    console.log(`\n📝 Add this to your .env file:`);
    console.log(`   BLOCKDAG_DEFAULT_COLLECTION_ADDRESS=${newAddress}\n`);
}

main().catch((err) => {
    console.error("❌ Deployment failed:", err.message || err);
    process.exit(1);
});
