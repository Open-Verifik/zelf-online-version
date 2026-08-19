/**
 * Error helper for zSend.
 *
 * `Core/http-handler.errorHandler` parses `"<status>:<detail>"` by splitting on
 * ":" and only accepts exactly two parts, and its status switch has no `410`
 * case. So reasons must stay colon-free and statuses must be ones it maps.
 */
const SUPPORTED_STATUSES = [400, 401, 403, 404, 405, 408, 409, 412, 413, 422, 423, 429, 451, 500, 502, 503, 504];

/**
 * Throw an error the shared handler can turn into a clean HTTP response.
 * @param {number} status
 * @param {string} reason snake_case, no colons
 */
const fail = (status, reason) => {
	const safeReason = String(reason || "request_failed").replace(/:/g, "_");
	const safeStatus = SUPPORTED_STATUSES.includes(status) ? status : 500;

	const error = new Error(`${safeStatus}:${safeReason}`);
	error.status = safeStatus;

	throw error;
};

module.exports = {
	SUPPORTED_STATUSES,
	fail,
};
