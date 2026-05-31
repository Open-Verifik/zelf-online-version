#!/usr/bin/env node
/**
 * Benchmark Arweave GraphQL gateways for tag search latency.
 * Usage: node scripts/benchmark-arweave-gateways.mjs [tagName]
 * Example: node scripts/benchmark-arweave-gateways.mjs migueltrevino.zelf
 */

import axios from "axios";

const OWNER = process.env.ARWEAVE_OWNER || "vzrsUNMg17WFPmh73xZguPbn_cZzqnef3btvmn6-YDk";
const TAG = process.argv[2] || "migueltrevino.zelf";

const gateways = (process.env.ARWEAVE_GRAPHQL_GATEWAYS || "https://arweave.net,https://zigza.xyz,https://mipenode.pro,https://ar11.innostack.xyz,https://ardrive.net")
	.split(",")
	.map((url) => url.trim())
	.filter(Boolean);

const tags = `[{ name: "tagName", values: "${TAG}" }]`;
const legacyQuery = `{ transactions(tags: ${tags}, owners: ["${OWNER}"]) { edges { node { id } } } }`;
const advancedQuery = `{ transactions(tags: ${tags}, owners: ["${OWNER}"], sort: HEIGHT_DESC, first: 100) { edges { node { id block { height } } } } }`;

async function bench(baseUrl, query, runs = 3) {
	const times = [];
	let count = 0;
	let ok = true;
	let error = null;

	for (let i = 0; i < runs; i++) {
		const start = Date.now();
		try {
			const response = await axios.post(`${baseUrl.replace(/\/+$/, "")}/graphql`, { query }, {
				timeout: 30000,
				headers: { "Content-Type": "application/json" },
			});
			times.push(Date.now() - start);
			if (response.data?.errors?.length) {
				ok = false;
				error = response.data.errors[0].message;
			}
			count = response.data?.data?.transactions?.edges?.length ?? 0;
		} catch (err) {
			times.push(Date.now() - start);
			ok = false;
			error = err.code || err.message;
		}
		await new Promise((resolve) => setTimeout(resolve, 150));
	}

	times.sort((a, b) => a - b);
	const median = times[Math.floor(times.length / 2)];
	return { median, count, ok, error };
}

console.log(`Tag: ${TAG}`);
console.log(`Owner: ${OWNER}\n`);

for (const [label, query] of [
	["legacy", legacyQuery],
	["advanced", advancedQuery],
]) {
	console.log(`=== ${label} ===`);
	console.log("Gateway".padEnd(28), "Median".padStart(8), "Count".padStart(7), "Status");
	console.log("-".repeat(60));

	const rows = [];
	for (const gateway of gateways) {
		const result = await bench(gateway, query);
		rows.push({ gateway, ...result });
	}

	rows.sort((a, b) => {
		if (a.count === 0 && b.count > 0) return 1;
		if (b.count === 0 && a.count > 0) return -1;
		return a.median - b.median;
	});

	for (const row of rows) {
		const host = row.gateway.replace(/^https?:\/\//, "");
		const status = row.ok ? (row.count ? "OK" : "empty") : String(row.error || "ERR").slice(0, 24);
		console.log(host.padEnd(28), `${row.median}ms`.padStart(8), String(row.count).padStart(7), status);
	}
	console.log("");
}

const publicGateway = (process.env.ARWEAVE_PUBLIC_GATEWAY_URL || "https://arweave.net").replace(/\/+$/, "");
const search = await bench(gateways[0], legacyQuery, 1);
const txId = search.count ? (await axios.post(`${gateways[0].replace(/\/+$/, "")}/graphql`, { query: legacyQuery }, { timeout: 30000 })).data?.data?.transactions?.edges?.[0]?.node?.id : null;

if (txId) {
	const start = Date.now();
	try {
		await axios.get(`${publicGateway}/${txId}`, { responseType: "arraybuffer", timeout: 30000 });
		console.log(`Tx fetch via ${publicGateway}: ${Date.now() - start}ms (${txId.slice(0, 12)}...)`);
	} catch (error) {
		console.log(`Tx fetch via ${publicGateway}: FAIL ${error.message}`);
	}
}
