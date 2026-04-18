const Model = require("../models/blog.model");
const MongoORM = require("../../../Core/mongo-orm");

const get = async (params = {}, authUser = {}) => {
	const queryParams = {
		...params,
	};

	// Default: only return published posts unless includeDrafts is explicitly set
	if (!params.includeDrafts && !params.where_published) {
		queryParams.where_published = true;
	}

	return await MongoORM.buildQuery(queryParams, Model, null, []);
};

const show = async (params = {}, authUser = {}) => {
	const query = {};

	if (params.id || params._id) {
		return await Model.findById(params.id || params._id);
	}

	if (params.slug) {
		query.slug = params.slug;
	}

	if (params.where_slug) {
		query.slug = params.where_slug;
	}

	if (params.where_locale) {
		query.locale = params.where_locale;
	} else if (params.locale) {
		query.locale = params.locale;
	}

	return await Model.findOne(query);
};

const create = async (data, authUser) => {
	const blog = new Model(data);
	await blog.save();
	return blog;
};

const update = async (data, authUser) => {
	const { id, _id, ...updates } = data;
	const identifier = id || _id;
	
	const blog = await Model.findById(identifier);
	if (!blog) throw new Error("404");

	Object.assign(blog, updates);
	await blog.save();
	return blog;
};

const destroy = async (params, authUser) => {
	const identifier = params.id || params._id;
	const blog = await Model.findById(identifier);
	if (!blog) throw new Error("404");
	
	await blog.remove();
	return { success: true };
};

module.exports = {
	get,
	show,
	create,
	update,
	destroy,
};
