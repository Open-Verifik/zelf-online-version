/**
 * One-time migration: import vault_emails.json into MongoDB.
 * Run once with: node migrate-vault-emails.js
 */
require("dotenv").config();

const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");

const MONGODB_URI = process.env.MONGODB_URI || process.env.DB_URI || process.env.MONGODB_URL;

async function run() {
    const jsonPath = path.resolve(__dirname, "data/vault_emails.json");
    if (!fs.existsSync(jsonPath)) {
        console.log("No vault_emails.json found — nothing to migrate.");
        process.exit(0);
    }

    const data = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
    const entries = Object.entries(data);
    if (entries.length === 0) {
        console.log("vault_emails.json is empty — nothing to migrate.");
        process.exit(0);
    }

    if (!MONGODB_URI) {
        console.error("❌ MONGODB_URI / DB_URI env var is not set.");
        process.exit(1);
    }

    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    const VaultLegacy = require("./models/vault-legacy.model");

    let inserted = 0, skipped = 0;
    for (const [vaultId, entry] of entries) {
        const existing = await VaultLegacy.findOne({ vaultId });
        if (existing) {
            console.log(`⏭  Skipping ${vaultId} (already in DB)`);
            skipped++;
            continue;
        }
        await VaultLegacy.create({
            vaultId,
            testatorEmail: entry.testatorEmail || null,
            lawyerEmail: entry.lawyerEmail || null,
            beneficiaryEmails: entry.beneficiaryEmails || [],
            beneficiaryTagNames: entry.beneficiaryTagNames || [],
        });
        console.log(`✅ Inserted vault ${vaultId}`);
        inserted++;
    }

    console.log(`\nMigration complete: ${inserted} inserted, ${skipped} skipped.`);

    // Rename the JSON file so it won't be re-migrated
    fs.renameSync(jsonPath, jsonPath.replace(".json", ".migrated.json"));
    console.log("📁 vault_emails.json renamed to vault_emails.migrated.json");

    await mongoose.disconnect();
    process.exit(0);
}

run().catch((err) => {
    console.error("❌ Migration failed:", err.message);
    process.exit(1);
});
