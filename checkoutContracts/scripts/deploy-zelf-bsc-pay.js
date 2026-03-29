#!/usr/bin/env node
/**
 * Deploy ZelfBscPay: compiles with `npx solc@0.8.20`, deploys with ethers.
 *
 * Uses the same deployer secret as Avalanche tag pay:
 *   - AVALANCHE_PRIVATE_KEY — hex key or BIP39 mnemonic (see deploy-zelf-avalanche-pay.js)
 *
 * Treasury defaults to the deployer wallet address (same EVM identity on BSC as on Avalanche).
 *
 * Optional:
 *   - BSC_RPC_URL
 *   - BSC_CHAIN_ID (56 mainnet, 97 Chapel testnet)
 *   - ZELF_CHECKOUT_TREASURY — override treasury address (defaults to deployer address)
 *   - BSC_TAG_PAY_USDC_ADDRESS — USDC on BSC (default: mainnet Binance-Peg USDC)
 *   - BSC_TAG_PAY_USDT_ADDRESS — USDT on BSC (default: mainnet Binance-Peg USDT)
 *   - AVALANCHE_HD_PATH — same as Avalanche deploy when using mnemonic
 *
 * Usage (from zelf repo root):
 *   node checkoutContracts/scripts/deploy-zelf-bsc-pay.js
 *
 * Compile only:
 *   DRY_RUN=1 node checkoutContracts/scripts/deploy-zelf-bsc-pay.js
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const zelfRoot = path.resolve(__dirname, "../..");
const checkoutRoot = path.resolve(__dirname, "..");

require("dotenv").config({ path: path.join(zelfRoot, ".env"), override: true });

const { ethers } = require("ethers");

const DEFAULT_RPC_MAINNET = "https://bsc-dataseed.binance.org";
const DEFAULT_RPC_CHAPEL = "https://data-seed-prebsc-1-s1.binance.org:8545";
/** Binance-Peg USDC on BSC mainnet (18 decimals) */
const DEFAULT_USDC_MAINNET = "0x8AC76c51cc950d9822D68b83fE1Ad97B32Cd580d";
/** Binance-Peg USDT on BSC mainnet (18 decimals) */
const DEFAULT_USDT_MAINNET = "0x55d398326f99059fF775485246999027B3197955";
/** BSC Testnet token placeholders — set BSC_TAG_PAY_USDC_ADDRESS / USDT_ADDRESS for your test tokens */
const DEFAULT_USDC_CHAPEL = "0x64544969ed7EBf5f083679233325356EbE738930";
const DEFAULT_USDT_CHAPEL = "0x337610d27c682E347C9cD60BD4b4b4A091A34D6D";

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
    const solFile = path.join(checkoutRoot, "src", "ZelfBscPay.sol");
    if (!fs.existsSync(solFile)) {
        throw new Error(`Missing ${solFile}`);
    }

    const outDir = path.join(checkoutRoot, ".solc-out-bsc");
    fs.mkdirSync(outDir, { recursive: true });

    execSync(`npx --yes solc@0.8.20 --optimize --bin -o "${outDir}" "${solFile}"`, {
        cwd: checkoutRoot,
        stdio: "inherit",
    });

    const bins = fs.readdirSync(outDir).filter((f) => f.endsWith(".bin"));
    if (!bins.length) {
        throw new Error("solc produced no .bin file under .solc-out-bsc");
    }

    const preferred =
        bins.find((f) => /ZelfBscPay.*ZelfBscPay\.bin$/i.test(f)) ||
        bins.find((f) => f.includes("ZelfBscPay")) ||
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

    console.log("Compiling ZelfBscPay.sol (solc@0.8.20)…");
    const bytecode = compile();
    console.log("Bytecode length:", (bytecode.length - 2) / 2, "bytes");

    if (dryRun) {
        console.log("\nDRY_RUN=1 — skipping deploy. Set AVALANCHE_PRIVATE_KEY and run without DRY_RUN to deploy.");
        return;
    }

    if (!normalizeSecret(process.env.AVALANCHE_PRIVATE_KEY)) {
        console.error("Missing AVALANCHE_PRIVATE_KEY in .env (zelf repo root). Same key as Avalanche tag pay deploy.");
        process.exit(1);
    }

    const chainId = Number(process.env.BSC_CHAIN_ID || 56);
    const rpcUrl =
        process.env.BSC_RPC_URL || (chainId === 97 ? DEFAULT_RPC_CHAPEL : DEFAULT_RPC_MAINNET);

    const provider = new ethers.JsonRpcProvider(rpcUrl, chainId);
    const wallet = walletFromDeploySecret(process.env.AVALANCHE_PRIVATE_KEY, provider);

    const treasuryEnv = (process.env.ZELF_CHECKOUT_TREASURY || "").trim();
    const treasury = treasuryEnv ? ethers.getAddress(treasuryEnv.toLowerCase()) : wallet.address;

    const usdcEnv = (process.env.BSC_TAG_PAY_USDC_ADDRESS || "").trim();
    const usdtEnv = (process.env.BSC_TAG_PAY_USDT_ADDRESS || "").trim();
    const usdcRaw =
        usdcEnv || (chainId === 97 ? DEFAULT_USDC_CHAPEL : DEFAULT_USDC_MAINNET);
    const usdtRaw =
        usdtEnv || (chainId === 97 ? DEFAULT_USDT_CHAPEL : DEFAULT_USDT_MAINNET);
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
    console.log("\nDeployed ZelfBscPay at:", address);
    console.log("\nSet on the API server:");
    console.log(`  BSC_TAG_PAY_CONTRACT_ADDRESS=${address}`);
    console.log(`  BSC_TAG_PAY_USDC_ADDRESS=${usdc}`);
    console.log(`  BSC_TAG_PAY_USDT_ADDRESS=${usdt}`);
    console.log(`  BSC_CHAIN_ID=${chainId}`);
    console.log(`  BSC_RPC_URL=<same RPC you used>`);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
