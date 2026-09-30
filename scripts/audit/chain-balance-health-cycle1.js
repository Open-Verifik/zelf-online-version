#!/usr/bin/env node
/**
 * Soft chain-balance health audit — cycle 1.
 *
 * Probes live API balance/tokens endpoints with stable fixture addresses
 * (ton.balance, ton.tokens, bitcoin.balance, bitcoin.txs, sui.tokens, aptos.tokens).
 *
 * Usage:
 *   PORT=3050 node scripts/audit/chain-balance-health-cycle1.js
 *
 * Requires a running API (`npm start`) and `.env` with MONGODB_URI.
 */

require("dotenv").config();

const ORIGIN = "https://test.example.com";
const API_BASE = `http://127.0.0.1:${process.env.PORT || 3050}`;

/** Stable mainnet fixture addresses for cycle-1 soft probes. */
const FIXTURES = {
    aptos: "0x041972b6755d06cc9129ab6b6a772aaca1061c8585ef3c15bddbc144bd05a63c",
    bitcoin: "bc1qzsqe0vr9dqnmhnnsd05z3uhfj23z5d8ty4v4zl",
    sui: "0x31c683e390b7ac0abb32c49c895f65f8c31995069ad96837260d4325191d5890",
    // Previous fixture EQDtFpEwcFAEcRe5mLVh2N6C0x-_hJEM7W61_JLnSF74MR3O was invalid (bad checksum; tonapi can't decode).
    ton: "EQBHyu-oZVDHRYQ1-rKlGqpHy5yAqanPBirEQNMNOmfHLotW", // tests/integration/ton-api.test.js TEST_ADDRESS
};

const PROBES = [
    {
        id: "bitcoin.balance",
        path: `/api/bitcoin/address/${FIXTURES.bitcoin}`,
        validate: (body, status) =>
            status === 200 && Number.isFinite(Number(body?.data?.balance)) ? null : "balance_missing",
    },
    {
        id: "bitcoin.txs",
        path: `/api/bitcoin/${FIXTURES.bitcoin}/transactions`,
        validate: (body, status) =>
            status === 200 && Array.isArray(body?.data?.transactions) ? null : "transactions_missing",
    },
    {
        id: "sui.tokens",
        path: `/api/sui/address/${FIXTURES.sui}/tokens?page=0&show=10`,
        validate: (body, status) =>
            status === 200 && Array.isArray(body?.data?.tokens) ? null : "no_token_payload",
    },
    {
        id: "ton.balance",
        path: `/api/ton/address/${FIXTURES.ton}`,
        validate: (body, status) =>
            status === 200 && Number.isFinite(Number(body?.data?.balance)) ? null : body?.error || `http_${status}`,
    },
    {
        id: "ton.tokens",
        path: `/api/ton/address/${FIXTURES.ton}/tokens?page=0&show=10`,
        validate: (body, status) =>
            status === 200 && Array.isArray(body?.data?.tokens) ? null : body?.error || "no_token_payload",
    },
    {
        id: "aptos.tokens",
        path: `/api/aptos/address/${FIXTURES.aptos}/tokens?page=0&show=10`,
        validate: (body, status) =>
            status === 200 && Array.isArray(body?.data?.tokens) ? null : "no_token_payload",
    },
];

async function createSession() {
    const response = await fetch(`${API_BASE}/api/sessions`, {
        method: "POST",
        headers: { Origin: ORIGIN, "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: `chain_health_cycle1_${Date.now()}` }),
    });
    if (!response.ok) {
        throw new Error(`session bootstrap failed: HTTP ${response.status}`);
    }
    const { data } = await response.json();
    if (!data?.token) {
        throw new Error("session bootstrap missing token");
    }
    return data.token;
}

async function runProbe(token, probe) {
    const started = Date.now();
    const response = await fetch(`${API_BASE}${probe.path}`, {
        headers: { Origin: ORIGIN, Authorization: `Bearer ${token}` },
    });
    let body = null;
    try {
        body = await response.json();
    } catch {
        body = {};
    }
    const reason = probe.validate(body, response.status);
    return {
        id: probe.id,
        status: reason ? "FAIL" : "PASS",
        httpStatus: response.status,
        reason,
        durationMs: Date.now() - started,
    };
}

async function main() {
    console.log(`Soft chain-balance health audit — cycle 1 (${API_BASE})`);
    const token = await createSession();
    const results = [];

    for (const probe of PROBES) {
        const result = await runProbe(token, probe);
        results.push(result);
        const suffix = result.reason ? ` — ${result.reason}` : "";
        console.log(`${result.status} ${result.id} (${result.durationMs}ms)${suffix}`);
    }

    const failed = results.filter((result) => result.status === "FAIL");
    process.exit(failed.length ? 1 : 0);
}

main().catch((error) => {
    console.error(error.message);
    process.exit(1);
});
