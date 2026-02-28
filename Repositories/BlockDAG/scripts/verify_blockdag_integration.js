const blockdagModule = require("../modules/blockdag.module");

async function verifyIntegration() {
    const testAddress = "0x676e4983443Ed97b06E382dfd071a99860356571";

    console.log("--- Verifying Integrated BlockDAG Module ---");

    try {
        console.log("\n1. Testing getLatestBlock...");
        const latestBlock = await blockdagModule.getLatestBlock();
        console.log("Latest Block:", latestBlock);

        console.log("\n2. Testing getAddress (includes balance, price, tokens, transactions)...");
        const addressData = await blockdagModule.getAddress({ address: testAddress });
        console.log("Address:", addressData.address);
        console.log("Balance:", addressData.balance, "BDAG");
        console.log("Fiat Balance:", addressData.fiatBalance, "USD");
        console.log("Number of Tokens:", addressData.tokenHoldings.total);
        console.log("Number of Transactions:", addressData.transactions.length);

        console.log("\n3. Testing getGasTracker...");
        const gasData = await blockdagModule.getGasTracker({});
        console.log("Gas Tracker Data:", JSON.stringify(gasData, null, 2));

        console.log("\n4. Testing fetchBDAGPrice...");
        const price = await blockdagModule.fetchBDAGPrice();
        console.log("BDAG Price:", price);

        console.log("\n--- Verification Complete ---");
    } catch (error) {
        console.error("\n!!! Verification Failed !!!");
        console.error(error);
    }
}

verifyIntegration();
