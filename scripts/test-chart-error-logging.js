#!/usr/bin/env node
/**
 * Test that chart_data errors are logged in short format (no huge Axios dump)
 * Simulates the MEnergy/Binance 400 error from the controller
 */

// Copy of logError from dataAnalytics.controller.js
const logError = (context, error) => {
	const status = error.response?.status || error.status;
	const msg =
		error.response?.data?.msg ?? error.message ?? "Unknown error";
	const shortMsg = msg.length > 80 ? msg.slice(0, 77) + "..." : msg;
	console.error(`[${context}] ${status || "Error"}: ${shortMsg}`);
};

// Simulate the exact Axios error from Binance (MEnergyUSDT)
const mockAxiosError = {
	response: {
		status: 400,
		statusText: "Bad Request",
		data: {
			code: -1100,
			msg: "Illegal characters found in parameter 'symbol'; legal range is '^[A-Z0-9-_.]{1,20}$'.",
		},
	},
	config: {
		baseURL: "https://api.binance.us/api",
		url: "/v3/klines?symbol=MEnergyUSDT&interval=1m&limit=60",
	},
};

console.log("--- Short format (what we now log): ---");
logError("chart_data", mockAxiosError);
logError("chart_data", new Error("asset_not_found"));
logError("data_analytics", Object.assign(new Error("asset_not_found"), { status: 404 }));
