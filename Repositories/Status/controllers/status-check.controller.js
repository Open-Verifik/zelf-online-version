const Module = require("../modules/status-check.module");

/**
 * GET /api/status — latest status for each endpoint
 */
const getLatest = async (ctx) => {
	try {
		const { suite, environment } = ctx.request.query;

		const results = await Module.getLatestPerEndpoint({ suite, environment });

		ctx.body = { data: results };
	} catch (error) {
		ctx.status = error.status || 500;
		ctx.body = { error: error.message };
	}
};

/**
 * GET /api/status/failures — current failures only
 */
const getFailures = async (ctx) => {
	try {
		const { suite } = ctx.request.query;

		const results = await Module.getCurrentFailures({ suite });

		ctx.body = { data: results };
	} catch (error) {
		ctx.status = error.status || 500;
		ctx.body = { error: error.message };
	}
};

/**
 * GET /api/status/run/:runId — all results from a specific run
 */
const getRunResults = async (ctx) => {
	try {
		const { runId } = ctx.params;

		const results = await Module.getRunResults(runId);

		ctx.body = { data: results };
	} catch (error) {
		ctx.status = error.status || 500;
		ctx.body = { error: error.message };
	}
};

/**
 * GET /api/status/history/:endpoint — history timeline for an endpoint
 */
const getEndpointHistory = async (ctx) => {
	try {
		const endpoint = decodeURIComponent(ctx.params.endpoint);
		const { limit } = ctx.request.query;

		const results = await Module.getEndpointHistory(endpoint, {
			limit: limit ? parseInt(limit, 10) : 48,
		});

		ctx.body = { data: results };
	} catch (error) {
		ctx.status = error.status || 500;
		ctx.body = { error: error.message };
	}
};

module.exports = {
	getLatest,
	getFailures,
	getRunResults,
	getEndpointHistory,
};
