/**
 * Errors of the tx-notifications API. The contract answers `{ error, message }`
 * with a stable machine code, so the controller maps these instead of relying on
 * the generic http-handler.
 */
class TxNotificationsError extends Error {
    constructor(status, code, message) {
        super(message || code);
        this.name = "TxNotificationsError";
        this.status = status;
        this.code = code;
    }
}

const invalidRequest = (message) => new TxNotificationsError(400, "invalid_request", message);
const invalidSignature = (message = "signature does not match addresses.ethereum") => new TxNotificationsError(401, "invalid_signature", message);
const staleRequest = (message = "issuedAt is outside the accepted window") => new TxNotificationsError(401, "stale_request", message);
const invalidSecret = (message = "missing or wrong X-Device-Secret") => new TxNotificationsError(401, "invalid_secret", message);

module.exports = {
    TxNotificationsError,
    invalidRequest,
    invalidSecret,
    invalidSignature,
    staleRequest,
};
