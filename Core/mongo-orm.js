const ArrayHelperModule = require("./array-helpers");

const { ObjectId } = require("mongodb");

const mongoose = require("mongoose");

const config = require("./config");

const groupAggregate = (Model, params) => {
	const pipeline = [];
	const { wheres } = params;

	// Add the $match stage if wheres exists
	if (wheres && Object.keys(wheres).length > 0) {
		pipeline.push({
			$match: wheres,
		});
	}

	const queryGroup = {
		$group: {
			_id: params.groupBy ? `$${params.groupBy}` : null, // Group by the specified field
		},
	};

	// Add sum aggregation if specified
	if (params.sum) {
		queryGroup.$group[`${params.sum}Sum`] = {
			$sum: `$${params.sum}`,
		};
	}

	// Include remaining fields
	if (params.includeFields && Array.isArray(params.includeFields)) {
		params.includeFields.forEach((field) => {
			queryGroup.$group[field] = { $first: `$${field}` };
		});
	}

	pipeline.push(queryGroup);

	// Add sorting if specified
	if (params.sortField) {
		pipeline.push({
			$sort: {
				[params.sortField]: params.sortOrder === -1 ? -1 : 1,
			},
		});
	}

	// Return the aggregated results
	return Model.aggregate(pipeline);
};

const buildQuery = (params, mongooseDocument, _id, allowedPopulates) => {
	let query = null;

	const filters = parseFilters(params, allowedPopulates);

	const fields = filters.select;

	if (config.debug.mongo) console.info(filters.wheres);

	if (params.groupBy) {
		query = groupAggregate(mongooseDocument, params);
	}

	if (params[_id]) {
		query = mongooseDocument.findById(params[_id], fields, filters);
	} else if (params.findOne) {
		query = mongooseDocument.findOne(filters.wheres, fields, filters);
	} else if (params.page || params.offset) {
		query = paginate(mongooseDocument, params, filters);
	} else if (params.count) {
		query = mongooseDocument.countDocuments(filters.wheres);
	} else if (params.sum) {
		query = sumResult(mongooseDocument, params, filters);
	} else {
		query = mongooseDocument.find(filters.wheres, fields, filters);
	}

	return query;
};

/**
 * Paginate result, passing as well the filters and params.
 * @param {mongooseDocument} query - Mongoose query object
 * @param {object} requestParams - Request parameters containing pagination info
 * @param {object} filters - Filters to apply to the query
 * @author Miguel Trevino
 */
const paginateResult = (query, requestParams, filters = {}) => {
	// Default items per page
	const defaultLimit = 20;

	// Calculate the limit (number of items per page)
	const limit = parseInt(requestParams.perPage, 10) || defaultLimit;

	// Calculate the offset (used for skipping documents)
	let offset = 0;
	if (requestParams.offset) {
		offset = parseInt(requestParams.offset, 10);
	}

	// Calculate the page (used for skipping documents, alternative to offset)
	if (requestParams.page) {
		const page = parseInt(requestParams.page, 10) - 1; // Page numbering starts at 1
		offset = page * limit;
	}

	// Apply filters if provided
	if (Object.keys(filters.wheres || {}).length > 0) {
		query = query.find(filters.wheres);
	}

	// Apply pagination
	query = query.skip(offset).limit(limit);

	return query;
};

/**
 * Paginate result, returning data and pagination info.
 * @param {Model} mongooseDocument - Mongoose model for the query
 * @param {object} params - Request parameters containing pagination info
 * @param {object} filters - Filters to apply to the query
 * @returns {Promise} - Promise object representing the pagination result
 */
const paginate = async (mongooseDocument, params, filters = {}) => {
	// Default items per page
	const defaultLimit = 20;

	// Calculate the limit (number of items per page)
	const limit = parseInt(params.perPage, 10) || defaultLimit;

	// Calculate the page
	const page = parseInt(params.page, 10) || 1;

	// Calculate the offset
	const offset = (page - 1) * limit;

	// Use a separate query instance for counting to avoid executing the same query twice
	const total = await mongooseDocument.countDocuments(filters.wheres || {}).exec();

	// Prepare the query with filters and apply pagination
	let query = mongooseDocument
		.find(filters.wheres || {})
		.sort(filters.sort || "-createdAt")
		.skip(offset)
		.limit(limit);

	// Apply population if provided
	filters.populate.forEach((populateOption) => {
		query = query.populate(populateOption);
	});

	// Execute the query to get the paginated data
	const docs = await query.exec();

	// Calculate the total number of pages
	const pages = Math.ceil(total / limit);

	// Return the pagination result in the specified format
	return {
		docs,
		total,
		limit,
		page,
		pages,
	};
};

/**
 * sum Result ({amount: 4000})
 * @param {mongooseDocument} query
 * @param {object} requestParams
 * @param {object} filters
 * @author Miguel Trevino
 */
const sumResult = async (query, requestParams, filters = {}) => {
	const sumField = requestParams.sumField ? `$${requestParams.sumField}` : "$amount";

	const pipeline = [
		{
			$match: filters.wheres || {},
		},
		{
			$group: {
				_id: null,
				total: {
					$sum: sumField,
				},
			},
		},
	];

	try {
		const result = await query.aggregate(pipeline);

		return result.length ? result[0].total : 0;
	} catch (err) {
		// Handle any errors that occur during aggregation
		throw err; // Rethrow the error, or handle it as needed
	}
};

/**
 * Parse filters: columns, populates, sort, lean
 * @param {object} params
 * @param {array} allowedPopulates
 * @author Miguel Trevino
 */
const parseFilters = (params, allowedPopulates) => {
	let filters = {};

	if (params.columns || params.select) {
		filters.select = params.columns || params.select;
	}

	filters.populate = parseRelations(params, allowedPopulates ? allowedPopulates : []);

	if (params.sort) {
		filters.sort = params.sort;
	}

	if (params.limit) {
		filters.limit = Number(params.limit);
	}

	filters.wheres = {};

	const groupsMap = {};

	for (let key in params) {
		if (!key || typeof params[key] === "function") {
			continue;
		}

		if (key.startsWith("?") || key.startsWith("=")) {
			// AND with OR inside  = ... ?
			let groupType = null;

			let innerType = null;

			if (key.startsWith("=")) {
				groupType = "$and";
			} else if (key.startsWith("?")) {
				groupType = "$or";
			}

			if (key.lastIndexOf("?") > -1) {
				innerType = "$or";
			} else if (key.lastIndexOf("=") > -1) {
				innerType = "$and";
			}

			const _group = key.substring(key.lastIndexOf(groupType === "$and" ? "=" : "?") + 1, key.lastIndexOf(innerType === "$and" ? "=" : "?"));

			if (_group && !groupsMap[_group]) {
				groupsMap[_group] = {
					groupType,
					innerType,
					conditions: [],
				};
			}

			let _key = key.replace(groupType === "$or" ? "?" : "=", "");

			const conditionData = _applyFilter(_key, params[key]);

			if (!conditionData) continue;

			groupsMap[_group].conditions.push(conditionData);

			if (groupsMap["?"]) {
				filters.wheres["$or"] = [];

				for (let index = 0; index < groupsMap["?"].conditions.length; index++) {
					const { conditionKey, conditionValue } = groupsMap["?"].conditions[index];

					filters.wheres["$or"].push({
						[conditionKey]: conditionValue,
					});
				}
			}
		} else {
			const conditionData = _applyFilter(key, params[key]);

			if (!conditionData?.conditionKey) {
				continue;
			}

			if (filters.wheres[conditionData.conditionKey]) {
				filters.wheres[conditionData.conditionKey] = {
					...filters.wheres[conditionData.conditionKey],
					...conditionData.conditionValue,
				};
				continue;
			}

			filters.wheres[conditionData.conditionKey] = conditionData.conditionValue;
		}
	}

	filters.lean = params.lean ? params.lean : false;

	return filters;
};

const _formatValueForFilters = (value) => {
	if (value === null || value === undefined) {
		return null;
	}

	if (Array.isArray(value)) {
		for (let index = 0; index < value.length; index++) {
			value[index] = _formatValue(value[index]);
		}

		return value;
	}

	return _formatValue(value);
};

const _formatValue = (value) => {
	const regex = /^[0-9a-fA-F]{24}$/;

	if (`${value}`.match(regex)) {
		try {
			const _objectId = new ObjectId(value);

			value = _objectId;

			return value;
		} catch (exception) {
			return null;
		}
	}

	if (typeof value === "boolean") {
		return value;
	}

	if (isDate(value) && value) {
		return new Date(value);
	}

	return value;
};

/**
 * check if its a date
 * @param {string} value
 */
function isDate(value) {
	try {
		if (typeof value === "string" && value.length < 10) return false;

		const _boolean = !isNaN(new Date(value).getYear()) && !/^\d+$/.test(value);

		return _boolean;
	} catch (exception) {}

	return false;
}

const _applyFilter = (key, value) => {
	let conditionKey = null;

	let conditionValue = null;

	value = _formatValueForFilters(value);

	if (value === undefined || value === "undefined") return null;

	if (key.indexOf("where_") > -1) {
		conditionKey = key.replace("where_", "");

		let splittedWheres = conditionKey.split(".");

		if (splittedWheres.length === 1) {
			conditionValue = value;
		} else if (splittedWheres.length === 2) {
			conditionKey = `${splittedWheres[0]}.${splittedWheres[1]}`;
		}

		conditionValue = value;
	} else if (key.indexOf("in_") > -1) {
		conditionKey = key.replace("in_", "");

		conditionValue = {
			$in: value,
		};
	} else if (key.indexOf("notIn_") > -1) {
		conditionKey = key.replace("notIn_", "");

		conditionValue = {
			$nin: value,
		};
	} else if (key.indexOf("like_") > -1) {
		conditionKey = key.replace("like_", "");

		conditionValue = {
			$regex: ".*" + value + ".*",
			$options: "i",
		};
	} else if (key.indexOf("notLike_") > -1) {
		conditionKey = key.replace("notLike_", "");

		conditionValue = {
			$not: {
				$regex: ".*" + value + ".*",
				$options: "i",
			},
		};
	} else if (key.indexOf("wherenot_") > -1) {
		conditionKey = key.replace("wherenot_", "");

		conditionValue = {
			$ne: value,
		};
	} else if (key.indexOf("where<_") > -1) {
		conditionKey = key.replace("where<_", "");

		conditionValue = {
			$lt: value,
		};
	} else if (key.indexOf("where>_") > -1) {
		conditionKey = key.replace("where>_", "");

		conditionValue = {
			$gt: value,
		};
	} else if (key.indexOf("where<=_") > -1) {
		conditionKey = key.replace("where<=_", "");

		conditionValue = {
			$lte: value,
		};
	} else if (key.indexOf("whereLTE_") > -1) {
		conditionKey = key.replace("whereLTE_", "");

		conditionValue = {
			$lte: value,
		};
	} else if (key.indexOf("where>=_") > -1) {
		conditionKey = key.replace("where>=_", "");

		conditionValue = {
			$gte: value,
		};
	} else if (key.indexOf("whereGTE_") > -1) {
		conditionKey = key.replace("whereGTE_", "");

		conditionValue = {
			$gte: value,
		};
	} else if (key.indexOf("where-not-null_") > -1) {
		conditionKey = key.replace("where-not-null_", "");

		conditionValue = {
			$ne: null,
			$exists: true,
		};
	} else if (key.indexOf("where-null_") > -1) {
		conditionKey = key.replace("where-null_", "");

		conditionValue = null;
	} else if (key.indexOf("where-exists_") > -1) {
		conditionKey = key.replace("where-exists_", "");

		conditionValue = {
			$exists: value,
		};
	} else if (key.indexOf("where-case-insensitive_") > -1) {
		conditionKey = key.replace("where-case-insensitive_", "");

		conditionValue = {
			$regex: "^" + value + "$",
			$options: "i",
		};
	}

	return {
		conditionKey,
		conditionValue,
	};
};

function parseRelations(params, allowedPopulates) {
	const populates = [];

	if (!params.populates) return populates;

	// Safely parse populateSelects if it's a string
	try {
		if (typeof params.populateSelects === "string") {
			params.populateSelects = JSON.parse(params.populateSelects);
		}
	} catch (error) {
		console.error("Error parsing populateSelects:", error);
		// Decide how to handle this error. For example, you might want to return an empty array or throw an error.
	}

	// Ensure params.populates is an array
	if (typeof params.populates === "string") {
		params.populates = [params.populates];
	}

	for (let index = 0; index < params.populates.length; index++) {
		if (!params.populates[index]) continue;

		const requestPopulateSplit = params.populates[index].split(".");

		const isAllowed = allowedPopulates.includes(requestPopulateSplit[0]);

		if (!isAllowed) {
			continue;
		}

		populates.push(_populateObjectRecursive(0, requestPopulateSplit, params.populateSelects || {}));
	}

	return populates;
}

const _populateObjectRecursive = (populateIndex, populateSplit, populateSelects) => {
	const path = populateSplit[populateIndex].replace(/:/g, ".");

	if (populateIndex + 1 === populateSplit.length) {
		return {
			path,
			select: populateSelects[path],
		};
	}

	return {
		path,
		select: populateSelects[path],
		populate: _populateObjectRecursive(populateIndex + 1, populateSplit, populateSelects),
	};
};

function bulkInsert(model, documents, callback) {
	return model.insertMany(documents, callback);
}
/**
 * bulk update many records at the same time
 * @param {Document} model
 * @param {array} params
 */
function bulkUpdate(model, params) {
	const filters = parseFilters(params, []);

	const promise = model.update(filters.wheres, params.columnsToUpdate, {
		multi: true,
	});

	return promise;
}

/**
 * Update Integration Pull Status
 * @param {array} entities
 * @param {string} value
 * @author Miguel Trevino
 */
function updateDocumentKeyValues(document, key, subKeys, value) {
	if (key && !subKeys.length) {
		document[key] = value;
	} else if (key && subKeys.length) {
		for (let index = 0; index < subKeys.length; index++) {
			const subKey = subKeys[index];

			document[key][subKey] = value;
		}
	}

	document.save();
}

const deleteById = (Model, id) => {
	return Model.findByIdAndDelete(id);
};

module.exports = {
	groupAggregate,
	buildQuery,
	paginateResult,
	parseFilters,
	parseRelations,
	bulkInsert,
	bulkUpdate,
	updateDocumentKeyValues,
	deleteById,
};
