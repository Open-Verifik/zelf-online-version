const Model = require("../models/article.model");
const SubscriberModel = require("../../Subscribers/models/subscriber.model");
const MongoORM = require("../../../Core/mongo-orm");
const configuration = require("../../../Core/config");
const ejs = require("ejs");
const path = require("path");

const FormData = require("form-data");
const mailgun = require("mailgun.js");

const domain = "mg.zelf.world";
const apiKey = configuration.mailgun.apiKey;
const mg = new mailgun(FormData);
const mgClient = mg.client({ username: "api", key: apiKey });

const landingUrl = configuration.landingUrl;

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
const _renderEmailTemplate = async (article, subscriberEmail) => {
    const templatePath = path.join(__dirname, "../views/newsletter.ejs");

    const unsubscribeUrl = `${landingUrl}/unsubscribe?email=${encodeURIComponent(subscriberEmail)}`;
    const articleUrl = `${landingUrl}/blog/${article.slug}`;
    const trackingPixelUrl = `${configuration.base_url}:${configuration.port}/api/articles/track/${article._id}/${encodeURIComponent(subscriberEmail)}`;

    return await ejs.renderFile(templatePath, {
        article: {
            title: article.title,
            description: article.description,
            author: article.author,
            date: article.date,
            coverImage: article.coverImage,
            slug: article.slug,
        },
        unsubscribeUrl,
        articleUrl,
        trackingPixelUrl,
        landingUrl,
    });
};

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

    const html = await _renderEmailTemplate(article, email);

    const data = {
        from: "Zelf <noreply@mg.zelf.world>",
        to: email,
        subject: article.title,
        html,
    };

    try {
        const result = await mgClient.messages.create(domain, data);

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

module.exports = {
    create,
    get,
    getBySlug,
    getAll,
    sendToSubscriber,
    sendToAll,
    trackOpen,
};
