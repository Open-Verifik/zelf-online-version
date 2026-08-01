const {
    buildSDKOptions,
    buildTokenProviderConfig,
    getConfigurationStatus,
    toCantonUpstreamError,
} = require("../../Repositories/Canton/modules/canton-sdk.client");

const completeConfig = {
    network: "devnet",
    ledgerApiUrl: "https://ledger.example.com",
    validatorApiUrl: "https://validator.example.com/api/validator",
    scanApiUrl: "https://scan.example.com",
    registryApiUrl: "https://validator.example.com/api/validator/v0/scan-proxy",
    authMethod: "client_credentials",
    authConfigUrl: "https://auth.example.com/.well-known/openid-configuration",
    authClientId: "client-id",
    authClientSecret: "client-secret",
    authAudience: "https://canton.network.global",
    authScope: "openid daml_ledger_api offline_access",
    allowedParties: ["alice::12201acb807c49aceaeb68b1d89bb3bea95fe740b4b0a6cca428e6a351c2450540f4"],
    allowUnboundParties: false,
};

describe("Canton SDK configuration", () => {
    it("builds OAuth client-credentials options for the official Wallet SDK", () => {
        const options = buildSDKOptions(completeConfig, "development");

        expect(options.ledgerClientUrl.href).toBe("https://ledger.example.com/");
        expect(options.auth).toEqual({
            method: "client_credentials",
            configUrl: completeConfig.authConfigUrl,
            credentials: {
                clientId: "client-id",
                clientSecret: "client-secret",
                audience: "https://canton.network.global",
                scope: "openid daml_ledger_api offline_access",
            },
        });
        expect(options.token.registries[0].href).toContain("scan-proxy");
    });

    it("rejects development-only self-signed authentication in production", () => {
        const selfSigned = {
            ...completeConfig,
            authMethod: "self_signed",
            authIssuer: "unsafe-auth",
        };

        expect(() => buildTokenProviderConfig(selfSigned, "production")).toThrow(/not_allowed_in_production/);
    });

    it("reports readiness without exposing secret values", () => {
        const status = getConfigurationStatus(completeConfig, "development");
        const serialized = JSON.stringify(status);

        expect(status.readyForReadAndPrepare).toBe(true);
        expect(status.authorization.mode).toBe("qa-allowlist");
        expect(serialized).not.toContain(completeConfig.authClientSecret);
        expect(serialized).not.toContain(completeConfig.authClientId);
    });

    it("keeps an unconfigured deployment closed", () => {
        const status = getConfigurationStatus(
            {
                network: "devnet",
                authMethod: "client_credentials",
                allowedParties: [],
                allowUnboundParties: false,
            },
            "development"
        );

        expect(status.readyForReadAndPrepare).toBe(false);
        expect(status.authorization.mode).toBe("unconfigured");
        expect(status.missing).toEqual(
            expect.arrayContaining([
                "CANTON_LEDGER_API_URL",
                "CANTON_REGISTRY_API_URL",
                "CANTON_AUTH_CLIENT_ID",
                "CANTON_AUTH_CLIENT_SECRET",
                "CANTON_AUTH_CONFIG_URL",
            ])
        );
    });

    it("maps validator authentication failures to a sanitized service error", () => {
        const error = toCantonUpstreamError({ status: 401, message: "unauthorized" }, "canton_holdings_unavailable");

        expect(error.status).toBe(503);
        expect(error.message).toBe("canton_holdings_unavailable");
    });

    it("does not treat the QA allowlist as production authorization", () => {
        const status = getConfigurationStatus(completeConfig, "production");

        expect(status.readyForReadAndPrepare).toBe(false);
        expect(status.authorization.mode).toBe("production-ownership-mapping-required");
    });
});
