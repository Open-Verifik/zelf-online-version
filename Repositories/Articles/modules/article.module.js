const Model = require("../models/article.model");
const SubscriberModel = require("../../Subscribers/models/subscriber.model");
const MongoORM = require("../../../Core/mongo-orm");
const configuration = require("../../../Core/config");
const mailgun = require("../../../Core/mailgun");

const domain = "mg.zelf.world";

const landingUrl = configuration.landingUrl;
const PRODUCTION_URL = "https://zelf.world";

const MAILING_LISTS = {
    PRODUCTION: "waitinglist",
    DEV: "blogdevalias",
};

/**
 * Get articles with query support
 */
const get = async (params) => {
    const queryParams = { ...params };
    return await MongoORM.buildQuery(queryParams, Model, null, []);
};

/**
 * Create or update an article by slug
 */
const create = async (params) => {
    const existingArticle = await get({
        where_slug: params.slug,
        findOne: true,
    });

    if (existingArticle) {
        existingArticle.title = params.title || existingArticle.title;
        existingArticle.description = params.description || existingArticle.description;
        existingArticle.author = params.author || existingArticle.author;
        existingArticle.date = params.date || existingArticle.date;
        existingArticle.markdownContent = params.markdownContent || existingArticle.markdownContent;
        existingArticle.coverImage = params.coverImage || existingArticle.coverImage;
        existingArticle.tags = params.tags || existingArticle.tags;
        existingArticle.published = params.published !== undefined ? params.published : existingArticle.published;

        return await existingArticle.save();
    }

    const article = new Model({
        slug: params.slug,
        title: params.title,
        description: params.description,
        author: params.author || "ZELF Team",
        date: params.date || new Date(),
        markdownContent: params.markdownContent,
        coverImage: params.coverImage,
        tags: params.tags || [],
        published: params.published || false,
    });

    return await article.save();
};

/**
 * Get article by slug
 */
const getBySlug = async (slug) => {
    return await get({
        where_slug: slug,
        findOne: true,
    });
};

/**
 * Get all articles
 */
const getAll = async (params) => {
    return await get(params || {});
};

/**
 * Render the newsletter EJS template
 */
// _renderEmailTemplate removed as it is now internally handled by mailgun.sendCustomEmail

/**
 * Send an article to a single subscriber
 */
const sendToSubscriber = async (articleSlug, email) => {
    const article = await getBySlug(articleSlug);

    if (!article) {
        const error = new Error("Article not found");
        error.status = 404;
        throw error;
    }

    const result = await mailgun.sendCustomEmail(email, "newsletter_blog", {
        title: article.title,
        image: article.coverImage ? (article.coverImage.startsWith("http") ? article.coverImage : `${PRODUCTION_URL}${article.coverImage}`) : null,
        content: _markdownToHtml(article.markdownContent),
        url: `${landingUrl}/blog/${article.slug}`,
        sincerely: "Happy Reading,",
        subject: article.title,
        unsubscribeUrl: `${landingUrl}/unsubscribe?email=${encodeURIComponent(email)}`,
        pixelUrl: `${configuration.base_url}:${configuration.port}/api/articles/track/${article._id}/${encodeURIComponent(email)}`,
    });

    if (!result) {
        throw new Error("Failed to send email via Mailgun");
    }

    try {
        // Update article sent count
        article.emailsSent = (article.emailsSent || 0) + 1;
        await article.save();

        // Update subscriber record
        await SubscriberModel.findOneAndUpdate(
            { email },
            {
                $push: {
                    emailsReceived: {
                        articleId: article._id,
                        sentAt: new Date(),
                    },
                },
            }
        );

        return result;
    } catch (error) {
        console.error("Error sending newsletter email:", error);
        throw error;
    }
};

/**
 * Send an article to all subscribers on the newsletter list
 */
const sendToAll = async (articleSlug) => {
    const article = await getBySlug(articleSlug);

    if (!article) {
        const error = new Error("Article not found");
        error.status = 404;
        throw error;
    }

    const subscribers = await MongoORM.buildQuery(
        {
            where_lists: "newsletter",
        },
        SubscriberModel,
        null,
        []
    );

    if (!subscribers || !subscribers.length) {
        const error = new Error("No subscribers found");
        error.status = 404;
        throw error;
    }

    let sentCount = 0;
    const errors = [];

    for (const subscriber of subscribers) {
        try {
            await sendToSubscriber(articleSlug, subscriber.email);
            sentCount++;
        } catch (error) {
            errors.push({ email: subscriber.email, error: error.message });
        }
    }

    // Mark article as sent
    article.sentToAllAt = new Date();
    await article.save();

    return {
        totalSubscribers: subscribers.length,
        sentCount,
        errors,
    };
};

/**
 * Send an article to a specific alias (e.g. dev group)
 */
const sendToAlias = async (articleSlug, aliasName) => {
    const article = await getBySlug(articleSlug);

    if (!article) {
        const error = new Error("Article not found");
        error.status = 404;
        throw error;
    }

    const result = await mailgun.sendCustomEmail(`${aliasName}@${domain}`, "newsletter_blog", {
        title: article.title,
        image: article.coverImage ? (article.coverImage.startsWith("http") ? article.coverImage : `${PRODUCTION_URL}${article.coverImage}`) : null,
        content: _markdownToHtml(article.markdownContent),
        url: `${landingUrl}/blog/${article.slug}`,
        sincerely: "Happy Reading,",
        subject: article.title,
        // No unsubscribe or tracking for alias/internal list usually
    });

    if (!result) {
        throw new Error("Failed to send email to alias via Mailgun");
    }

    return result;
};

/**
 * Track email open (called when tracking pixel is loaded)
 */
const trackOpen = async (articleId, subscriberEmail) => {
    try {
        // Increment article open count
        await Model.findByIdAndUpdate(articleId, {
            $inc: { emailsOpened: 1 },
        });

        // Update subscriber's openedAt for this article
        await SubscriberModel.findOneAndUpdate(
            {
                email: subscriberEmail,
                "emailsReceived.articleId": articleId,
                "emailsReceived.openedAt": { $exists: false },
            },
            {
                $set: { "emailsReceived.$.openedAt": new Date() },
            }
        );
    } catch (error) {
        console.error("Error tracking open:", error);
    }
};

const _markdownToHtml = (markdown) => {
    // Basic Markdown to HTML converter
    if (!markdown) return "";
    return markdown
        .replace(/^### (.*$)/gim, "<h3>$1</h3>")
        .replace(/^## (.*$)/gim, "<h2>$1</h2>")
        .replace(/^# (.*$)/gim, "<h1>$1</h1>")
        .replace(/\*\*(.*)\*\*/gim, "<strong>$1</strong>")
        .replace(/\*(.*)\*/gim, "<em>$1</em>")
        .replace(/!\[(.*?)\]\((.*?)\)/gim, (match, alt, src) => {
            const finalSrc = src.startsWith("/") ? `${PRODUCTION_URL}${src}` : src;
            return `<img alt="${alt}" src="${finalSrc}" style="max-width: 100%; border-radius: 8px;" />`;
        })
        .replace(/\[(.*?)\]\((.*?)\)/gim, '<a href="$2" style="color: #FF5500; text-decoration: none;">$1</a>')
        .replace(/^\s*\n\*/gm, "<ul>\n*")
        .replace(/^(\*.+)\s*\n([^\*])/gm, "$1\n</ul>\n\n$2")
        .replace(/^\* (.*)/gm, "<li>$1</li>")
        .replace(/\n\n/gim, "<br/><br/>");
};

module.exports = {
    create,
    get,
    getBySlug,
    getAll,
    sendToSubscriber,
    sendToAll,
    sendToAlias,
    trackOpen,
    MAILING_LISTS,
};
