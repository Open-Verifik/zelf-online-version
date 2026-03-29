#!/usr/bin/env node
/**
 * Deploy ZelfEthPay: compiles with `npx solc@0.8.20`, deploys with ethers.
 *
 * Uses the same deployer secret as Avalanche / BSC tag pay:
 *   - AVALANCHE_PRIVATE_KEY — hex key or BIP39 mnemonic
 *
 * Treasury defaults to the deployer wallet address (same EVM identity on Ethereum as on other chains).
 *
 * Optional:
 *   - ETHEREUM_RPC_URL
 *   - ETHEREUM_CHAIN_ID (1 mainnet, 11155111 Sepolia)
 *   - ZELF_CHECKOUT_TREASURY — override treasury address
 *   - ETHEREUM_TAG_PAY_USDC_ADDRESS — USDC on Ethereum
 *   - ETHEREUM_TAG_PAY_USDT_ADDRESS — USDT on Ethereum
 *   - AVALANCHE_HD_PATH — same as other deploys when using mnemonic
 *
 * Usage (from zelf repo root):
 *   npm run deploy:checkout-eth
 *
 * Compile only:
 *   DRY_RUN=1 npm run deploy:checkout-eth
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const zelfRoot = path.resolve(__dirname, "../..");
const checkoutRoot = path.resolve(__dirname, "..");

require("dotenv").config({ path: path.join(zelfRoot, ".env"), override: true });

const { ethers } = require("ethers");

const DEFAULT_RPC_MAINNET = "https://eth.llamarpc.com";
const DEFAULT_RPC_SEPOLIA = "https://rpc.sepolia.org";
/** Circle USDC on Ethereum mainnet (6 decimals) */
const DEFAULT_USDC_MAINNET = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
/** Tether USDT on Ethereum mainnet (6 decimals) */
const DEFAULT_USDT_MAINNET = "0xdAC17F958D2ee523a2206206994597C13D831ec7";
/** Sepolia — override with env for your test tokens */
const DEFAULT_USDC_SEPOLIA = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";
const DEFAULT_USDT_SEPOLIA = "0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0";

const ABI = [
    "constructor(address _treasury, address _usdc, address _usdt)",
    "function pay(bytes32 paymentId, string tagFull) payable",
    "function payUsdc(bytes32 paymentId, string tagFull, uint256 amount)",
    "function payUsdt(bytes32 paymentId, string tagFull, uint256 amount)",
    "function treasury() view returns (address)",
    "function usdc() view returns (address)",
    "function usdt() view returns (address)",
    "event Paid(bytes32 indexed paymentId, address indexed payer, uint256 amount, string tagFull)",
];

function compile() {
    const solFile = path.join(checkoutRoot, "src", "ZelfEthPay.sol");
    if (!fs.existsSync(solFile)) {
        throw new Error(`Missing ${solFile}`);
    }

    const outDir = path.join(checkoutRoot, ".solc-out-eth");
    fs.mkdirSync(outDir, { recursive: true });

    execSync(`npx --yes solc@0.8.20 --optimize --bin -o "${outDir}" "${solFile}"`, {
        cwd: checkoutRoot,
        stdio: "inherit",
    });

    const bins = fs.readdirSync(outDir).filter((f) => f.endsWith(".bin"));
    if (!bins.length) {
        throw new Error("solc produced no .bin file under .solc-out-eth");
    }

    const preferred =
        bins.find((f) => /ZelfEthPay.*ZelfEthPay\.bin$/i.test(f)) ||
        bins.find((f) => f.includes("ZelfEthPay")) ||
        [...bins].sort(
            (a, b) =>
                fs.statSync(path.join(outDir, b)).size - fs.statSync(path.join(outDir, a)).size,
        )[0];

    const binPath = path.join(outDir, preferred);
    const buf = fs.readFileSync(binPath);

    const asText = buf.toString("utf8").trim().replace(/\s+/g, "");
    if (/^[0-9a-fA-F]+$/.test(asText) && asText.length >= 2 && asText.length % 2 === 0) {
        return "0x" + asText;
    }

    if (!buf.length) {
        throw new Error(`Empty .bin file: ${preferred}`);
    }

    return "0x" + buf.toString("hex");
}

function normalizeSecret(raw) {
    if (!raw || typeof raw !== "string") return null;
    let s = raw.trim();
    if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
        s = s.slice(1, -1).trim();
    }
    return s || null;
}

function isHexPrivateKey(s) {
    const hex = s.replace(/^0x/i, "");
    return /^[0-9a-fA-F]{64}$/.test(hex);
}

function wordCount(s) {
    return s.split(/\s+/).filter(Boolean).length;
}

function walletFromDeploySecret(secret, provider) {
    const s = normalizeSecret(secret);
    if (!s) {
        throw new Error("Empty AVALANCHE_PRIVATE_KEY");
    }

    if (isHexPrivateKey(s)) {
        const pk = s.startsWith("0x") || s.startsWith("0X") ? s : "0x" + s;
        return new ethers.Wallet(pk, provider);
    }

    if (wordCount(s) >= 12) {
        try {
            const mnemonic = ethers.Mnemonic.fromPhrase(s);
            const hdPath = (process.env.AVALANCHE_HD_PATH || "m/44'/60'/0'/0/0").trim();
            const w = ethers.HDNodeWallet.fromMnemonic(mnemonic, hdPath);
            return w.connect(provider);
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            throw new Error(`Invalid BIP39 mnemonic in AVALANCHE_PRIVATE_KEY: ${msg}`);
        }
    }

    throw new Error(
        "AVALANCHE_PRIVATE_KEY must be a 64-character hex private key (with optional 0x) or a BIP39 phrase (12+ words).",
    );
}

async function main() {
    const dryRun = process.env.DRY_RUN === "1" || process.env.DRY_RUN === "true";

    console.log("Compiling ZelfEthPay.sol (solc@0.8.20)…");
    const bytecode = compile();
    console.log("Bytecode length:", (bytecode.length - 2) / 2, "bytes");

    if (dryRun) {
        console.log("\nDRY_RUN=1 — skipping deploy. Set AVALANCHE_PRIVATE_KEY and run without DRY_RUN to deploy.");
        return;
    }

    if (!normalizeSecret(process.env.AVALANCHE_PRIVATE_KEY)) {
        console.error("Missing AVALANCHE_PRIVATE_KEY in .env (zelf repo root). Same key as Avalanche / BSC tag pay deploy.");
        process.exit(1);
    }

    const chainId = Number(process.env.ETHEREUM_CHAIN_ID || 1);
    const rpcUrl =
        process.env.ETHEREUM_RPC_URL || (chainId === 11155111 ? DEFAULT_RPC_SEPOLIA : DEFAULT_RPC_MAINNET);

    const provider = new ethers.JsonRpcProvider(rpcUrl, chainId);
    const wallet = walletFromDeploySecret(process.env.AVALANCHE_PRIVATE_KEY, provider);

    const treasuryEnv = (process.env.ZELF_CHECKOUT_TREASURY || "").trim();
    const treasury = treasuryEnv ? ethers.getAddress(treasuryEnv.toLowerCase()) : wallet.address;

    const usdcEnv = (process.env.ETHEREUM_TAG_PAY_USDC_ADDRESS || "").trim();
    const usdtEnv = (process.env.ETHEREUM_TAG_PAY_USDT_ADDRESS || "").trim();
    const isSepolia = chainId === 11155111;
    const usdcRaw = usdcEnv || (isSepolia ? DEFAULT_USDC_SEPOLIA : DEFAULT_USDC_MAINNET);
    const usdtRaw = usdtEnv || (isSepolia ? DEFAULT_USDT_SEPOLIA : DEFAULT_USDT_MAINNET);
    const usdc = ethers.getAddress(usdcRaw.toLowerCase());
    const usdt = ethers.getAddress(usdtRaw.toLowerCase());

    console.log("Network:", {
        chainId,
        rpcUrl: rpcUrl.replace(/\/\/.*@/, "//***@"),
        treasury,
        deployer: wallet.address,
        usdc,
        usdt,
    });

    const secretNorm = normalizeSecret(process.env.AVALANCHE_PRIVATE_KEY);
    if (secretNorm && !isHexPrivateKey(secretNorm)) {
        console.log("Using BIP39 mnemonic; HD path:", process.env.AVALANCHE_HD_PATH || "m/44'/60'/0'/0/0");
    }

    const balance = await provider.getBalance(wallet.address);
    console.log("Deployer:", wallet.address, "balance (wei):", balance.toString());

    const factory = new ethers.ContractFactory(ABI, bytecode, wallet);
    const contract = await factory.deploy(treasury, usdc, usdt);
    console.log("Tx sent:", contract.deploymentTransaction().hash);
    await contract.waitForDeployment();
    const address = await contract.getAddress();
    console.log("\nDeployed ZelfEthPay at:", address);
    console.log("\nSet on the API server:");
    console.log(`  ETHEREUM_TAG_PAY_CONTRACT_ADDRESS=${address}`);
    console.log(`  ETHEREUM_TAG_PAY_USDC_ADDRESS=${usdc}`);
    console.log(`  ETHEREUM_TAG_PAY_USDT_ADDRESS=${usdt}`);
    console.log(`  ETHEREUM_CHAIN_ID=${chainId}`);
    console.log(`  ETHEREUM_RPC_URL=<same RPC you used>`);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
