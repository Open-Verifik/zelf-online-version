#!/usr/bin/env node
/**
 * Test script for Stellar API endpoints
 * Run: node scripts/test-stellar-api.js
 * Requires: server running (npm start), PORT in .env or default 3000
 */
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const request = require("supertest");

const API_BASE = process.env.API_BASE || `http://localhost:${process.env.PORT || 3050}`;
const TEST_ADDRESS = "GDIIMZDAGJKV7CIQDKEV4ICMDCDY5PDZPBPTH3UYUFFELVGPUAWUFD7W";

async function main() {
    console.log("=== Stellar API Test ===\n");
    console.log("API Base:", API_BASE);
    console.log("Test Address:", TEST_ADDRESS);
    console.log("");

    // 1. Create session to get JWT
    console.log("1. Creating session...");
    const sessionRes = await request(API_BASE)
        .post("/api/sessions")
        .set("Origin", "https://test.example.com")
        .send({
            identifier: `stellar_test_${Date.now()}`,
            type: "general",
        });

    if (sessionRes.status !== 200) {
        console.error("Session creation failed:", sessionRes.status, sessionRes.body);
        process.exit(1);
    }

    const token = sessionRes.body?.data?.token;
    if (!token) {
        console.error("No token in session response:", sessionRes.body);
        process.exit(1);
    }
    console.log("   Token obtained\n");

    const authHeader = { Authorization: `Bearer ${token}` };

    // 2. GET /api/stellar/address/:id
    console.log("2. GET /api/stellar/address/:id");
    const addressRes = await request(API_BASE)
        .get(`/api/stellar/address/${TEST_ADDRESS}`)
        .set(authHeader)
        .set("Origin", "https://test.example.com");

    console.log("   Status:", addressRes.status);
    if (addressRes.status === 200) {
        console.log("   Response structure:");
        console.log(JSON.stringify(addressRes.body, null, 2));
    } else {
        console.log("   Error:", addressRes.body);
    }
    console.log("");

    // 3. GET /api/stellar/address/:id/transactions
    console.log("3. GET /api/stellar/address/:id/transactions");
    const txListRes = await request(API_BASE)
        .get(`/api/stellar/address/${TEST_ADDRESS}/transactions`)
        .query({ limit: 5 })
        .set(authHeader)
        .set("Origin", "https://test.example.com");

    console.log("   Status:", txListRes.status);
    if (txListRes.status === 200) {
        console.log("   Response structure:");
        console.log(JSON.stringify(txListRes.body, null, 2));
    } else {
        console.log("   Error:", txListRes.body);
    }
    console.log("");

    // 4. If we have a tx hash, test transaction detail
    const firstTxHash = addressRes.body?.data?.transactions?.[0]?.hash;
    if (firstTxHash) {
        console.log("4. GET /api/stellar/transaction/:id");
        const txDetailRes = await request(API_BASE)
            .get(`/api/stellar/transaction/${firstTxHash}`)
            .set(authHeader)
            .set("Origin", "https://test.example.com");

        console.log("   Status:", txDetailRes.status);
        if (txDetailRes.status === 200) {
            console.log("   Response (first 500 chars):");
            const str = JSON.stringify(txDetailRes.body);
            console.log(str.substring(0, 500) + (str.length > 500 ? "..." : ""));
        } else {
            console.log("   Error:", txDetailRes.body);
        }
    }

    console.log("\n=== Done ===");
}

main().catch((err) => {
    console.error("Error:", err.message);
    process.exit(1);
});
