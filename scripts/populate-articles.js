const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const configuration = require("../Core/config");
const ArticleModule = require("../Repositories/Articles/modules/article.module");

// Assuming blog content is located here relative to the script execution folder
const BLOG_CONTENT_DIR = path.join(__dirname, "../../ai-made/landing-zelf-nextjs/content/blog");

const parseMDX = (content) => {
    const frontmatterRegex = /^---\n([\s\S]*?)\n---/;
    const match = content.match(frontmatterRegex);
    let frontmatter = {};
    let body = content;

    if (match) {
        const yaml = match[1];
        // Remove frontmatter from content, leaving just the markdown body
        body = content.replace(match[0], "").trim();

        yaml.split("\n").forEach((line) => {
            const [key, ...value] = line.split(":");
            if (key && value) {
                // Handle basic YAML values (strings, dates)
                // Note: For arrays like tags, a simple split won't work perfectly if updates are needed,
                // but this regex-based approach is often sufficient for simple flat structures.
                // However, the frontmatter in the example file has tags as a list.
                // Let's improve parsing slightly or use a library if this gets complex.
                // For now, let's implement a basic line-by-line parser that handles simple keys.
                // Complex nested structures (like tags list) might need more care.
                // Re-implementing a quick parser below for the specific format.
            }
        });
    }

    // Better YAML parser for the specific format we saw
    const lines = match ? match[1].split("\n") : [];
    const result = {};
    let currentCtx = null; // for array context

    lines.forEach((line) => {
        if (!line.trim()) return;

        // Check if it's an array item (indented with -)
        if (line.trim().startsWith("- ") && currentCtx) {
            const val = line.trim().substring(2).trim();
            if (!result[currentCtx]) result[currentCtx] = [];
            result[currentCtx].push(val);
            return;
        }

        const parts = line.split(":");
        const key = parts[0].trim();
        const value = parts.slice(1).join(":").trim();

        if (value === "") {
            // It might be starting an array context (e.g. "tags:")
            currentCtx = key;
            result[key] = [];
        } else {
            // It's a key-value pair
            currentCtx = null;
            // Remove quotes if present
            let cleanValue = value;
            if ((cleanValue.startsWith("'") && cleanValue.endsWith("'")) || (cleanValue.startsWith('"') && cleanValue.endsWith('"'))) {
                cleanValue = cleanValue.slice(1, -1);
            }
            // Handle multi-line strings indicator (>-) roughly by just taking the first line for now
            // or we can accumulate. The example uses >- for description.
            if (value === ">-") {
                // This is a multi-line string start.
                // A simple parser might struggle here without lookahead.
                // Let's assume description is on the next lines.
                // For this specific script, let's keep it simple.
                currentCtx = key + "_multiline";
                result[key] = "";
            } else {
                result[key] = cleanValue;
            }
        }
    });

    return { frontmatter: result, body };
};

// Use a proper library if possible, but for a script without adding deps,
// let's try to withstand the specific format of the user's files.
// Actually, let's use a robust approach for the specific file provided.
const parseFrontmatterParams = (content) => {
    const frontmatterRegex = /^---\n([\s\S]*?)\n---/;
    const match = content.match(frontmatterRegex);
    if (!match) return { frontmatter: {}, body: content };

    const yamlStr = match[1];
    const body = content.replace(match[0], "").trim();

    // We can use a simple regex for each expected field since we know the schema
    const extract = (key) => {
        const regex = new RegExp(`^${key}:\\s*(.+)$`, "m");
        const m = yamlStr.match(regex);
        return m ? m[1].trim().replace(/^['"]|['"]$/g, "") : null;
    };

    // special handling for tags array
    const tags = [];
    const tagsMatch = yamlStr.match(/tags:\s*\n((?:\s+-\s+.+\n?)+)/);
    if (tagsMatch) {
        const tagsBlock = tagsMatch[1];
        tagsBlock.split("\n").forEach((t) => {
            const trimmed = t.trim();
            if (trimmed.startsWith("- ")) {
                tags.push(trimmed.substring(2));
            }
        });
    }

    // special handling for multi-line description (>-)
    // simplistic approach: just grab the text between "description: >-" and "date:"
    let description = extract("description");
    if (yamlStr.includes("description: >-")) {
        const descMatch = yamlStr.match(/description: >-\n([\s\S]*?)(?=\n[a-z]+:)/);
        if (descMatch) {
            description = descMatch[1].replace(/\n\s+/g, " ").trim();
        }
    }

    const frontmatter = {
        title: extract("title"),
        description,
        date: extract("date"),
        author: extract("author"),
        image: extract("image"),
        published: extract("published") === "true",
        tags,
    };

    return { frontmatter, body };
};

const main = async () => {
    try {
        await mongoose.connect(configuration.db.uri, {
            ...configuration.db.options,
            ssl: true, // often needed for cloud mongo
        });
        console.log("Connected to MongoDB");

        // Check if specific file is requested or do all
        const files = fs.readdirSync(BLOG_CONTENT_DIR).filter((f) => f.endsWith(".mdx"));

        for (const file of files) {
            const filePath = path.join(BLOG_CONTENT_DIR, file);
            console.log(`Processing ${file}...`);

            const content = fs.readFileSync(filePath, "utf8");
            const { frontmatter, body } = parseFrontmatterParams(content);

            const slug = file.replace(".mdx", "");

            // Validate required fields
            if (!frontmatter.title) {
                console.warn(`Skipping ${file}: Missing title`);
                continue;
            }

            const articleData = {
                slug,
                title: frontmatter.title,
                description: frontmatter.description,
                author: frontmatter.author,
                date: frontmatter.date ? new Date(frontmatter.date) : new Date(),
                markdownContent: body,
                coverImage: frontmatter.image,
                tags: frontmatter.tags,
                published: frontmatter.published,
            };

            await ArticleModule.create(articleData);
            console.log(`Saved article: ${slug}`);
        }

        console.log("Done!");
        process.exit(0);
    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
};

main();
