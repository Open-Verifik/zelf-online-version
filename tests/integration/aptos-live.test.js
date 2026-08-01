const { Aptos, AptosConfig, Network } = require("@aptos-labs/ts-sdk");
const ScrappingModule = require("../../Repositories/Aptos/modules/aptos-scrapping.module");
const TransferModule = require("../../Repositories/Aptos/modules/aptos-transfer.module");

const ACTIVE_MAINNET_ADDRESS = "0x041972b6755d06cc9129ab6b6a772aaca1061c8585ef3c15bddbc144bd05a63c";

describe("Aptos live integration", () => {
    jest.setTimeout(120000);

    it("reads the official testnet ledger and gas endpoint without an API key", async () => {
        const aptos = new Aptos(new AptosConfig({ network: Network.TESTNET, clientConfig: { http2: false } }));
        const [ledger, gas] = await Promise.all([aptos.getLedgerInfo(), aptos.getGasPriceEstimation()]);

        expect(ledger.chain_id).toBe(2);
        expect(Number(gas.gas_estimate)).toBeGreaterThan(0);
    });

    it("returns a mainnet dashboard, fungible assets and transaction history", async () => {
        const dashboard = await ScrappingModule.getAddress({ id: ACTIVE_MAINNET_ADDRESS });

        expect(dashboard.address).toBe(ACTIVE_MAINNET_ADDRESS);
        expect(Array.isArray(dashboard.tokenHoldings.tokens)).toBe(true);
        expect(dashboard.tokenHoldings.tokens.find((token) => token.symbol === "APT")).toBeDefined();
        expect(Array.isArray(dashboard.transactions)).toBe(true);
        expect(dashboard.transactions.length).toBeGreaterThan(0);

        const detail = await ScrappingModule.getTransaction({ id: dashboard.transactions[0].hash });
        expect(detail.hash).toBe(dashboard.transactions[0].hash);
        expect(["success", "pending"]).toContain(detail.status);
    });

    it("estimates a real native transfer without signing or broadcasting", async () => {
        const estimate = await TransferModule.estimateTransfer({
            fromAddress: ACTIVE_MAINNET_ADDRESS,
            toAddress: "0x1",
            amountApt: "0.00000001",
        });

        expect(estimate.success).toBe(true);
        expect(BigInt(estimate.gasUsed)).toBeGreaterThan(0n);
        expect(BigInt(estimate.estimatedFeeOctas)).toBeGreaterThan(0n);
    });
});
