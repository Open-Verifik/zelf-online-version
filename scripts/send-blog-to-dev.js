const mongoose = require("mongoose");
const configuration = require("../Core/config");
const ArticleModule = require("../Repositories/Articles/modules/article.module");

const main = async () => {
    try {
        await mongoose.connect(configuration.db.uri, {
            ...configuration.db.options,
            ssl: true,
        });
        console.log("Connected to MongoDB");

        const slug = "bitcoin-erases-election-gains-analysis"; // The article we know exists
        console.log(`Sending article "${slug}" to dev alias...`);

        // Use the constant if exported or just hardcode for this script to verify the function
        const aliasName = ArticleModule.MAILING_LISTS.DEV;

        console.log(`Using alias: ${aliasName}`);

        const result = await ArticleModule.sendToAlias(slug, aliasName);

        console.log("Email sent successfully:", result);
        process.exit(0);
    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
};

main();
