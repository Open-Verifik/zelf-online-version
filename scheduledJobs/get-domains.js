require("dotenv").config();

const axios = require("../Core/axios").getCleanInstance();

const baseUrl = `http://localhost:${process.env.PORT}`;

const _run = async () => {
	try {
		// Step 1: Create a session to get a token
		const sessionIdentifier = `scheduled_job_${Date.now()}_${Math.random().toString(36).substring(7)}`;

		console.log("Creating session with identifier:", sessionIdentifier);

		const sessionResponse = await axios.post(
			`${baseUrl}/api/sessions`,
			{
				identifier: sessionIdentifier,
				isWebExtension: false,
				type: "general",
			},
			{
				headers: {
					"Content-Type": "application/json",
					Origin: "http://localhost",
					"User-Agent": "ScheduledJob/1.0",
				},
			}
		);

		if (!sessionResponse.data.data || !sessionResponse.data.data.token) {
			throw new Error("Failed to create session - no token received");
		}

		const sessionToken = sessionResponse.data.data.token;
		console.log("Session created successfully, token received");

		// Step 2: Get domains using the session token
		console.log("Fetching domains...");

		const domainsResponse = await axios.get(`${baseUrl}/api/tags/domains`, {
			headers: {
				Authorization: `Bearer ${sessionToken}`,
				"Content-Type": "application/json",
			},
		});

		console.log("Domains fetched successfully");
		return domainsResponse.data.data;
	} catch (error) {
		console.error("Error in get-domains scheduled job:", error.message);
		if (error.response) {
			console.error("Response status:", error.response.status);
			console.error("Response data:", error.response.data);
		}
		throw error;
	}
};

_run()
	.then((domains) => {
		console.info("Domains retrieved successfully:");
		console.info(domains);
	})
	.catch((error) => {
		console.error("Scheduled job failed:", error.message);
		process.exit(1);
	});
