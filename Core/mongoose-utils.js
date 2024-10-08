// const mongoose_delete = require("mongoose-delete");
const timestamps = require("mongoose-timestamp");
// const mongoosePaginate = require("mongoose-paginate");  // deprecated
const mongooseStringQuery = require("mongoose-string-query");
const humanizeErrors = require("mongoose-error-humanizer");

const addBasicPlugins = (schema, timestampOptions = {}, skipPlugins = {}) => {
	schema.plugin(timestamps, timestampOptions);

	// schema.plugin(mongoosePaginate); // deprecated

	schema.plugin(mongooseStringQuery);

	schema.post("save", humanizeErrors);

	schema.post("update", humanizeErrors);

	// if (!skipPlugins.softDelete) {
	// 	schema.plugin(mongoose_delete, {
	// 		deletedAt: true,
	// 		indexFields: ["deletedAt"],
	// 		overrideMethods: "all",
	// 	});
	// }
};

const defaultField = (type, defaultValue = undefined) => {
	const fieldSchema = {
		type,
		default: defaultValue,
	};

	return fieldSchema;
};

const requiredField = (type, ref = undefined, unique = undefined) => {
	const fieldSchema = {
		type,
		required: true,
	};

	if (ref) {
		fieldSchema.ref = ref;
	}

	if (unique) {
		fieldSchema.unique = true;
	}

	return fieldSchema;
};

const requiredEnumField = (type, enumData, defaultEnum) => {
	const fieldSchema = {
		type,
		enum: enumData,
		required: true,
	};

	if (defaultEnum) {
		fieldSchema.default = defaultEnum;
	}

	return fieldSchema;
};

const optionalEnumField = (type, enumData, defaultEnum = undefined) => {
	const fieldSchema = {
		type,
		enum: enumData,
	};

	if (defaultEnum) {
		fieldSchema.default = defaultEnum;
	}

	return fieldSchema;
};

const refField = (type, ref, defaultRef = undefined) => {
	const fieldSchema = {
		type,
		ref,
		default: defaultRef,
	};

	return fieldSchema;
};

module.exports = {
	defaultField,
	requiredField,
	requiredEnumField,
	optionalEnumField,
	enumFiel: optionalEnumField,
	refField,
	addBasicPlugins,
};
