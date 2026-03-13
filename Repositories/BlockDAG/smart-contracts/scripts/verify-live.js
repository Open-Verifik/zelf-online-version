const hre = require("hardhat");

const FACTORY_ADDRESS = "0x7c6a168455C94092f8d51aBC515B73f4Ed9813a6";
const MARKETPLACE_ADDRESS = "0xc8AF65010D6Bf85e4DC89D9D13E9cC185df919B1";

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    console.log("Verifying contracts with account:", deployer.address);

    // Verify Factory
    const factory = await hre.ethers.getContractAt("ZelfNFTFactory", FACTORY_ADDRESS);
    const factoryOwner = await factory.owner();
    console.log(`Factory Owner: ${factoryOwner}`);
    if (factoryOwner === deployer.address) {
        console.log("✅ Factory ownership verified");
    } else {
        console.error("❌ Factory ownership mismatch");
    }

    // Verify Marketplace
    const marketplace = await hre.ethers.getContractAt("ZelfMarketplace", MARKETPLACE_ADDRESS);
    const marketplaceOwner = await marketplace.owner();
    console.log(`Marketplace Owner: ${marketplaceOwner}`);
    if (marketplaceOwner === deployer.address) {
        console.log("✅ Marketplace ownership verified");
    } else {
        console.error("❌ Marketplace ownership mismatch");
    }

    // Optional: Create a test collection to verify logic (costs gas)
    // Uncomment if you want to test transaction execution
    /*
  console.log("Creating test collection...");
  const tx = await factory.createCollection("Zelf Test", "ZTEST", 100);
  console.log("Tx hash:", tx.hash);
  const receipt = await tx.wait();
  console.log("Collection created in block:", receipt.blockNumber);
  */
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
