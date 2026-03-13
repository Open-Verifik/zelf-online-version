require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config({ path: "../../../.env" });

const PRIVATE_KEY = process.env.WALRUS_PRIVATE_KEY;
let accounts = [];

if (PRIVATE_KEY) {
    const trimmedKey = PRIVATE_KEY.trim();
    // Check if it's a mnemonic (contains spaces)
    if (trimmedKey.includes(" ")) {
        accounts = {
            mnemonic: trimmedKey,
            path: "m/44'/60'/0'/0", // Standard BIP44 path for Ethereum/EVM
            initialIndex: 0,
            count: 1,
        };
    } else {
        accounts = [trimmedKey];
    }
}

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
    solidity: "0.8.20",
    networks: {
        blockdag: {
            url: "https://rpc.bdagscan.com",
            chainId: 1404,
            accounts: accounts,
        },
    },
};
