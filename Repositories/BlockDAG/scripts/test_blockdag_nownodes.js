const axios = require("axios");
const dotenv = require("dotenv");
const path = require("path");

// Load .env from the project root
dotenv.config({ path: "/Users/miguel/zelf/.env" });

const apiKey = process.env.BLOCKDAG_NOW_NODES_API_KEY;

if (!apiKey) {
    console.error("Error: BLOCKDAG_NOW_NODES_API_KEY not found in .env");
    process.exit(1);
}

const nownodesUrl = "https://bdag.nownodes.io";

async function testConnection() {
    console.log(`Connecting to NowNodes BlockDAG at ${nownodesUrl}...`);
    try {
        const response = await axios.post(
            nownodesUrl,
            {
                jsonrpc: "2.0",
                method: "eth_blockNumber",
                params: [],
                id: 1,
            },
            {
                headers: {
                    "Content-Type": "application/json",
                    "api-key": apiKey,
                },
            },
        );

        if (response.data && response.data.result) {
            const blockNumber = parseInt(response.data.result, 16);
            console.log("Successfully connected to BlockDAG Mainnet via NowNodes!");
            console.log("Current Block Number:", blockNumber);
            console.log("Full Response:", JSON.stringify(response.data, null, 2));
        } else {
            console.error("Connection successful but unexpected response format:", response.data);
        }
    } catch (error) {
        console.error("Connection failed:");
        if (error.response) {
            console.error("Status:", error.response.status);
            console.error("Data:", error.response.data);
        } else {
            console.error("Message:", error.message);
        }

        // Try fallback URL format if needed
        console.log("\nTrying alternate URL format (append API key to URL)...");
        try {
            const altUrl = `https://bdag.nownodes.io/${apiKey}`;
            const response = await axios.post(
                altUrl,
                {
                    jsonrpc: "2.0",
                    method: "eth_blockNumber",
                    params: [],
                    id: 1,
                },
                {
                    headers: { "Content-Type": "application/json" },
                },
            );
            if (response.data && response.data.result) {
                const blockNumber = parseInt(response.data.result, 16);
                console.log("Successfully connected to BlockDAG Mainnet via NowNodes (URL style)!");
                console.log("Current Block Number:", blockNumber);
            } else {
                console.error("Alternate connection failed as well:", response.data);
            }
        } catch (altError) {
            console.error("Alternate connection failed.");
            if (altError.response) {
                console.error("Status:", altError.response.status);
                console.error("Data:", altError.response.data);
            } else {
                console.error("Message:", altError.message);
            }
        }
    }
}

testConnection();
