/**
 * Solana transaction helpers — HTTP-only confirmation (no WebSocket signatureSubscribe).
 *
 * Replaces @solana/web3.js sendAndConfirmTransaction which opens a WebSocket
 * signatureSubscribe subscription and polls getBlockHeight every second.
 * That pattern easily blows past QuickNode rate limits (50/s, 150/min).
 *
 * This module sends via sendRawTransaction then polls getSignatureStatuses
 * with exponential backoff until the desired commitment is reached.
 *
 * Rate-limit protection:
 *   - Detects QuickNode -32007 (50/s) and -32008 (150/min) errors.
 *   - Backs off automatically when rate-limited instead of burning retries.
 *   - Global mutex so concurrent callers go one-at-a-time (avoids parallel storms).
 */

const DEFAULTS = {
	commitment: "confirmed",
	maxRetries: 5,
	skipPreflight: false,
	preflightCommitment: "confirmed",
	pollIntervalMs: 1500,
	pollMaxIntervalMs: 5000,
	pollBackoffMultiplier: 1.3,
	pollMaxAttempts: 10,
	timeoutMs: 90_000,
};

const RATE_LIMIT_CODES = new Set([-32007, -32008]);
const RATE_LIMIT_BACKOFF_MS = 15_000;

// ---------------------------------------------------------------------------
// Global mutex — serialises all Solana sends so concurrent reward flows
// (daily, referral, purchase) don't hit the RPC in parallel.
// ---------------------------------------------------------------------------
let _queue = Promise.resolve();

function _enqueue(fn) {
	const task = _queue.then(fn, fn);
	_queue = task.catch(() => {});
	return task;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Sign, send, and confirm a transaction using HTTP-only polling.
 * Serialised through a global mutex to prevent concurrent RPC storms.
 */
const sendAndConfirmViaPolling = (connection, transaction, signers, opts = {}) => {
	return _enqueue(() => _sendAndConfirmViaPolling(connection, transaction, signers, opts));
};

/**
 * Send + confirm with automatic retries.
 * Rate-limit errors get a longer back-off instead of immediately consuming a retry.
 */
const sendWithRetry = (connection, transaction, signers, opts = {}) => {
	return _enqueue(() => _sendWithRetry(connection, transaction, signers, opts));
};

// ---------------------------------------------------------------------------
// Internal implementations (run inside the mutex)
// ---------------------------------------------------------------------------

async function _sendAndConfirmViaPolling(connection, transaction, signers, opts) {
	const cfg = { ...DEFAULTS, ...opts };

	const { blockhash, lastValidBlockHeight } = await _rpcWithRateLimitRetry(
		() => connection.getLatestBlockhash(cfg.commitment)
	);
	transaction.recentBlockhash = blockhash;
	transaction.lastValidBlockHeight = lastValidBlockHeight;

	transaction.sign(...signers);

	const rawTx = transaction.serialize();

	const signature = await _rpcWithRateLimitRetry(() =>
		connection.sendRawTransaction(rawTx, {
			skipPreflight: cfg.skipPreflight,
			preflightCommitment: cfg.preflightCommitment,
			maxRetries: cfg.maxRetries,
		})
	);

	await _pollConfirmation(connection, signature, cfg);

	return signature;
}

async function _sendWithRetry(connection, transaction, signers, opts) {
	const retries = opts.retries ?? 3;

	for (let attempt = 1; attempt <= retries; attempt++) {
		try {
			return await _sendAndConfirmViaPolling(connection, transaction, signers, opts);
		} catch (error) {
			const isRateLimit = _isRateLimitError(error);
			console.error(
				`[solana-tx] attempt ${attempt}/${retries} failed${isRateLimit ? " (rate-limited)" : ""}:`,
				error.message || error
			);
			if (attempt === retries) throw error;

			const backoff = isRateLimit ? RATE_LIMIT_BACKOFF_MS : 2000 * attempt;
			console.log(`[solana-tx] waiting ${backoff / 1000}s before retry…`);
			await _sleep(backoff);
		}
	}
}

// ---------------------------------------------------------------------------
// Polling with rate-limit resilience
// ---------------------------------------------------------------------------

async function _pollConfirmation(connection, signature, cfg) {
	const deadline = Date.now() + cfg.timeoutMs;
	const maxAttempts = cfg.pollMaxAttempts || 10;
	let interval = cfg.pollIntervalMs;
	let attempt = 0;

	while (Date.now() < deadline && attempt < maxAttempts) {
		await _sleep(interval);
		attempt++;

		let status;
		try {
			const res = await connection.getSignatureStatuses([signature]);
			status = res.value && res.value[0];
		} catch (err) {
			if (_isRateLimitError(err)) {
				console.warn(`[solana-tx] poll ${attempt}/${maxAttempts}: rate-limited, backing off…`);
				await _sleep(RATE_LIMIT_BACKOFF_MS);
				continue;
			}
			throw err;
		}

		if (status) {
			if (status.err) {
				throw new Error(`Transaction ${signature} failed: ${JSON.stringify(status.err)}`);
			}
			if (_commitmentReached(status.confirmationStatus, cfg.commitment)) {
				console.log(`[solana-tx] confirmed after ${attempt} poll(s)`);
				return;
			}
			console.log(`[solana-tx] poll ${attempt}/${maxAttempts}: status=${status.confirmationStatus}, waiting for ${cfg.commitment}`);
		} else {
			console.log(`[solana-tx] poll ${attempt}/${maxAttempts}: not yet visible on-chain`);
		}

		interval = Math.min(interval * cfg.pollBackoffMultiplier, cfg.pollMaxIntervalMs);
	}

	throw new Error(
		`Transaction ${signature} was not confirmed after ${attempt} polls (${cfg.timeoutMs / 1000}s timeout)`
	);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Wrap a single RPC call: if it fails with a rate-limit code, wait and retry once.
 */
async function _rpcWithRateLimitRetry(fn) {
	try {
		return await fn();
	} catch (err) {
		if (_isRateLimitError(err)) {
			console.warn(`[solana-tx] rate-limited, waiting ${RATE_LIMIT_BACKOFF_MS / 1000}s before retry…`);
			await _sleep(RATE_LIMIT_BACKOFF_MS);
			return fn();
		}
		throw err;
	}
}

function _isRateLimitError(err) {
	if (!err) return false;
	const msg = err.message || String(err);
	if (msg.includes("429") || msg.includes("Too Many Requests")) return true;
	if (msg.includes("request limit reached")) return true;
	const code = err.code ?? err.data?.code;
	return typeof code === "number" && RATE_LIMIT_CODES.has(code);
}

function _commitmentReached(actual, desired) {
	const ORDER = { processed: 0, confirmed: 1, finalized: 2 };
	return (ORDER[actual] ?? -1) >= (ORDER[desired] ?? 1);
}

function _sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = { sendAndConfirmViaPolling, sendWithRetry };
