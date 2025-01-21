const Model = require("../models/super-admin.model");
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
	const apiKey = `su_${crypto.randomBytes(12).toString("hex").slice(0, 24)}`;

	const superAdmin = new Model({
		name: data.name || "NA",
		status: data.status || "joined",
		avatar: data.avatar || null,
		countryCode: data.countryCode,
		phone: data.phone,
		email: data.email,
		active: true,
		apiKey,
	});

	await superAdmin.save();

	return {
		...superAdmin._doc,
		apiKey,
	};
};

const update = async (data, authUser) => {};

const destroy = async (data, authUser) => {};

const auth = async (data, authUser) => {
	const { apiKey, email } = data;

	const superAdmin = await get({
		where_email: email,
		findOne: true,
	});

	if (!superAdmin) throw new Error("404");

	const isKeyValid = await superAdmin.isValidApiKey(apiKey);

	if (!isKeyValid) throw new Error("403");

	return {
		token: jwt.sign(
			{
				superAdminId: superAdmin._id,
				exp: moment().add(365, "day").unix(),
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
