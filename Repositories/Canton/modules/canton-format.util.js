const CANTON_DECIMALS = 10;
const CANTON_SYMBOL = "CC";
const CANTON_INSTRUMENT_ID = "Amulet";
const PARTY_ID_PATTERN = /^[^:\s][^:]*::1220[0-9a-fA-F]{64}$/;

const clientError = (message, status = 400) => {
    const error = new Error(message);
    error.status = status;
    return error;
};

const normalizePartyId = (value) => {
    const partyId = String(value || "").trim();

    if (partyId.length > 512 || !PARTY_ID_PATTERN.test(partyId)) {
        throw clientError("canton_party_id_invalid");
    }

    return partyId;
};

const normalizeUpdateId = (value) => {
    const updateId = String(value || "").trim();

    if (!updateId || updateId.length > 512 || /[\u0000-\u001f]/.test(updateId)) {
        throw clientError("canton_update_id_invalid");
    }

    return updateId;
};

const decimalToAtomic = (value, { allowZero = true } = {}) => {
    const normalized = String(value ?? "").trim();
    const match = /^(\d+)(?:\.(\d{1,10}))?$/.exec(normalized);

    if (!match) throw clientError("canton_amount_invalid");

    const whole = match[1].replace(/^0+(?=\d)/, "");
    const fraction = (match[2] || "").padEnd(CANTON_DECIMALS, "0");
    const atomic = BigInt(whole) * 10n ** BigInt(CANTON_DECIMALS) + BigInt(fraction || "0");

    if (!allowZero && atomic === 0n) throw clientError("canton_amount_must_be_greater_than_zero");

    return atomic;
};

const atomicToDecimal = (value) => {
    const atomic = typeof value === "bigint" ? value : BigInt(value);
    const negative = atomic < 0n;
    const absolute = negative ? -atomic : atomic;
    const divisor = 10n ** BigInt(CANTON_DECIMALS);
    const whole = absolute / divisor;
    const fraction = String(absolute % divisor)
        .padStart(CANTON_DECIMALS, "0")
        .replace(/0+$/, "");
    const result = fraction ? `${whole}.${fraction}` : String(whole);

    return negative ? `-${result}` : result;
};

const normalizeCcAmount = (value, options = {}) => atomicToDecimal(decimalToAtomic(value, options));

const isHoldingLocked = (holding, now = new Date()) => {
    const lock = holding?.interfaceViewValue?.lock;
    if (!lock) return false;
    if (!lock.expiresAt) return true;

    const expiration = new Date(lock.expiresAt);
    if (Number.isNaN(expiration.getTime())) return true;

    return expiration > now;
};

const normalizeHoldings = (holdings, now = new Date()) => {
    const groups = new Map();

    for (const holding of Array.isArray(holdings) ? holdings : []) {
        const view = holding?.interfaceViewValue || {};
        const instrumentId = String(view.instrumentId?.id || "").trim();
        const admin = String(view.instrumentId?.admin || "").trim();

        if (!instrumentId || !admin) continue;

        const amount = decimalToAtomic(view.amount || "0");
        const key = `${admin}::${instrumentId}`;
        const current = groups.get(key) || {
            instrumentId,
            admin,
            totalAtomic: 0n,
            availableAtomic: 0n,
            lockedAtomic: 0n,
            utxoCount: 0,
        };

        current.totalAtomic += amount;
        current.utxoCount += 1;

        if (isHoldingLocked(holding, now)) current.lockedAtomic += amount;
        else current.availableAtomic += amount;

        groups.set(key, current);
    }

    return [...groups.values()].map((group) => {
        const isCantonCoin = group.instrumentId === CANTON_INSTRUMENT_ID;

        return {
            address_token: group.instrumentId,
            name: isCantonCoin ? "Canton Coin" : group.instrumentId,
            symbol: isCantonCoin ? CANTON_SYMBOL : group.instrumentId,
            tokenType: "CANTON_TOKEN_STANDARD",
            decimals: CANTON_DECIMALS,
            balance: atomicToDecimal(group.totalAtomic),
            availableBalance: atomicToDecimal(group.availableAtomic),
            lockedBalance: atomicToDecimal(group.lockedAtomic),
            fiatBalance: 0,
            price: 0,
            instrumentId: {
                id: group.instrumentId,
                admin: group.admin,
            },
            utxoCount: group.utxoCount,
        };
    });
};

const getMemo = (label) =>
    label?.reason ||
    label?.meta?.reason ||
    label?.meta?.values?.["splice.lfdecentralizedtrust.org/reason"] ||
    null;

const normalizeEvent = (transaction, event, partyId) => {
    const label = event?.label || {};
    const base = {
        updateId: transaction.updateId,
        offset: transaction.offset,
        recordTime: transaction.recordTime,
        synchronizerId: transaction.synchronizerId,
        status: "confirmed",
        fee: normalizeCcAmount(label.burnAmount || "0"),
        memo: getMemo(label),
        rawType: label.type || "Unknown",
    };

    if (label.type === "TransferIn") {
        return [
            {
                ...base,
                type: "transfer",
                direction: "in",
                from: label.sender || null,
                to: partyId,
                amount: normalizeCcAmount(event?.unlockedHoldingsChangeSummary?.amountChange || "0"),
                instrumentId: CANTON_INSTRUMENT_ID,
            },
        ];
    }

    if (label.type === "TransferOut") {
        return (Array.isArray(label.receiverAmounts) ? label.receiverAmounts : []).map((receiver) => ({
            ...base,
            type: "transfer",
            direction: "out",
            from: partyId,
            to: receiver.receiver || null,
            amount: normalizeCcAmount(receiver.amount || "0"),
            instrumentId: CANTON_INSTRUMENT_ID,
        }));
    }

    return [
        {
            ...base,
            type: String(label.type || "unknown").toLowerCase(),
            direction: "self",
            from: partyId,
            to: partyId,
            amount: "0",
            instrumentId: CANTON_INSTRUMENT_ID,
        },
    ];
};

const normalizeTransactions = (response, partyId) => {
    const normalizedPartyId = normalizePartyId(partyId);
    const transactions = Array.isArray(response?.transactions) ? response.transactions : [];

    return {
        nextOffset: Number(response?.nextOffset || 0),
        transactions: transactions.flatMap((transaction) =>
            (Array.isArray(transaction.events) ? transaction.events : []).flatMap((event) =>
                normalizeEvent(transaction, event, normalizedPartyId)
            )
        ),
    };
};

const normalizeTransaction = (transaction, partyId) => {
    const normalizedPartyId = normalizePartyId(partyId);

    return {
        updateId: transaction?.updateId || null,
        offset: transaction?.offset,
        recordTime: transaction?.recordTime,
        synchronizerId: transaction?.synchronizerId,
        status: "confirmed",
        events: (Array.isArray(transaction?.events) ? transaction.events : []).flatMap((event) =>
            normalizeEvent(transaction, event, normalizedPartyId)
        ),
    };
};

module.exports = {
    CANTON_DECIMALS,
    CANTON_INSTRUMENT_ID,
    CANTON_SYMBOL,
    PARTY_ID_PATTERN,
    atomicToDecimal,
    decimalToAtomic,
    isHoldingLocked,
    normalizeCcAmount,
    normalizeHoldings,
    normalizePartyId,
    normalizeTransaction,
    normalizeTransactions,
    normalizeUpdateId,
};
