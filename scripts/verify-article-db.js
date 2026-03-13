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

        const slug = "bitcoin-erases-election-gains-analysis";
        console.log(`Fetching article by slug: ${slug}...`);

        const article = await ArticleModule.getBySlug(slug);

        if (!article) {
            console.error("Article not found!");
            process.exit(1);
        }

        console.log("Article found:");
        console.log("Title:", article.title);
        console.log("Description:", article.description);
        console.log("Date:", article.date);
        console.log("Author:", article.author);
        console.log("Cover Image:", article.coverImage);
        console.log("Tags:", article.tags);
        console.log("Published:", article.published);
        console.log("Content length:", article.markdownContent.length);
        console.log("Content preview:", article.markdownContent.substring(0, 100));

        process.exit(0);
    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
};

main();
