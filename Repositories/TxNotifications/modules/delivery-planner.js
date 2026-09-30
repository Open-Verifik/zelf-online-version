const { compareDecimal, isPositiveDecimal } = require("./amount.util");
const { NATIVE_DUST, TOKEN_DUST } = require("./networks");

/**
 * Decides which new transfers each device is told about (contract #566 §4).
 * Pure: the watcher feeds it what the adapters found this cycle.
 *
 * - A transfer reaches a device only if it happened at or after the moment that
 *   device registered the address (`since`), so seeding never announces history.
 * - Nothing older than 24 h, nothing zero or dust.
 * - One transfer (network + hash) once per device, even if two of its
 *   addresses saw it.
 * - Flood control: the oldest `maxIndividual` go out one by one, the rest are
 *   folded into a single summary push.
 */

const MAX_AGE_MS = 24 * 60 * 60 * 1000;
const FUTURE_SKEW_MS = 10 * 60 * 1000;

/** Non-zero and above the dust line; an unknown amount (Stellar merge) is allowed. */
const passesValueFilter = (transfer) => {
    if (!transfer?.hash || !transfer.network || !transfer.asset || !Number.isFinite(transfer.timestampMs)) return false;
    if (transfer.amount === null || transfer.amount === undefined) return true;
    if (!isPositiveDecimal(transfer.amount)) return false;
    const dust = transfer.native ? NATIVE_DUST[transfer.network] || "0" : TOKEN_DUST;
    return compareDecimal(transfer.amount, dust) >= 0;
};

const isInWindow = (transfer, sinceMs, now) =>
    transfer.timestampMs >= sinceMs && now - transfer.timestampMs <= MAX_AGE_MS && transfer.timestampMs <= now + FUTURE_SKEW_MS;

/**
 * @param {Map<string, object[]>} transfersByKey new transfers per watch key
 * @param {object[]} devices enabled devices ({ addresses: [{ key, since }], ... })
 * @returns {{ device, individual: object[], summarized: object[] }[]}
 */
const planDeliveries = ({ transfersByKey, devices, now = Date.now(), maxIndividual = 3 }) => {
    const plans = [];

    for (const device of devices || []) {
        const picked = [];
        const ids = new Set();

        for (const entry of device.addresses || []) {
            const transfers = transfersByKey.get(entry.key);
            if (!transfers?.length) continue;
            const sinceMs = new Date(entry.since).getTime();
            if (!Number.isFinite(sinceMs)) continue;

            for (const transfer of transfers) {
                const id = `${transfer.network}|${transfer.hash}`;
                if (ids.has(id) || !passesValueFilter(transfer) || !isInWindow(transfer, sinceMs, now)) continue;
                ids.add(id);
                picked.push(transfer);
            }
        }

        if (!picked.length) continue;

        picked.sort((a, b) => a.timestampMs - b.timestampMs || String(a.hash).localeCompare(String(b.hash)));
        plans.push({ device, individual: picked.slice(0, maxIndividual), summarized: picked.slice(maxIndividual) });
    }

    return plans;
};

/** Oldest registration time among the devices watching one account, bounded by the 24 h window. */
const minTimestampFor = (key, devices, now = Date.now()) => {
    let oldest = Infinity;
    for (const device of devices || []) {
        for (const entry of device.addresses || []) {
            if (entry.key !== key) continue;
            const since = new Date(entry.since).getTime();
            if (Number.isFinite(since) && since < oldest) oldest = since;
        }
    }
    const floor = now - MAX_AGE_MS;
    return Number.isFinite(oldest) ? Math.max(oldest, floor) : now;
};

module.exports = {
    FUTURE_SKEW_MS,
    MAX_AGE_MS,
    isInWindow,
    minTimestampFor,
    passesValueFilter,
    planDeliveries,
};
