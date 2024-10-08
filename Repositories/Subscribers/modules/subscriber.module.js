const Model = require("../models/subscriber.model");
const MongoORM = require("../../../Core/mongo-orm");
const configuration = require("../../../Core/config");
const axios = require("axios");
const apiKey = configuration.mailgun.apiKey;
const domain = "mg.zelf.world";

const FormData = require("form-data");
const mailgun = require("mailgun.js");
const mg = new mailgun(FormData); // Instantiate mailgun with FormData
const mgClient = mg.client({ username: "api", key: apiKey }); // Initialize the mailgun client

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

	await sendWelcomeEmail(subscriber.email);

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

		console.log({ response: response?.data });
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

const sendWelcomeEmail = async (email) => {
	const data = {
		from: "Zelf <noreply@mg.zelf.world>",
		to: email,
		subject: "Welcome to Zelf World",
		template: "waiting list",
		"h:X-Mailgun-Variables": JSON.stringify({ test: "test" }),
	};

	try {
		const result = await mgClient.messages.create(domain, data);
		console.log({ emailSent: result });
	} catch (error) {
		console.error("Error sending email:", { error });
	}
};

module.exports = {
	subscribe,
	unsubscribe,
	sendWelcomeEmail,
};
