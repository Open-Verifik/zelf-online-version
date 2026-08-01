const config = require("../../../Core/config");
const {
    getCantonSDK,
    getConfigurationStatus,
    toCantonUpstreamError,
    withCantonTimeout,
} = require("./canton-sdk.client");
const {
    atomicToDecimal,
    decimalToAtomic,
    normalizeHoldings,
    normalizePartyId,
    normalizeTransaction,
    normalizeTransactions,
    normalizeUpdateId,
} = require("./canton-format.util");

const getStatus = async ({ probe = false } = {}) => {
    const status = getConfigurationStatus();
    if (!probe) return status;

    if (!status.readyForReadAndPrepare) {
        const error = new Error("canton_configuration_not_ready");
        error.status = 503;
        throw error;
    }

    try {
        const sdk = await getCantonSDK();
        const [ledgerEnd, parties] = await withCantonTimeout(Promise.all([sdk.ledger.ledgerEnd(), sdk.party.list()]), "status_probe");

        return {
            ...status,
            probe: {
                ok: true,
                ledgerEnd,
                accessiblePartyCount: Array.isArray(parties) ? parties.length : 0,
            },
        };
    } catch (error) {
        throw toCantonUpstreamError(error, "canton_status_probe_failed");
    }
};

const readHoldings = async (partyId) => {
    const sdk = await getCantonSDK();
    return withCantonTimeout(
        sdk.token.utxos.list({
            partyId,
            includeLocked: true,
            continueUntilCompletion: true,
        }),
        "holdings"
    );
};

const getTokens = async ({ id }) => {
    const partyId = normalizePartyId(id);

    try {
        const holdings = await readHoldings(partyId);
        return {
            partyId,
            network: config.canton.network,
            privacyScope: "validator-party",
            tokens: normalizeHoldings(holdings),
        };
    } catch (error) {
        throw toCantonUpstreamError(error, "canton_holdings_unavailable");
    }
};

const getAddress = async ({ id }) => {
    const result = await getTokens({ id });
    const totalAvailable = result.tokens.reduce(
        (total, token) => total + decimalToAtomic(token.availableBalance || "0"),
        0n
    );

    return {
        address: result.partyId,
        partyId: result.partyId,
        network: result.network,
        privacyScope: result.privacyScope,
        account: {
            asset: "CC",
            balance: atomicToDecimal(totalAvailable),
            fiatBalance: 0,
            price: 0,
        },
        tokenHoldings: {
            totalFiatBalance: 0,
            tokens: result.tokens,
        },
        transactions: [],
        transactionsDeferred: true,
    };
};

const getTransactions = async ({ id }, query = {}) => {
    const partyId = normalizePartyId(id);
    const afterOffset = query.afterOffset === undefined ? undefined : Number(query.afterOffset);
    const beforeOffset = query.beforeOffset === undefined ? undefined : Number(query.beforeOffset);

    try {
        const sdk = await getCantonSDK();
        const response = await withCantonTimeout(
            sdk.token.holdings({ partyId, afterOffset, beforeOffset }),
            "transactions"
        );

        return {
            partyId,
            network: config.canton.network,
            ...normalizeTransactions(response, partyId),
        };
    } catch (error) {
        throw toCantonUpstreamError(error, "canton_transactions_unavailable");
    }
};

const getTransaction = async ({ id, updateId }) => {
    const partyId = normalizePartyId(id);
    const normalizedUpdateId = normalizeUpdateId(updateId);

    try {
        const sdk = await getCantonSDK();
        const transaction = await withCantonTimeout(
            sdk.token.transactionsById({ partyId, updateId: normalizedUpdateId }),
            "transaction"
        );

        return {
            partyId,
            network: config.canton.network,
            transaction: normalizeTransaction(transaction, partyId),
        };
    } catch (error) {
        throw toCantonUpstreamError(error, "canton_transaction_unavailable");
    }
};

module.exports = {
    getAddress,
    getStatus,
    getTokens,
    getTransaction,
    getTransactions,
};
