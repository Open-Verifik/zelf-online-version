const hre = require("hardhat");

async function main() {
    const signers = await hre.ethers.getSigners();
    console.log("Deploying contracts with the account:", signers[0].address);

    // Deploy Factory
    const ZelfNFTFactory = await hre.ethers.getContractFactory("ZelfNFTFactory");
    const factory = await ZelfNFTFactory.deploy();
    await factory.waitForDeployment();
    const factoryAddress = await factory.getAddress();
    console.log("ZelfNFTFactory deployed to:", factoryAddress);

    // Deploy Marketplace
    const ZelfMarketplace = await hre.ethers.getContractFactory("ZelfMarketplace");
    const marketplace = await ZelfMarketplace.deploy();
    await marketplace.waitForDeployment();
    const marketplaceAddress = await marketplace.getAddress();
    console.log("ZelfMarketplace deployed to:", marketplaceAddress);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
