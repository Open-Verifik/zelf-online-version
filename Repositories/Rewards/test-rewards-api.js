const axios = require("axios");

const BASE_URL = "http://localhost:3000/api/rewards";
const TEST_ZELFNAME = "testuser";

// Test configuration
const config = {
    timeout: 10000,
    headers: {
        "Content-Type": "application/json",
    },
};

// Utility function to log test results
function logTest(testName, success, data, error = null) {
    console.log(`\n${"=".repeat(50)}`);
    console.log(`🧪 Test: ${testName}`);
    console.log(`✅ Status: ${success ? "PASSED" : "FAILED"}`);

    if (success) {
        console.log("📊 Response Data:");
        console.log(JSON.stringify(data, null, 2));
    } else {
        console.log("❌ Error:");
        console.log(error?.response?.data || error?.message || "Unknown error");
    }
    console.log(`${"=".repeat(50)}`);
}

// Test 1: Daily Rewards
async function testDailyRewards() {
    console.log("\n🎯 Testing Daily Rewards Endpoint");

    try {
        // Test successful daily claim
        const response = await axios.post(
            `${BASE_URL}/daily`,
            {
                zelfName: TEST_ZELFNAME,
            },
            config
        );

        logTest("Daily Reward Claim", true, response.data);

        // Test duplicate claim (should fail)
        try {
            const duplicateResponse = await axios.post(
                `${BASE_URL}/daily`,
                {
                    zelfName: TEST_ZELFNAME,
                },
                config
            );

            logTest("Duplicate Daily Claim", false, duplicateResponse.data);
        } catch (error) {
            logTest("Duplicate Daily Claim (Expected Failure)", true, {
                status: error.response?.status,
                message: error.response?.data?.message || "Already claimed",
            });
        }
    } catch (error) {
        logTest("Daily Reward Claim", false, null, error);
    }
}

// Test 2: First Transaction Reward
async function testFirstTransactionReward() {
    console.log("\n🎯 Testing First Transaction Reward Endpoint");

    try {
        const response = await axios.post(
            `${BASE_URL}/first-transaction`,
            {
                zelfName: TEST_ZELFNAME,
            },
            config
        );

        logTest("First Transaction Reward", true, response.data);

        // Test duplicate claim
        try {
            const duplicateResponse = await axios.post(
                `${BASE_URL}/first-transaction`,
                {
                    zelfName: TEST_ZELFNAME,
                },
                config
            );

            logTest("Duplicate First Transaction Claim", false, duplicateResponse.data);
        } catch (error) {
            logTest("Duplicate First Transaction Claim (Expected Failure)", true, {
                status: error.response?.status,
                message: error.response?.data?.message || "Already claimed",
            });
        }
    } catch (error) {
        logTest("First Transaction Reward", false, null, error);
    }
}

// Test 3: Reward History
async function testRewardHistory() {
    console.log("\n🎯 Testing Reward History Endpoint");

    try {
        // Test with limit
        const response = await axios.get(`${BASE_URL}/history/${TEST_ZELFNAME}?limit=5`, config);
        logTest("Reward History with Limit", true, response.data);

        // Test without limit
        const responseNoLimit = await axios.get(`${BASE_URL}/history/${TEST_ZELFNAME}`, config);
        logTest("Reward History without Limit", true, responseNoLimit.data);
    } catch (error) {
        logTest("Reward History", false, null, error);
    }
}

// Test 4: Reward Statistics
async function testRewardStats() {
    console.log("\n🎯 Testing Reward Statistics Endpoint");

    try {
        const response = await axios.get(`${BASE_URL}/stats/${TEST_ZELFNAME}`, config);
        logTest("Reward Statistics", true, response.data);
    } catch (error) {
        logTest("Reward Statistics", false, null, error);
    }
}

// Test 5: Validation Errors
async function testValidationErrors() {
    console.log("\n🎯 Testing Validation Errors");

    const testCases = [
        {
            name: "Invalid ZelfName (too short)",
            endpoint: "/daily",
            method: "post",
            data: { zelfName: "ab" },
        },
        {
            name: "Missing ZelfName",
            endpoint: "/daily",
            method: "post",
            data: {},
        },
        {
            name: "Invalid History ZelfName",
            endpoint: "/history/invalid",
            method: "get",
            data: null,
        },
    ];

    for (const testCase of testCases) {
        try {
            const url = `${BASE_URL}${testCase.endpoint}`;
            let response;

            if (testCase.method === "post") {
                response = await axios.post(url, testCase.data, config);
            } else {
                response = await axios.get(url, config);
            }

            logTest(testCase.name, false, response.data);
        } catch (error) {
            logTest(testCase.name, true, {
                status: error.response?.status,
                message: error.response?.data?.error || error.message,
            });
        }
    }
}

// Test 6: Edge Cases
async function testEdgeCases() {
    console.log("\n🎯 Testing Edge Cases");

    try {
        // Test with ZelfName that has .zelf suffix
        const response = await axios.post(
            `${BASE_URL}/daily`,
            {
                zelfName: `${TEST_ZELFNAME}.zelf`,
            },
            config
        );

        logTest("ZelfName with .zelf suffix", true, response.data);
    } catch (error) {
        logTest("ZelfName with .zelf suffix", false, null, error);
    }
}

// Main test runner
async function runAllTests() {
    console.log("🚀 Starting Rewards API Tests");
    console.log(`📍 Base URL: ${BASE_URL}`);
    console.log(`👤 Test ZelfName: ${TEST_ZELFNAME}`);

    const startTime = Date.now();

    try {
        await testDailyRewards();
        await testFirstTransactionReward();
        await testRewardHistory();
        await testRewardStats();
        await testValidationErrors();
        await testEdgeCases();

        const endTime = Date.now();
        const duration = (endTime - startTime) / 1000;

        console.log(`\n🎉 All tests completed in ${duration.toFixed(2)} seconds`);
        console.log("📋 Check the results above for any failures");
    } catch (error) {
        console.error("💥 Test suite failed:", error.message);
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    runAllTests().catch(console.error);
}

module.exports = {
    testDailyRewards,
    testFirstTransactionReward,
    testRewardHistory,
    testRewardStats,
    testValidationErrors,
    testEdgeCases,
    runAllTests,
};
