#!/usr/bin/env node
/**
 * Migrate / refresh ANT undername records for arweave.net routing.
 *
 * ANT records store undername -> transactionId. Gateways (arweave.net vs arweave.zelf.world)
 * read those records; re-broadcasting refreshes caches after decommissioning your node.
 *
 * Prerequisites:
 *   - .env with ARWAVE_* wallet fields, ARNS_PROCESS_ID, ARNS_INDEX_TRANSACTION_ID
 *   - Wallet must control the ANT process
 *
 * Usage:
 *   node scripts/migrate-arns-undernames.mjs                    # dry-run all records
 *   node scripts/migrate-arns-undernames.mjs --list             # inventory only
 *   node scripts/migrate-arns-undernames.mjs --execute          # write on-chain
 *   node scripts/migrate-arns-undernames.mjs --execute --filter migueltrevino
 *   node scripts/migrate-arns-undernames.mjs --execute --only-stale
 *   node scripts/migrate-arns-undernames.mjs --execute --delay-ms 3000
 */

import { createRequire } from "module";

const require = createRequire(import.meta.url);
require("dotenv").config();

const {
	listRecordsForMigration,
	migrateAllUndernameRecords,
} = require("../Repositories/Arweave/modules/ar-io-arns-migration.module");

const args = process.argv.slice(2);
const execute = args.includes("--execute");
const listOnly = args.includes("--list");
const onlyStale = args.includes("--only-stale");
const noBase = args.includes("--no-base");

const filterIdx = args.indexOf("--filter");
const filter = filterIdx >= 0 ? args[filterIdx + 1] || "" : "";

const delayIdx = args.indexOf("--delay-ms");
const delayMs = delayIdx >= 0 ? Number(args[delayIdx + 1]) || 2000 : 2000;

const printInventory = (rows) => {
	console.log("\nrecordKey".padEnd(28), "domain".padEnd(8), "needsUpdate".padStart(11), "primaryUrl");
	console.log("-".repeat(100));
	for (const row of rows) {
		if (row.recordKey === "@") continue;
		console.log(
			row.recordKey.padEnd(28),
			row.domain.padEnd(8),
			String(row.needsUpdate).padStart(11),
			row.primaryUrl || "(base @)"
		);
	}
	console.log(`\nTotal: ${rows.length} records (${rows.filter((r) => r.needsUpdate).length} stale tx ids)\n`);
};

(async () => {
	try {
		const inventory = await listRecordsForMigration();
		const filtered = filter
			? inventory.filter((row) => row.recordKey.toLowerCase().includes(filter.toLowerCase()))
			: inventory;

		if (listOnly) {
			printInventory(filtered);
			return;
		}

		console.log(execute ? "EXECUTE MODE — writing ANT records on-chain" : "DRY RUN — pass --execute to broadcast");
		if (filter) console.log("Filter:", filter);
		if (onlyStale) console.log("Only stale transaction ids");
		console.log("Delay between txs:", delayMs, "ms\n");

		const report = await migrateAllUndernameRecords({
			dryRun: !execute,
			delayMs,
			filter,
			onlyStale,
			includeBase: !noBase,
		});

		for (const row of report.results) {
			const prefix = row.status === "error" ? "ERR" : row.status.toUpperCase();
			console.log(
				`${prefix}`.padEnd(8),
				row.recordKey.padEnd(26),
				row.transactionId?.slice(0, 12) + "...",
				row.primaryUrl || "",
				row.error ? `— ${row.error}` : ""
			);
		}

		console.log("\nSummary:", {
			dryRun: report.dryRun,
			planned: report.planned,
			updated: report.updated,
			skipped: report.skipped,
		});

		if (!execute) {
			console.log("\nRun with --execute to broadcast these ANT updates.");
		}
	} catch (error) {
		console.error("Migration failed:", error?.message || error);
		process.exit(1);
	}
})();
