const Model = require("../models/subscriber.model");
const MongoORM = require("../../../Core/mongo-orm");
const configuration = require("../../../Core/config");
const mailgun = require("../../../Core/mailgun");
const axios = require("axios");

const apiKey = configuration.mailgun.apiKey;
const domain = "mg.zelf.world";
const FormData = require("form-data");

const get = async (params, authUser) => {
    const queryParams = { ...params };
    return await MongoORM.buildQuery(queryParams, Model, null, []);
};

const subscribe = async (params, authUser) => {
    const list = params.list || "waitinglist";
    const existingSubscriber = await get({
        where_email: params.email,
        findOne: true,
    });

    const subscriber =
        existingSubscriber ||
        new Model({
            email: params.email,
            name: params.name,
            lists: [list],
        });

    if (!existingSubscriber || !existingSubscriber?.lists.includes(list)) {
        // save it in mailgun
        await _addToMailgun(
            {
                name: params.name,
                email: params.email,
                subscribed: true,
                list: "waitinglist",
            },
            subscriber
        );
    }

    await sendWelcomeEmail(subscriber.email, subscriber.name, params.language);

    return await subscriber.save();
};

const _addToMailgun = async (params, subscriber) => {
    const list = params.list || "waitinglist";

    const addMemberUrl = `https://api.mailgun.net/v3/lists/${list}@${domain}/members`;

    const formData = new FormData();
    formData.append("address", subscriber.email);
    formData.append("subscribed", params.subscribed ? "true" : "false");
    formData.append("upsert", "true");

    try {
        const response = await axios.post(addMemberUrl, formData, {
            auth: {
                username: "api",
                password: apiKey,
            },
            headers: formData.getHeaders(),
        });
    } catch (exception) {
        console.error({ exception: exception?.response?.data });
    }
};

const unsubscribe = async (params, authUser) => {
    const subscriber = await get(
        {
            where_email: params.email,
            findOne: true,
        },
        authUser
    );

    if (!subscriber) throw new Error("404");

    // Store the unsubscribe reason
    if (params.reason) {
        subscriber.unsubscribeReason = params.reason;
    }

    subscriber.unsubscribedAt = new Date();

    await subscriber.save();

    await _addToMailgun(
        {
            name: subscriber.name,
            email: subscriber.email,
            list: "waitinglist",
            subscribed: false,
        },
        subscriber
    );

    return await Model.findByIdAndDelete(subscriber._id);
};

const sendWelcomeEmail = async (email, name, language = "en") => {
    try {
        await mailgun.sendCustomEmail(email, "newsletter_welcome", { recipientName: name }, language);
    } catch (error) {
        console.error("Error sending welcome email:", { error });
    }
};

module.exports = {
    get,
    subscribe,
    unsubscribe,
    sendWelcomeEmail,
};
