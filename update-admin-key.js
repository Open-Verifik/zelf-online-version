require("dotenv").config();
const { initMongoDB } = require("./Core/database");
const SuperAdmin = require("./Repositories/SuperAdmin/models/super-admin.model");

const run = async () => {
    try {
        const db = initMongoDB();
        db.once("open", async () => {
            const email = "miguel@zelf.world";
            let admin = await SuperAdmin.findOne({ email });
            if (!admin) {
                console.log("Admin not found.");
                process.exit(1);
            }
            const knownKey = "su_frontend_test_key_123456789";
            admin.apiKey = knownKey;
            await admin.save();
            console.log("Key set to:", knownKey);
            process.exit(0);
        });
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
run();
