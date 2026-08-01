const config = require("../../../Core/config");
const { deriveAptosAccount } = require("../../Wallet/modules/aptos");
const { getAptosClient, normalizeAptosAddress, toAptosUpstreamError, withAptosTimeout } = require("./aptos-client");
const { aptosFeeFromGas, decimalToAtomicString } = require("./aptos-format.util");

const simulationError = (simulation) => {
    const error = new Error(`aptos_transaction_simulation_failed:${simulation?.vm_status || "unknown"}`);
    error.status = 422;
    return error;
};

const buildTransfer = async ({ fromAddress, toAddress, amountApt }) => {
    const aptos = getAptosClient();
    const sender = normalizeAptosAddress(fromAddress);
    const recipient = normalizeAptosAddress(toAddress);
    const amountOctas = decimalToAtomicString(amountApt);
    const transaction = await withAptosTimeout(
        aptos.transferCoinTransaction({
            sender,
            recipient,
            amount: amountOctas,
        }),
        "build_transfer"
    );

    return { amountOctas, aptos, recipient, sender, transaction };
};

const simulateTransfer = async ({ aptos, transaction, signerPublicKey }) => {
    const [simulation] = await withAptosTimeout(
        aptos.transaction.simulate.simple({
            transaction,
            signerPublicKey,
            options: {
                estimateGasUnitPrice: true,
            },
        }),
        "simulate_transfer"
    );

    if (!simulation?.success) throw simulationError(simulation);
    return simulation;
};

const buildAndSimulateTransfer = async (params, signerPublicKey) => {
    let lastError;

    for (let attempt = 0; attempt < 3; attempt += 1) {
        const transfer = await buildTransfer(params);

        try {
            const simulation = await simulateTransfer({ ...transfer, signerPublicKey });
            return { ...transfer, simulation };
        } catch (exception) {
            lastError = exception;
            if (!String(exception.message || "").includes("SEQUENCE_NUMBER_TOO_OLD")) throw exception;
        }
    }

    throw lastError;
};

const formatEstimate = ({ amountApt, amountOctas, recipient, sender, simulation }) => {
    const gas = aptosFeeFromGas(simulation.gas_used, simulation.gas_unit_price);
    const maxGas = aptosFeeFromGas(simulation.max_gas_amount, simulation.gas_unit_price);

    return {
        amountApt: String(amountApt),
        amountOctas,
        estimatedFeeApt: gas.feeApt,
        estimatedFeeOctas: gas.feeOctas,
        from: sender,
        gasUnitPriceOctas: String(simulation.gas_unit_price || "0"),
        gasUsed: String(simulation.gas_used || "0"),
        maxFeeApt: maxGas.feeApt,
        maxFeeOctas: maxGas.feeOctas,
        maxGasAmount: String(simulation.max_gas_amount || "0"),
        network: String(config.aptos?.network || "mainnet"),
        success: true,
        to: recipient,
        vmStatus: simulation.vm_status || "Executed successfully",
    };
};

const estimateTransfer = async ({ fromAddress, toAddress, amountApt }) => {
    try {
        const transfer = await buildAndSimulateTransfer({ fromAddress, toAddress, amountApt });
        return formatEstimate({ ...transfer, amountApt });
    } catch (exception) {
        if (exception?.status >= 400 && exception.status < 500) throw exception;
        throw toAptosUpstreamError(exception, "aptos_transfer_estimation_failed");
    }
};

/**
 * Build, simulate, sign and submit a native APT transfer.
 * This authenticated compatibility flow is intended for clients already using
 * the backend secure channel. Browser extensions must sign locally instead.
 */
const sendTransfer = async ({ mnemonic, toAddress, amountApt, waitForConfirmation = false }) => {
    try {
        const account = deriveAptosAccount(mnemonic);
        const transfer = await buildAndSimulateTransfer(
            {
                fromAddress: account.accountAddress.toStringLong(),
                toAddress,
                amountApt,
            },
            account.publicKey
        );
        const estimate = formatEstimate({ ...transfer, amountApt });
        const pending = await withAptosTimeout(
            transfer.aptos.signAndSubmitTransaction({ signer: account, transaction: transfer.transaction }),
            "submit_transfer"
        );

        const shouldWait = waitForConfirmation === true || waitForConfirmation === "true";
        let committed = null;

        if (shouldWait) {
            committed = await withAptosTimeout(
                transfer.aptos.waitForTransaction({
                    transactionHash: pending.hash,
                    options: {
                        checkSuccess: true,
                        timeoutSecs: Math.max(Math.ceil((Number(config.aptos?.timeoutMs) || 30000) / 1000), 1),
                        waitForIndexer: false,
                    },
                }),
                "confirm_transfer"
            );
        }

        return {
            ...estimate,
            status: committed ? "success" : "pending",
            success: committed ? committed.success !== false : true,
            txHash: pending.hash,
            version: committed?.version || null,
        };
    } catch (exception) {
        if (exception?.status >= 400 && exception.status < 500) throw exception;
        throw toAptosUpstreamError(exception, "aptos_transfer_failed");
    }
};

module.exports = {
    buildTransfer,
    buildAndSimulateTransfer,
    estimateTransfer,
    formatEstimate,
    sendTransfer,
    simulateTransfer,
};
