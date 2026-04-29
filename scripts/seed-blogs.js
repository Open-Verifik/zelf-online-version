require("dotenv").config();
const fs = require("fs");
const path = require("path");
const matter = require("gray-matter");
const { initMongoDB } = require("../Core/database");
const Blog = require("../Repositories/Blogs/models/blog.model");
const { resolveBlogContentDir, assertBlogContentDirExists } = require("./blog-content-dir.util.js");

const contentDir = resolveBlogContentDir();
assertBlogContentDirExists(contentDir);

const parseFrontmatter = (fileContent) => {
    try {
        const parsed = matter(fileContent);
        return { data: parsed.data, content: parsed.content };
    } catch (e) {
        console.error("Gray-matter parse error:", e);
        return { data: {}, content: fileContent };
    }
};

const getFolders = (src) => {
    return fs.readdirSync(src).filter((file) => fs.statSync(path.join(src, file)).isDirectory());
};

/** Skip repo housekeeping files accidentally named *.md */
function isBlogPostFile(filename) {
    const lower = filename.toLowerCase();
    if (lower === "readme.md" || lower === "readme.mdx") return false;
    return lower.endsWith(".md") || lower.endsWith(".mdx");
}

const seedBlogs = async () => {
    try {
        console.log("Connecting to the database...");
        const db = initMongoDB();

        db.once("open", async () => {
            console.log("Connected. Sifting through Next.js Blog folder...");

            // 1. Get all English posts
            const enFiles = fs.readdirSync(contentDir).filter(isBlogPostFile);
            let allPosts = [];

            for (const file of enFiles) {
                const fullPath = path.join(contentDir, file);
                const fileContent = fs.readFileSync(fullPath, "utf8");
                const { data, content } = parseFrontmatter(fileContent);

                const slug = file.replace(/\.mdx?$/, "");
                allPosts.push({
                    slug,
                    locale: "en",
                    title: data.title || "Untitled",
                    description: data.description || "",
                    author: data.author || "ZELF Team",
                    date: data.date ? new Date(data.date) : new Date(),
                    coverImage: data.image || "",
                    tags: Array.isArray(data.tags) ? data.tags : [],
                    published: data.published !== false,
                    markdownContent: content.trim(),
                    canonicalSlug: slug, // for English, canonical is itself
                });
            }

            // 2. Sort by date desc
            allPosts.sort((a, b) => b.date.getTime() - a.date.getTime());
            const allSlugs = allPosts.map((p) => p.slug);

            console.log(`Total English posts identified: ${allSlugs.length}`);

            // 3. Collect translations of all slugs
            const locales = getFolders(contentDir);
            let finalDocs = [...allPosts];

            for (const locale of locales) {
                const locDir = path.join(contentDir, locale);
                const lsFiles = fs.readdirSync(locDir).filter(isBlogPostFile);

                for (const file of lsFiles) {
                    const fullPath = path.join(locDir, file);
                    const fileContent = fs.readFileSync(fullPath, "utf8");
                    const { data, content } = parseFrontmatter(fileContent);
                    const slug = file.replace(/\.mdx?$/, "");

                    const canon = data.canonicalSlug;
                    if (canon && allSlugs.includes(canon)) {
                        finalDocs.push({
                            slug,
                            locale: locale,
                            title: data.title || "Untitled",
                            description: data.description || "",
                            author: data.author || "ZELF Team",
                            date: data.date ? new Date(data.date) : new Date(),
                            coverImage: data.image || "",
                            tags: Array.isArray(data.tags) ? data.tags : [],
                            published: data.published !== false,
                            markdownContent: content.trim(),
                            canonicalSlug: canon,
                        });
                    }
                }
            }

            console.log(`Found ${finalDocs.length} total blogs and translation variants.`);

            if (finalDocs.length === 0) {
                const allowEmpty = process.env.ALLOW_EMPTY_BLOG_SEED === "1" || process.env.ALLOW_EMPTY_BLOG_SEED === "true";
                if (!allowEmpty) {
                    console.error("\nNo .md/.mdx posts found — nothing to import. Database was not modified.");
                    console.error(`Source folder: ${contentDir}`);
                    console.error("Add English posts as *.md/*.mdx here and translations under locale subfolders.");
                    console.error("To wipe all blogs despite zero files: ALLOW_EMPTY_BLOG_SEED=1 node scripts/seed-blogs.js\n");
                    process.exit(1);
                }
                console.warn("ALLOW_EMPTY_BLOG_SEED set — wiping blog collection with 0 Markdown sources.");
            }

            console.log("Wiping existing DB blogs for a clean slate...");
            await Blog.deleteMany({});

            console.log("Inserting into MongoDB...");
            for (const doc of finalDocs) {
                // Ensure unique slug + locale per Mongo compound index
                await Blog.findOneAndUpdate({ slug: doc.slug, locale: doc.locale }, doc, { upsert: true, new: true });
            }

            console.log(`✅ Seeded ${finalDocs.length} blog document(s) into MongoDB.`);
            process.exit(0);
        });

        db.on("error", (err) => {
            console.error("Database connection error:", err);
            process.exit(1);
        });
    } catch (err) {
        console.error("Error seeding Blogs:", err);
        process.exit(1);
    }
};

seedBlogs();
