#!/usr/bin/env node
/**
 * Deploy ZelfBlockDagPay: compiles with `npx solc@0.8.20` via **standard JSON** so we can set
 * `evmVersion` (default **paris**). Default solcjs CLI bytecode targets Shanghai and uses **PUSH0**;
 * BlockDAG's public RPC historically failed `estimateGas` with `invalid opcode: PUSH0` on pre-Shanghai nodes.
 *
 * Uses the same deployer secret as other tag checkout deploys:
 *   - AVALANCHE_PRIVATE_KEY — hex key or BIP39 mnemonic
 *
 * Treasury defaults to production Zelf checkout address (same as Avalanche); override with ZELF_CHECKOUT_TREASURY.
 *
 * Optional:
 *   - BLOCKDAG_RPC_URL (defaults to public RPC)
 *   - BLOCKDAG_CHAIN_ID (default 1404)
 *   - ZELF_CHECKOUT_TREASURY — override treasury (defaults to production address below)
 *   - BLOCKDAG_SOLC_EVM_VERSION — passed to solc `settings.evmVersion` (default `paris`; try `london` if needed)
 *
 * Usage (from zelf repo root):
 *   npm run deploy:checkout-blockdag
 *
 * Compile only:
 *   DRY_RUN=1 npm run deploy:checkout-blockdag
 */

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const zelfRoot = path.resolve(__dirname, "../..");
const checkoutRoot = path.resolve(__dirname, "..");

require("dotenv").config({ path: path.join(zelfRoot, ".env"), override: true });

const { ethers } = require("ethers");

const DEFAULT_RPC = "https://rpc.bdagscan.com";

/** Production Zelf checkout treasury — matches deploy-zelf-avalanche-pay.js */
const DEFAULT_TREASURY = "0x6d1e134efb40f25f4Fb4A63AAD0415b8C466a690";

const ABI = [
    "constructor(address _treasury)",
    "function pay(bytes32 paymentId, string tagFull) payable",
    "function treasury() view returns (address)",
    "event Paid(bytes32 indexed paymentId, address indexed payer, uint256 amount, string tagFull)",
];

const SOURCE_KEY = "ZelfBlockDagPay.sol";

function compile() {
    const solFile = path.join(checkoutRoot, "src", "ZelfBlockDagPay.sol");
    if (!fs.existsSync(solFile)) {
        throw new Error(`Missing ${solFile}`);
    }

    const source = fs.readFileSync(solFile, "utf8");
    const evmVersion = (process.env.BLOCKDAG_SOLC_EVM_VERSION || "paris").trim() || "paris";

    const standardInput = {
        language: "Solidity",
        sources: {
            [SOURCE_KEY]: { content: source },
        },
        settings: {
            optimizer: { enabled: true, runs: 200 },
            evmVersion,
            modelChecker: { engine: "none" },
            outputSelection: {
                "*": {
                    "*": ["evm.bytecode"],
                },
            },
        },
    };

    const rawOut = execFileSync("npx", ["--yes", "solc@0.8.20", "--standard-json"], {
        cwd: checkoutRoot,
        input: JSON.stringify(standardInput),
        encoding: "utf8",
        maxBuffer: 32 * 1024 * 1024,
    });

    const jsonStart = rawOut.indexOf("{");
    if (jsonStart < 0) {
        throw new Error(`solc --standard-json produced no JSON. Output:\n${rawOut.slice(0, 2000)}`);
    }

    const output = JSON.parse(rawOut.slice(jsonStart));

    if (output.errors) {
        const fatal = output.errors.filter((e) => e.severity === "error");
        if (fatal.length) {
            throw new Error(
                "solc errors:\n" + fatal.map((e) => e.formattedError || e.message).join("\n"),
            );
        }
    }

    const contractOut = output.contracts?.[SOURCE_KEY]?.ZelfBlockDagPay?.evm?.bytecode?.object;
    if (!contractOut || typeof contractOut !== "string") {
        throw new Error("solc output missing contracts[ZelfBlockDagPay.sol].ZelfBlockDagPay.evm.bytecode.object");
    }

    const hex = contractOut.startsWith("0x") ? contractOut : "0x" + contractOut;
    if (hex.length <= 2) {
        throw new Error("solc returned empty bytecode");
    }

    return hex;
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

    const evmVersion = (process.env.BLOCKDAG_SOLC_EVM_VERSION || "paris").trim() || "paris";
    console.log(`Compiling ZelfBlockDagPay.sol (solc@0.8.20 standard-json, evmVersion=${evmVersion})…`);
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

    const chainId = Number(process.env.BLOCKDAG_CHAIN_ID || 1404);
    const rpcUrl = process.env.BLOCKDAG_RPC_URL || DEFAULT_RPC;

    const provider = new ethers.JsonRpcProvider(rpcUrl, chainId);
    const wallet = walletFromDeploySecret(process.env.AVALANCHE_PRIVATE_KEY, provider);

    const treasuryRaw = (process.env.ZELF_CHECKOUT_TREASURY || DEFAULT_TREASURY).trim();
    const treasury = ethers.getAddress(treasuryRaw.toLowerCase());

    console.log("Network:", {
        chainId,
        rpcUrl: rpcUrl.replace(/\/\/.*@/, "//***@"),
        treasury,
        deployer: wallet.address,
    });

    const secretNorm = normalizeSecret(process.env.AVALANCHE_PRIVATE_KEY);
    if (secretNorm && !isHexPrivateKey(secretNorm)) {
        console.log("Using BIP39 mnemonic; HD path:", process.env.AVALANCHE_HD_PATH || "m/44'/60'/0'/0/0");
    }

    const balance = await provider.getBalance(wallet.address);
    console.log("Deployer:", wallet.address, "balance (wei):", balance.toString());

    const factory = new ethers.ContractFactory(ABI, bytecode, wallet);
    const contract = await factory.deploy(treasury);
    console.log("Tx sent:", contract.deploymentTransaction().hash);
    await contract.waitForDeployment();
    const address = await contract.getAddress();
    console.log("\nDeployed ZelfBlockDagPay at:", address);
    console.log("\nSet on the API server:");
    console.log(`  BLOCKDAG_TAG_PAY_CONTRACT_ADDRESS=${address}`);
    console.log(`  BLOCKDAG_CHAIN_ID=${chainId}`);
    console.log(`  BLOCKDAG_RPC_URL=<same RPC you used>`);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
