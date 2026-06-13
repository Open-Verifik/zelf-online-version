/**
 * Resolves the landing app Markdown blog folder used by seed/fix scripts.
 *
 * Resolution order:
 *   1. BLOG_CONTENT_DIR — absolute path to the `content/blog` folder
 *   2. LANDING_ROOT — absolute path to the landing-zelf-nextjs repo; uses `<LANDING_ROOT>/content/blog`
 *   3. Default — `<zelf-repo>/../ai-made/landing-zelf-nextjs/content/blog` (sibling checkout)
 *
 * Example `.env` in zelf (copy from .env.example):
 *   LANDING_ROOT=/Users/miguel/ai-made/landing-zelf-nextjs
 */
const fs = require("fs");
const path = require("path");

const zelfRoot = path.join(__dirname, "..");

function resolveBlogContentDir() {
    if (process.env.BLOG_CONTENT_DIR && String(process.env.BLOG_CONTENT_DIR).trim()) {
        return path.resolve(process.env.BLOG_CONTENT_DIR.trim());
    }
    if (process.env.LANDING_ROOT && String(process.env.LANDING_ROOT).trim()) {
        return path.join(path.resolve(process.env.LANDING_ROOT.trim()), "content", "blog");
    }
    return path.join(zelfRoot, "..", "ai-made", "landing-zelf-nextjs", "content", "blog");
}

function assertBlogContentDirExists(contentDir) {
    if (!fs.existsSync(contentDir)) {
        console.error(`Blog content directory not found:\n  ${contentDir}\n`);
        console.error("Create it (see landing repo content/blog), or set:");
        console.error('  LANDING_ROOT="/path/to/landing-zelf-nextjs"   # uses …/content/blog');
        console.error('  BLOG_CONTENT_DIR="/path/to/landing-zelf-nextjs/content/blog"\n');
        process.exit(1);
    }
}

module.exports = {
    resolveBlogContentDir,
    assertBlogContentDirExists,
};
