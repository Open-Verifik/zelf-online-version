require("dotenv").config();
const { initMongoDB } = require("../Core/database");
const SuperAdmin = require("../Repositories/SuperAdmin/models/super-admin.model");

const seedSuperAdmin = async () => {
    try {
        console.log("Connecting to the database...");
        const db = initMongoDB();

        db.once("open", async () => {
            console.log("Connected. Seeding Super Admin...");

            const email = "miguel@zelf.world";
            
            // Check if already exists
            const existingAdmin = await SuperAdmin.findOne({ email });
            if (existingAdmin) {
                console.log(`SuperAdmin with email ${email} already exists!`);
                process.exit(0);
            }

            const Crypto = require("crypto");
            const apiKey = `su_${Crypto.randomBytes(12).toString("hex").slice(0, 24)}`;

            const superAdmin = new SuperAdmin({
                name: "Miguel Trevino",
                email: email,
                phone: "+507 62647737",
                status: "joined",
                apiKey: apiKey,
                active: true,
                language: "en"
            });

            await superAdmin.save();
            console.log(`Successfully seeded SuperAdmin: ${superAdmin.name} (${superAdmin.email})`);
            console.log(`API Key hash created successfully.`);
            
            process.exit(0);
        });

        db.on("error", (err) => {
            console.error("Database connection error:", err);
            process.exit(1);
        });

    } catch (err) {
        console.error("Error seeding Super Admin:", err);
        process.exit(1);
    }
};

seedSuperAdmin();
