require('dotenv').config();
const fs = require('fs');
const path = require('path');

// Initialize MongoDB/Config properly if running standalone
const config = require('../../Core/config');
const { sendLawyerNewPlan } = require('./modules/email');

const DATA_DIR = path.resolve(__dirname, "data");
const EMAILS_FILE = path.join(DATA_DIR, "vault_emails.json");

function loadJSON(filePath) {
    try {
        if (fs.existsSync(filePath)) return JSON.parse(fs.readFileSync(filePath, "utf8"));
    } catch { }
    return {};
}

async function run() {
    console.log("📨 Manually executing pending 'new plan' emails...");
    const emails = loadJSON(EMAILS_FILE);

    // In this script we'll just check all registered emails and send them
    // a "new plan" notification if there's a lawyer assigned.
    for (const [vaultId, entry] of Object.entries(emails)) {
        if (entry.lawyerEmail) {
            console.log(`[${vaultId}] -> lawyer: ${entry.lawyerEmail}`);
            // Note: We don't have the exact testatorAddress here, so we put a placeholder or derive it.
            // Since this is just a notification, the address doesn't break the app, but let's use a dummy or skip
            const testatorAddress = "0xYourWalletAddress (check Zelf App)";
            try {
                await sendLawyerNewPlan(entry.lawyerEmail, vaultId, testatorAddress);
                console.log(`✅ Success for ${vaultId}`);
            } catch (err) {
                console.error(`❌ Failed for ${vaultId}:`, err.details || err.message || err);
            }
        }
    }
    console.log("Done.");
}

run();
