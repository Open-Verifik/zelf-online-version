#!/usr/bin/env node
/**
 * Deploy ZelfBasePay: compiles with `npx solc@0.8.20`, deploys with ethers.
 *
 * Uses the same deployer secret as other tag pay deploys:
 *   - AVALANCHE_PRIVATE_KEY — hex key or BIP39 mnemonic
 *
 * Treasury defaults to production Zelf checkout address (same as Avalanche); override with ZELF_CHECKOUT_TREASURY.
 *
 * Optional:
 *   - BASE_RPC_URL
 *   - BASE_CHAIN_ID (8453 Base mainnet, 84532 Base Sepolia)
 *   - ZELF_CHECKOUT_TREASURY — override treasury (defaults to production address below)
 *   - BASE_TAG_PAY_USDC_ADDRESS — USDC on Base
 *   - BASE_TAG_PAY_USDT_ADDRESS — USDT on Base
 *   - AVALANCHE_HD_PATH — same as other deploys when using mnemonic
 *
 * Usage (from zelf repo root):
 *   npm run deploy:checkout-base
 *
 * Compile only:
 *   DRY_RUN=1 npm run deploy:checkout-base
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const zelfRoot = path.resolve(__dirname, "../..");
const checkoutRoot = path.resolve(__dirname, "..");

require("dotenv").config({ path: path.join(zelfRoot, ".env"), override: true });

const { ethers } = require("ethers");

const DEFAULT_RPC_MAINNET = "https://mainnet.base.org";
const DEFAULT_RPC_SEPOLIA = "https://sepolia.base.org";
/** USDC on Base mainnet (6 decimals) */
const DEFAULT_USDC_MAINNET = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
/** USDT on Base mainnet (6 decimals) */
const DEFAULT_USDT_MAINNET = "0xfde4C96cE3CaFac9F2df3573Bae2D715d34B25A0";

/** Production Zelf checkout treasury — matches deploy-zelf-avalanche-pay.js */
const DEFAULT_TREASURY = "0x6d1e134efb40f25f4Fb4A63AAD0415b8C466a690";

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
    const solFile = path.join(checkoutRoot, "src", "ZelfBasePay.sol");
    if (!fs.existsSync(solFile)) {
        throw new Error(`Missing ${solFile}`);
    }

    const outDir = path.join(checkoutRoot, ".solc-out-base");
    fs.mkdirSync(outDir, { recursive: true });

    execSync(`npx --yes solc@0.8.20 --optimize --bin -o "${outDir}" "${solFile}"`, {
        cwd: checkoutRoot,
        stdio: "inherit",
    });

    const bins = fs.readdirSync(outDir).filter((f) => f.endsWith(".bin"));
    if (!bins.length) {
        throw new Error("solc produced no .bin file under .solc-out-base");
    }

    const preferred =
        bins.find((f) => /ZelfBasePay.*ZelfBasePay\.bin$/i.test(f)) ||
        bins.find((f) => f.includes("ZelfBasePay")) ||
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

    console.log("Compiling ZelfBasePay.sol (solc@0.8.20)…");
    const bytecode = compile();
    console.log("Bytecode length:", (bytecode.length - 2) / 2, "bytes");

    if (dryRun) {
        console.log("\nDRY_RUN=1 — skipping deploy. Set AVALANCHE_PRIVATE_KEY and run without DRY_RUN to deploy.");
        return;
    }

    if (!normalizeSecret(process.env.AVALANCHE_PRIVATE_KEY)) {
        console.error("Missing AVALANCHE_PRIVATE_KEY in .env (zelf repo root). Same key as other tag pay deploy.");
        process.exit(1);
    }

    const chainId = Number(process.env.BASE_CHAIN_ID || 8453);
    const rpcUrl =
        process.env.BASE_RPC_URL || (chainId === 84532 ? DEFAULT_RPC_SEPOLIA : DEFAULT_RPC_MAINNET);

    const provider = new ethers.JsonRpcProvider(rpcUrl, chainId);
    const wallet = walletFromDeploySecret(process.env.AVALANCHE_PRIVATE_KEY, provider);

    const treasuryRaw = (process.env.ZELF_CHECKOUT_TREASURY || DEFAULT_TREASURY).trim();
    const treasury = ethers.getAddress(treasuryRaw.toLowerCase());

    const usdcEnv = (process.env.BASE_TAG_PAY_USDC_ADDRESS || "").trim();
    const usdtEnv = (process.env.BASE_TAG_PAY_USDT_ADDRESS || "").trim();
    const isMainnet = chainId === 8453;

    if (!isMainnet && chainId === 84532 && (!usdcEnv || !usdtEnv)) {
        console.error(
            "Base Sepolia (84532): set BASE_TAG_PAY_USDC_ADDRESS and BASE_TAG_PAY_USDT_ADDRESS in .env (no baked defaults for testnet stables).",
        );
        process.exit(1);
    }

    const usdcRaw = usdcEnv || (isMainnet ? DEFAULT_USDC_MAINNET : "");
    const usdtRaw = usdtEnv || (isMainnet ? DEFAULT_USDT_MAINNET : "");
    if (!usdcRaw || !usdtRaw) {
        console.error("Set BASE_TAG_PAY_USDC_ADDRESS and BASE_TAG_PAY_USDT_ADDRESS for this network.");
        process.exit(1);
    }
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
    console.log("\nDeployed ZelfBasePay at:", address);
    console.log("\nSet on the API server:");
    console.log(`  BASE_TAG_PAY_CONTRACT_ADDRESS=${address}`);
    console.log(`  BASE_TAG_PAY_USDC_ADDRESS=${usdc}`);
    console.log(`  BASE_TAG_PAY_USDT_ADDRESS=${usdt}`);
    console.log(`  BASE_CHAIN_ID=${chainId}`);
    console.log(`  BASE_RPC_URL=<same RPC you used>`);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
