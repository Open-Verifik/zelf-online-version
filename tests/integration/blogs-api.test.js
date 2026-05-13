// Blog Public API Integration Tests - Testing Real Running Server
// This test works with the actual running server (no mocking)
const request = require("supertest");
require("dotenv").config();

const API_BASE_URL = `http://localhost:${process.env.PORT || 3000}`;

describe("Blog Public API Integration Tests", () => {
    // ─── 1. GET /api/blogs — List all published blogs ────────────────────
    describe("1. GET /api/blogs - List all published blogs", () => {
        it("should return a list of published blogs", async () => {
            const response = await request(API_BASE_URL).get("/api/blogs");

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty("data");
            expect(Array.isArray(response.body.data)).toBe(true);
        });

        it("should support limit query param", async () => {
            const response = await request(API_BASE_URL).get("/api/blogs").query({ limit: 2 });

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body.data)).toBe(true);
            expect(response.body.data.length).toBeLessThanOrEqual(2);
        });

        it("should support where_locale query param", async () => {
            const response = await request(API_BASE_URL).get("/api/blogs").query({ where_locale: "en" });

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body.data)).toBe(true);

            // Every returned blog should be English (locale "en", null, or missing)
            response.body.data.forEach((blog) => {
                const locale = blog.locale || "en";
                expect(locale).toBe("en");
            });
        });
    });

    // ─── 2. GET /api/blogs/lang/:locale — Blogs by language (middleware) ─
    describe("2. GET /api/blogs/lang/:locale - Blogs filtered by language", () => {
        it("should return English blogs for /lang/en", async () => {
            const response = await request(API_BASE_URL).get("/api/blogs/lang/en");

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body.data)).toBe(true);

            response.body.data.forEach((blog) => {
                const locale = blog.locale || "en";
                expect(locale).toBe("en");
            });
        });

        it("should return Spanish blogs for /lang/es", async () => {
            const response = await request(API_BASE_URL).get("/api/blogs/lang/es");

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body.data)).toBe(true);

            response.body.data.forEach((blog) => {
                expect(blog.locale).toBe("es");
            });
        });

        it("should return French blogs for /lang/fr", async () => {
            const response = await request(API_BASE_URL).get("/api/blogs/lang/fr");

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body.data)).toBe(true);

            response.body.data.forEach((blog) => {
                expect(blog.locale).toBe("fr");
            });
        });

        it("should return Japanese blogs for /lang/ja", async () => {
            const response = await request(API_BASE_URL).get("/api/blogs/lang/ja");

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body.data)).toBe(true);

            response.body.data.forEach((blog) => {
                expect(blog.locale).toBe("ja");
            });
        });

        it("should return Korean blogs for /lang/ko", async () => {
            const response = await request(API_BASE_URL).get("/api/blogs/lang/ko");

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body.data)).toBe(true);

            response.body.data.forEach((blog) => {
                expect(blog.locale).toBe("ko");
            });
        });

        it("should return Portuguese blogs for /lang/pt", async () => {
            const response = await request(API_BASE_URL).get("/api/blogs/lang/pt");

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body.data)).toBe(true);

            response.body.data.forEach((blog) => {
                expect(blog.locale).toBe("pt");
            });
        });

        it("should return Chinese blogs for /lang/zh", async () => {
            const response = await request(API_BASE_URL).get("/api/blogs/lang/zh");

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body.data)).toBe(true);

            response.body.data.forEach((blog) => {
                expect(blog.locale).toBe("zh");
            });
        });

        it("should return Traditional Chinese blogs for /lang/zh-TW", async () => {
            const response = await request(API_BASE_URL).get("/api/blogs/lang/zh-TW");

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body.data)).toBe(true);

            response.body.data.forEach((blog) => {
                expect(blog.locale).toBe("zh-TW");
            });
        });

        it("should support additional query params alongside :locale", async () => {
            const response = await request(API_BASE_URL).get("/api/blogs/lang/en").query({ limit: 1 });

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body.data)).toBe(true);
            expect(response.body.data.length).toBeLessThanOrEqual(1);
        });

        it("should return 400 for an unsupported locale", async () => {
            const response = await request(API_BASE_URL).get("/api/blogs/lang/xx");

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty("error");
            expect(response.body.error).toContain("Invalid locale");
            expect(response.body.error).toContain("xx");
        });

        it("should return 400 for a numeric locale", async () => {
            const response = await request(API_BASE_URL).get("/api/blogs/lang/123");

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty("error");
            expect(response.body.error).toContain("Invalid locale");
        });
    });

    // ─── 3. GET /api/blogs/:slug — Show a single blog by slug ────────────
    describe("3. GET /api/blogs/:slug - Show single blog by slug", () => {
        let existingSlug;

        beforeAll(async () => {
            // Fetch the first available blog to get a valid slug
            const res = await request(API_BASE_URL).get("/api/blogs").query({ limit: 1 });
            if (res.body.data && res.body.data.length > 0) {
                existingSlug = res.body.data[0].slug;
            }
        });

        it("should return a single blog when a valid slug is provided", async () => {
            if (!existingSlug) {
                console.warn("No existing blog found — skipping slug show test");
                return;
            }

            const response = await request(API_BASE_URL).get(`/api/blogs/${existingSlug}`);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty("data");
            expect(response.body.data).toHaveProperty("slug", existingSlug);
            expect(response.body.data).toHaveProperty("title");
            expect(response.body.data).toHaveProperty("markdownContent");
        });

        it("should return null/empty data for a non-existent slug", async () => {
            const response = await request(API_BASE_URL).get("/api/blogs/this-slug-does-not-exist-at-all-12345");

            expect(response.status).toBe(200);
            expect(response.body.data).toBeFalsy();
        });
    });

    // ─── 4. Consistency: /lang/:locale vs ?where_locale= ─────────────────
    describe("4. Consistency between /lang/:locale and ?where_locale=", () => {
        it("should return the same results for /lang/es and ?where_locale=es", async () => {
            const [byRoute, byQuery] = await Promise.all([
                request(API_BASE_URL).get("/api/blogs/lang/es"),
                request(API_BASE_URL).get("/api/blogs").query({ where_locale: "es" }),
            ]);

            expect(byRoute.status).toBe(200);
            expect(byQuery.status).toBe(200);

            // Both should return the same count
            expect(byRoute.body.data.length).toBe(byQuery.body.data.length);

            // And the same slugs (order might match since both default to -createdAt)
            const routeSlugs = byRoute.body.data.map((b) => b.slug).sort();
            const querySlugs = byQuery.body.data.map((b) => b.slug).sort();
            expect(routeSlugs).toEqual(querySlugs);
        });
    });
});
