const config = require("../../../Core/config");
const { decodePreparedTransaction, hashPreparedTransaction } = require("@canton-network/core-tx-visualizer");
const { normalizeCcAmount, normalizePartyId } = require("./canton-format.util");
const { getCantonSDK, toCantonUpstreamError, withCantonTimeout } = require("./canton-sdk.client");

const normalizePreparedTransaction = (value) => {
    if (!value || typeof value !== "object") {
        const error = new Error("canton_prepared_transaction_invalid");
        error.status = 400;
        throw error;
    }

    const preparedTransaction = String(value.preparedTransaction || "").trim();
    const preparedTransactionHash = String(value.preparedTransactionHash || "").trim();

    if (!preparedTransaction || !preparedTransactionHash) {
        const error = new Error("canton_prepared_transaction_invalid");
        error.status = 400;
        throw error;
    }

    return {
        ...value,
        preparedTransaction,
        preparedTransactionHash,
    };
};

const normalizeSignature = (value) => {
    const signature = String(value || "").trim();
    if (!signature || signature.length > 1024 || !/^[A-Za-z0-9+/_-]+={0,2}$/.test(signature)) {
        const error = new Error("canton_signature_invalid");
        error.status = 400;
        throw error;
    }
    return signature;
};

const verifyPreparedTransaction = async (value, partyId, errorStatus = 400) => {
    const prepared = normalizePreparedTransaction(value);
    const normalizedPartyId = normalizePartyId(partyId);

    try {
        const computedHash = await hashPreparedTransaction(prepared.preparedTransaction, "base64");

        if (computedHash !== prepared.preparedTransactionHash) {
            const error = new Error("canton_prepared_transaction_hash_mismatch");
            error.status = errorStatus;
            throw error;
        }

        const decoded = decodePreparedTransaction(prepared.preparedTransaction);
        const actAs = decoded?.metadata?.submitterInfo?.actAs || [];

        if (!actAs.includes(normalizedPartyId)) {
            const error = new Error("canton_prepared_transaction_party_mismatch");
            error.status = errorStatus;
            throw error;
        }

        return prepared;
    } catch (error) {
        if (String(error?.message || "").startsWith("canton_")) throw error;

        const invalid = new Error("canton_prepared_transaction_invalid");
        invalid.status = errorStatus;
        throw invalid;
    }
};

const prepareTransfer = async ({ sender, recipient, amountCc, instrumentId, memo, inputUtxos }) => {
    const normalizedSender = normalizePartyId(sender);
    const normalizedRecipient = normalizePartyId(recipient);
    const amount = normalizeCcAmount(amountCc, { allowZero: false });
    const selectedInstrument = String(instrumentId || config.canton.instrumentId || "Amulet").trim();

    try {
        const sdk = await getCantonSDK();
        const [command, disclosedContracts] = await withCantonTimeout(
            sdk.token.transfer.create({
                sender: normalizedSender,
                recipient: normalizedRecipient,
                amount,
                instrumentId: selectedInstrument,
                registryUrl: new URL(config.canton.registryApiUrl),
                inputUtxos: Array.isArray(inputUtxos) && inputUtxos.length ? inputUtxos : undefined,
                memo: memo || undefined,
            }),
            "transfer_command"
        );
        const prepared = sdk.ledger.prepare({
            partyId: normalizedSender,
            commands: command,
            disclosedContracts,
        });
        const { response } = await withCantonTimeout(prepared.toJSON(), "transfer_prepare");
        await verifyPreparedTransaction(response, normalizedSender, 502);

        return {
            sender: normalizedSender,
            recipient: normalizedRecipient,
            amount,
            instrumentId: selectedInstrument,
            preparedTransaction: response,
            signing: {
                mode: "external",
                algorithm: "Ed25519",
                hash: response.preparedTransactionHash,
                warning: "Sign and submit promptly; Canton Coin preparation references time-bound ledger state.",
            },
        };
    } catch (error) {
        throw toCantonUpstreamError(error, "canton_transfer_prepare_failed");
    }
};

const submitTransfer = async ({ partyId, preparedTransaction, signature }) => {
    const normalizedPartyId = normalizePartyId(partyId);
    const normalizedPreparedTransaction = await verifyPreparedTransaction(preparedTransaction, normalizedPartyId);
    const normalizedSignature = normalizeSignature(signature);

    try {
        const sdk = await getCantonSDK();
        const signed = sdk.ledger.fromSignature(normalizedPreparedTransaction, normalizedSignature);
        const result = await withCantonTimeout(
            sdk.ledger.execute(signed, { partyId: normalizedPartyId }),
            "transfer_submit"
        );

        return {
            partyId: normalizedPartyId,
            status: "submitted",
            ...result,
        };
    } catch (error) {
        throw toCantonUpstreamError(error, "canton_transfer_submit_failed");
    }
};

module.exports = {
    normalizePreparedTransaction,
    normalizeSignature,
    prepareTransfer,
    submitTransfer,
    verifyPreparedTransaction,
};
