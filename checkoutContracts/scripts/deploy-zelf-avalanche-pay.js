#!/usr/bin/env node
/**
 * Deploy ZelfAvalanchePay without Foundry: compiles with `npx solc@0.8.20`, deploys with ethers.
 *
 * Loads zelf repo root `.env` (same as the API). Required:
 *   - AVALANCHE_PRIVATE_KEY  — either:
 *       • 64-character hex private key (optional 0x), or
 *       • BIP39 seed phrase (12+ words, spaces; wrap in quotes in .env if needed)
 *
 * Optional (defaults match Core/config.js patterns):
 *   - AVALANCHE_RPC_URL
 *   - AVALANCHE_CHAIN_ID     (43114 mainnet, 43113 Fuji)
 *   - ZELF_CHECKOUT_TREASURY (defaults to production treasury below)
 *   - AVALANCHE_TAG_PAY_USDC_ADDRESS — USDC token on that chain (defaults: mainnet Circle USDC / Fuji test USDC)
 *   - AVALANCHE_HD_PATH (optional, mnemonic only; default m/44'/60'/0'/0/0)
 *
 * Usage (from zelf repo root):
 *   node checkoutContracts/scripts/deploy-zelf-avalanche-pay.js
 *
 * Compile only (no deploy):
 *   DRY_RUN=1 node checkoutContracts/scripts/deploy-zelf-avalanche-pay.js
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const zelfRoot = path.resolve(__dirname, "../..");
const checkoutRoot = path.resolve(__dirname, "..");

require("dotenv").config({ path: path.join(zelfRoot, ".env"), override: true });

const { ethers } = require("ethers");

const DEFAULT_TREASURY = "0x6d1e134efb40f25f4Fb4A63AAD0415b8C466a690";
const DEFAULT_RPC_MAINNET = "https://api.avax.network/ext/bc/C/rpc";
const DEFAULT_RPC_FUJI = "https://api.avax-test.network/ext/bc/C/rpc";
/** Circle native USDC on Avalanche C-Chain mainnet */
const DEFAULT_USDC_MAINNET = "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E";
/** Common Fuji test USDC (bridged) — override with AVALANCHE_TAG_PAY_USDC_ADDRESS */
const DEFAULT_USDC_FUJI = "0x5425890298aed601595a70AB037cDa88a2ac42d8";

const ABI = [
    "constructor(address _treasury, address _usdc)",
    "function pay(bytes32 paymentId, string tagFull) payable",
    "function payUsdc(bytes32 paymentId, string tagFull, uint256 amount)",
    "function treasury() view returns (address)",
    "function usdc() view returns (address)",
    "event Paid(bytes32 indexed paymentId, address indexed payer, uint256 amount, string tagFull)",
];

function compile() {
    const solFile = path.join(checkoutRoot, "src", "ZelfAvalanchePay.sol");
    if (!fs.existsSync(solFile)) {
        throw new Error(`Missing ${solFile}`);
    }

    const outDir = path.join(checkoutRoot, ".solc-out");
    fs.mkdirSync(outDir, { recursive: true });

    execSync(`npx --yes solc@0.8.20 --optimize --bin -o "${outDir}" "${solFile}"`, {
        cwd: checkoutRoot,
        stdio: "inherit",
    });

    const bins = fs.readdirSync(outDir).filter((f) => f.endsWith(".bin"));
    if (!bins.length) {
        throw new Error("solc produced no .bin file under .solc-out");
    }

    // solc may emit multiple artifacts; prefer the main contract output (name pattern) or the largest .bin.
    const preferred =
        bins.find((f) => /ZelfAvalanchePay.*ZelfAvalanchePay\.bin$/i.test(f)) ||
        bins.find((f) => f.includes("ZelfAvalanchePay")) ||
        [...bins].sort(
            (a, b) =>
                fs.statSync(path.join(outDir, b)).size - fs.statSync(path.join(outDir, a)).size,
        )[0];

    const binPath = path.join(outDir, preferred);
    const buf = fs.readFileSync(binPath);

    // solc often writes raw bytecode bytes; older paths assumed ASCII hex in the file.
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

/** True if value looks like a raw secp256k1 hex key (not a mnemonic). */
function isHexPrivateKey(s) {
    const hex = s.replace(/^0x/i, "");
    return /^[0-9a-fA-F]{64}$/.test(hex);
}

function wordCount(s) {
    return s.split(/\s+/).filter(Boolean).length;
}

function walletFromAvalancheSecret(secret, provider) {
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

    console.log("Compiling ZelfAvalanchePay.sol (solc@0.8.20)…");
    const bytecode = compile();
    console.log("Bytecode length:", (bytecode.length - 2) / 2, "bytes");

    if (dryRun) {
        console.log("\nDRY_RUN=1 — skipping deploy. Set AVALANCHE_PRIVATE_KEY and run without DRY_RUN to deploy.");
        return;
    }

    if (!normalizeSecret(process.env.AVALANCHE_PRIVATE_KEY)) {
        console.error("Missing AVALANCHE_PRIVATE_KEY in .env (zelf repo root).");
        process.exit(1);
    }

    const chainId = Number(process.env.AVALANCHE_CHAIN_ID || 43114);
    const rpcUrl =
        process.env.AVALANCHE_RPC_URL ||
        (chainId === 43113 ? DEFAULT_RPC_FUJI : DEFAULT_RPC_MAINNET);

    const treasury = ethers.getAddress(
        ((process.env.ZELF_CHECKOUT_TREASURY || DEFAULT_TREASURY).trim()).toLowerCase(),
    );
    const usdcEnv = (process.env.AVALANCHE_TAG_PAY_USDC_ADDRESS || "").trim();
    const usdc =
        usdcEnv ||
        (chainId === 43113 ? DEFAULT_USDC_FUJI : DEFAULT_USDC_MAINNET);

    console.log("Network:", {
        chainId,
        rpcUrl: rpcUrl.replace(/\/\/.*@/, "//***@"),
        treasury,
        usdc,
    });

    const provider = new ethers.JsonRpcProvider(rpcUrl, chainId);
    const wallet = walletFromAvalancheSecret(process.env.AVALANCHE_PRIVATE_KEY, provider);

    const secretNorm = normalizeSecret(process.env.AVALANCHE_PRIVATE_KEY);
    if (secretNorm && !isHexPrivateKey(secretNorm)) {
        console.log("Using BIP39 mnemonic; HD path:", process.env.AVALANCHE_HD_PATH || "m/44'/60'/0'/0/0");
    }

    const balance = await provider.getBalance(wallet.address);
    console.log("Deployer:", wallet.address, "balance (wei):", balance.toString());

    const factory = new ethers.ContractFactory(ABI, bytecode, wallet);
    const contract = await factory.deploy(treasury, usdc);
    console.log("Tx sent:", contract.deploymentTransaction().hash);
    await contract.waitForDeployment();
    const address = await contract.getAddress();
    console.log("\nDeployed ZelfAvalanchePay at:", address);
    console.log("\nSet on the API server:");
    console.log(`  AVALANCHE_TAG_PAY_CONTRACT_ADDRESS=${address}`);
    console.log(`  AVALANCHE_TAG_PAY_USDC_ADDRESS=${usdc}`);
    console.log(`  AVALANCHE_CHAIN_ID=${chainId}`);
    console.log(`  AVALANCHE_RPC_URL=<same RPC you used>`);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
