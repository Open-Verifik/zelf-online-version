const { v4: uuidv4 } = require("uuid");
const ApiStatusRecord = require("../models/status-check.model");

/**
 * Parse a test name into HTTP method + path
 * e.g. "GET /zelf-ids/search — should search for an existing tag"
 * e.g. "should complete: lease a Zelf ID, decrypt it, then delete it"
 */
const parseEndpointFromTestName = (fullName) => {
    const httpMethods = ["GET", "POST", "PUT", "PATCH", "DELETE"];

    for (const method of httpMethods) {
        const regex = new RegExp(`${method}\\s+(/[\\w\\-/]+)`);
        const match = fullName.match(regex);

        if (match) {
            return { httpMethod: method, path: match[1] };
        }
    }

    // Infer from keywords if no explicit method/path in name
    if (fullName.toLowerCase().includes("lease") && fullName.toLowerCase().includes("decrypt")) {
        return { httpMethod: "POST", path: "/lifecycle" };
    }

    if (fullName.toLowerCase().includes("delete")) {
        return { httpMethod: "DELETE", path: "/delete" };
    }

    if (fullName.toLowerCase().includes("lease")) {
        return { httpMethod: "POST", path: "/lease" };
    }

    if (fullName.toLowerCase().includes("parity") || fullName.toLowerCase().includes("identical")) {
        return { httpMethod: "GET", path: "/parity-check" };
    }

    return { httpMethod: "GET", path: "/unknown" };
};

/**
 * Save individual test results from Jest JSON output
 * @param {Object} params
 * @param {string} params.suite - Test suite name (e.g., "zelf-ids")
 * @param {string} params.environment - Environment label
 * @param {Object} params.jestResults - Parsed Jest --json output
 * @returns {Object} - { runId, records, passed, failed, total }
 */
const saveTestResults = async ({ suite, environment, jestResults }) => {
    const runId = uuidv4();
    const { testResults } = jestResults;

    const records = [];

    for (const suiteResult of testResults) {
        for (const test of suiteResult.assertionResults || []) {
            const { httpMethod, path } = parseEndpointFromTestName(test.fullName || test.title);

            const record = {
                endpoint: test.fullName || test.title,
                httpMethod,
                path: path.startsWith("/") ? `/api${path}` : `/api/${suite}/${path}`,
                suite,
                runId,
                environment,
                status: test.status === "passed" ? "passed" : "failed",
                duration: test.duration || 0,
                failureMessage: test.failureMessages?.length ? test.failureMessages.join("\n") : undefined,
                serverPort: parseInt(process.env.PORT, 10) || 3000,
                nodeVersion: process.version,
            };

            records.push(record);
        }
    }

    const saved = await ApiStatusRecord.insertMany(records);

    const passed = saved.filter((r) => r.status === "passed").length;
    const failed = saved.filter((r) => r.status === "failed").length;

    return { runId, records: saved, passed, failed, total: saved.length };
};

/**
 * Save an error record when the test runner itself fails
 */
const saveRunnerError = async ({ suite, environment, errorMessage }) => {
    const runId = uuidv4();

    const record = await ApiStatusRecord.create({
        endpoint: `${suite} — runner error`,
        httpMethod: "GET",
        path: `/api/${suite}/runner-error`,
        suite,
        runId,
        environment,
        status: "failed",
        duration: 0,
        failureMessage: errorMessage,
        serverPort: parseInt(process.env.PORT, 10) || 3000,
        nodeVersion: process.version,
    });

    return { runId, records: [record], passed: 0, failed: 1, total: 1 };
};

/**
 * Get latest status for each endpoint (for the status page overview)
 * @param {Object} [filters]
 * @param {string} [filters.suite] - Filter by suite
 * @param {string} [filters.environment] - Filter by environment
 * @returns {Array} - One record per endpoint with its latest status
 */
const getLatestPerEndpoint = async (filters = {}) => {
    const match = {};

    if (filters.suite) match.suite = filters.suite;
    if (filters.environment) match.environment = filters.environment;

    const results = await ApiStatusRecord.aggregate([
        { $match: match },
        { $sort: { createdAt: -1 } },
        {
            $group: {
                _id: "$endpoint",
                latestRecord: { $first: "$$ROOT" },
            },
        },
        { $replaceRoot: { newRoot: "$latestRecord" } },
        { $sort: { suite: 1, path: 1 } },
    ]);

    return results;
};

/**
 * Get availability history for a specific endpoint
 * @param {string} endpoint - Endpoint name
 * @param {Object} [options]
 * @param {number} [options.limit=48] - Number of records (48 = 24h at 30min intervals)
 * @returns {Array}
 */
const getEndpointHistory = async (endpoint, options = {}) => {
    const { limit = 48 } = options;

    const results = await ApiStatusRecord.find({ endpoint })
        .sort({ createdAt: -1 })
        .limit(limit)
        .select("status duration createdAt failureMessage")
        .lean();

    return results;
};

/**
 * Get all results from a specific run
 * @param {string} runId
 * @returns {Array}
 */
const getRunResults = async (runId) => {
    const results = await ApiStatusRecord.find({ runId }).sort({ path: 1 }).lean();

    return results;
};

/**
 * Get current failures (latest check failed)
 * @param {Object} [filters]
 * @param {string} [filters.suite] - Filter by suite
 * @returns {Array} - Endpoints whose latest check is "failed"
 */
const getCurrentFailures = async (filters = {}) => {
    const latestResults = await getLatestPerEndpoint(filters);

    return latestResults.filter((r) => r.status === "failed");
};

module.exports = {
    saveTestResults,
    saveRunnerError,
    getLatestPerEndpoint,
    getEndpointHistory,
    getRunResults,
    getCurrentFailures,
};
