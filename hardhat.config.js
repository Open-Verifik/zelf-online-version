require("@nomicfoundation/hardhat-ethers");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
	solidity: {
		version: "0.8.20",
		settings: {
			optimizer: {
				enabled: true,
				runs: 200,
			},
		},
	},
	networks: {
		fuji: {
			url: process.env.ERC8004_RPC_URL || "https://api.avax-test.network/ext/bc/C/rpc",
			chainId: 43113,
			accounts: process.env.WALRUS_PRIVATE_KEY
				? { mnemonic: process.env.WALRUS_PRIVATE_KEY }
				: [],
		},
		avalanche: {
			url: process.env.ERC8004_RPC_URL || "https://api.avax.network/ext/bc/C/rpc",
			chainId: 43114,
			accounts: process.env.WALRUS_PRIVATE_KEY
				? { mnemonic: process.env.WALRUS_PRIVATE_KEY }
				: [],
		},
	},
	paths: {
		sources: "./contracts",
		artifacts: "./compiled-contracts",
	},
};
