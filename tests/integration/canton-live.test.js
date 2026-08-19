const ScrappingModule = require("../../Repositories/Canton/modules/canton-scrapping.module");

const PARTY_ID = process.env.CANTON_LIVE_TEST_PARTY_ID;
const hasLiveConfiguration = Boolean(
    PARTY_ID && process.env.CANTON_LEDGER_API_URL && process.env.CANTON_REGISTRY_API_URL && process.env.CANTON_AUTH_METHOD
);
const describeLive = hasLiveConfiguration ? describe : describe.skip;

describeLive("Canton live validator integration", () => {
    jest.setTimeout(120000);

    it("authenticates, reads ledger status, and lists the configured party holdings", async () => {
        const [status, holdings] = await Promise.all([
            ScrappingModule.getStatus({ probe: true }),
            ScrappingModule.getTokens({ id: PARTY_ID }),
        ]);

        expect(status.probe.ok).toBe(true);
        expect(Number(status.probe.ledgerEnd)).toBeGreaterThanOrEqual(0);
        expect(holdings.partyId).toBe(PARTY_ID);
        expect(Array.isArray(holdings.tokens)).toBe(true);
    });
});
