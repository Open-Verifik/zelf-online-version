/**
 * ERC8004 Contract Deployment Script for Zelf Lawyer System
 *
 * Run from the contracts/ package (not the Koa API root):
 *   cd contracts && npm install && npm run compile
 *   npm run deploy:erc8004:fuji
 *   npm run deploy:erc8004:avalanche
 */

const fs = require("fs");
const path = require("path");

async function main() {
	const [deployer] = await ethers.getSigners();

	console.log("Deploying ERC8004 Lawyer contracts...");
	console.log("Deployer:", deployer.address);

	const balance = await ethers.provider.getBalance(deployer.address);
	console.log("Balance:", ethers.formatEther(balance), "AVAX\n");

	// 1. Deploy Identity Registry
	console.log("1/3 Deploying ERC8004IdentityRegistry...");
	const IdentityRegistry = await ethers.getContractFactory("ERC8004IdentityRegistry");
	const identityRegistry = await IdentityRegistry.deploy();
	await identityRegistry.waitForDeployment();
	const identityAddress = await identityRegistry.getAddress();
	console.log("   Identity Registry:", identityAddress);

	// 2. Deploy Reputation Registry (needs identity registry address)
	console.log("2/3 Deploying ERC8004ReputationRegistry...");
	const ReputationRegistry = await ethers.getContractFactory("ERC8004ReputationRegistry");
	const reputationRegistry = await ReputationRegistry.deploy(identityAddress);
	await reputationRegistry.waitForDeployment();
	const reputationAddress = await reputationRegistry.getAddress();
	console.log("   Reputation Registry:", reputationAddress);

	// 3. Deploy Validation Registry (needs identity registry address)
	console.log("3/3 Deploying ERC8004ValidationRegistry...");
	const ValidationRegistry = await ethers.getContractFactory("ERC8004ValidationRegistry");
	const validationRegistry = await ValidationRegistry.deploy(identityAddress);
	await validationRegistry.waitForDeployment();
	const validationAddress = await validationRegistry.getAddress();
	console.log("   Validation Registry:", validationAddress);

	// Save deployment info
	const network = await ethers.provider.getNetwork();
	const deployment = {
		network: network.name,
		chainId: Number(network.chainId),
		rpcUrl: ethers.provider.connection?.url || "",
		deployer: deployer.address,
		contracts: {
			identityRegistry: identityAddress,
			reputationRegistry: reputationAddress,
			validationRegistry: validationAddress,
		},
		deployedAt: new Date().toISOString(),
	};

	const outputPath = path.resolve(__dirname, "../../../erc8004-deployment.json");
	fs.writeFileSync(outputPath, JSON.stringify(deployment, null, 2));

	console.log("\nDeployment saved to erc8004-deployment.json");
	console.log("\nAdd to your .env:");
	console.log(`ERC8004_IDENTITY_REGISTRY=${identityAddress}`);
	console.log(`ERC8004_REPUTATION_REGISTRY=${reputationAddress}`);
	console.log(`ERC8004_VALIDATION_REGISTRY=${validationAddress}`);
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error);
		process.exit(1);
	});
