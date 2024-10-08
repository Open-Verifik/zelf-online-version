const Model = require("../models/client.model");
const MongoORM = require("../../../Core/mongo-orm");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const config = require("../../../Core/config");
const moment = require("moment");

const get = async (params = {}, authUser = {}) => {
	const queryParams = {
		...params,
	};

	return await MongoORM.buildQuery(queryParams, Model, null, []);
};

const show = async (params = {}, authUser = {}) => {
	let queryParams = {
		findOne: true,
		...params,
	};

	if (params.id || params._id) {
		queryParams.where__id = params.id || params._id;
	}

	if (authUser?.superAdminId) {
		queryParams.where__id = authUser.superAdminId;
	}

	return await MongoORM.buildQuery(queryParams, Model, null, populates);
};

const create = async (data, authUser) => {
	const apiKey = `client_${crypto.randomBytes(12).toString("hex").slice(0, 24)}`;

	const record = new Model({
		name: data.name || "NA",
		status: data.status || "joined",
		avatar: data.avatar || null,
		countryCode: data.countryCode,
		phone: data.phone,
		email: data.email,
		active: true,
		apiKey,
	});

	await record.save();

	return {
		...record._doc,
		apiKey,
	};
};

const update = async (data, authUser) => {};

const destroy = async (data, authUser) => {};

const auth = async (data, authUser) => {
	const { apiKey, email } = data;

	const client = await get({
		where_email: email,
		findOne: true,
	});

	if (!client) throw new Error("404");

	const isKeyValid = await client.isValidApiKey(apiKey);

	if (!isKeyValid) throw new Error("403");

	return {
		token: jwt.sign(
			{
				clientId: client._id,
				exp: moment().add(1, "day").unix(),
			},
			config.JWT_SECRET
		),
	};
};

module.exports = {
	get,
	show,
	create,
	update,
	destroy,
	auth,
};
