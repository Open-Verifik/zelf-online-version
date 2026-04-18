require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { initMongoDB } = require("../Core/database");
const Blog = require("../Repositories/Blogs/models/blog.model");
const matter = require("/Users/miguel/ai-made/landing-zelf-nextjs/node_modules/gray-matter");

const contentDir = "/Users/miguel/ai-made/landing-zelf-nextjs/content/blog";

/**
 * Extract a useful description from markdown content.
 * Tries first non-empty, non-heading, non-list paragraph.
 */
function extractDescription(content, maxLen = 160) {
    const lines = content.split("\n");
    for (const line of lines) {
        const trimmed = line.trim();
        // Skip headings, empty lines, lists, images, code, HR
        if (!trimmed) continue;
        if (trimmed.startsWith("#")) continue;
        if (trimmed.startsWith("-") || trimmed.startsWith("*") || trimmed.startsWith("|")) continue;
        if (trimmed.startsWith("!") || trimmed.startsWith(">") || trimmed.startsWith("```")) continue;
        if (trimmed.startsWith("---")) continue;
        // Strip markdown bold/italic
        const clean = trimmed.replace(/\*\*(.+?)\*\*/g, "$1").replace(/\*(.+?)\*/g, "$1").replace(/\[(.+?)\]\(.+?\)/g, "$1");
        if (clean.length > 30) {
            return clean.substring(0, maxLen) + (clean.length > maxLen ? "..." : "");
        }
    }
    return "";
}

function readPost(filePath) {
    const fileContent = fs.readFileSync(filePath, "utf8");
    const { data, content } = matter(fileContent);
    return { data, content };
}

function getFilePath(slug) {
    const mdx = path.join(contentDir, slug + ".mdx");
    const md = path.join(contentDir, slug + ".md");
    if (fs.existsSync(mdx)) return mdx;
    if (fs.existsSync(md)) return md;
    return null;
}

const fixDescriptions = async () => {
    try {
        console.log("Connecting to the database...");
        const db = initMongoDB();

        db.once("open", async () => {
            console.log("Connected. Finding documents with empty descriptions...");

            const missing = await Blog.find({ $or: [{ description: "" }, { description: null }] }).select("slug locale description");
            console.log(`Found ${missing.length} docs with empty descriptions.`);

            let fixed = 0;
            let skipped = 0;

            for (const doc of missing) {
                // For non-EN, try the locale subdir first, then fall back to EN
                let filePath = null;
                if (doc.locale !== "en") {
                    const localePath = path.join(contentDir, doc.locale, doc.slug + ".mdx");
                    const localeMdPath = path.join(contentDir, doc.locale, doc.slug + ".md");
                    if (fs.existsSync(localePath)) filePath = localePath;
                    else if (fs.existsSync(localeMdPath)) filePath = localeMdPath;
                }
                // Fall back to EN source
                if (!filePath) {
                    filePath = getFilePath(doc.slug);
                }

                if (!filePath) {
                    console.log(`  SKIP [no file]: ${doc.locale}/${doc.slug}`);
                    skipped++;
                    continue;
                }

                const { data, content } = readPost(filePath);

                // If frontmatter description is non-empty, use it
                let description = (data.description || "").trim();

                // Otherwise extract from content
                if (!description) {
                    description = extractDescription(content);
                }

                if (!description) {
                    console.log(`  SKIP [no content]: ${doc.locale}/${doc.slug}`);
                    skipped++;
                    continue;
                }

                await Blog.findByIdAndUpdate(doc._id, { description });
                console.log(`  FIXED [${doc.locale}]: ${doc.slug} => "${description.substring(0, 70)}..."`);
                fixed++;
            }

            console.log(`\n✅ Fixed: ${fixed} | Skipped: ${skipped}`);
            process.exit(0);
        });

        db.on("error", (err) => {
            console.error("Database connection error:", err);
            process.exit(1);
        });
    } catch (err) {
        console.error("Error:", err);
        process.exit(1);
    }
};

fixDescriptions();
