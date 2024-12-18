const JoiDate = require("@joi/date");
const Joi = require("joi").extend(JoiDate);

const recordShow = ["10", "25", "50", "100"];

const zelfNameDuration = ["1", "2", "3", "4", "5", "lifetime"];

const _customErrors = (errors) => {
	errors.forEach((err) => {
		switch (err.code) {
			case "any.required":
				err.message = `missing ${err.local.key}\n`;
				break;

			case "string.empty":
				err.message = `missing ${err.local.key}\n`;
				break;

			case "date.format":
				err.message = `${err.local.key} format required: ${err.local.format}\n`;
				break;

			case "number.min":
				err.message = `${err.local.key} minimun is: ${err.local.limit}\n`;
				break;

			case "number.max":
				err.message = `${err.local.key} maximum is: ${err.local.limit}\n`;
				break;

			case "string.min":
				err.message = `${err.local.key} minimun length: ${err.local.limit}\n`;
				break;

			case "string.max":
				err.message = `${err.local.key} maximum length: ${err.local.limit}\n`;
				break;

			case "string.regex":
			case "object.regex":
			case "string.pattern.base":
				err.message = `Format incorrect: ${err.local.key}`;
				break;

			case "any.only":
				err.message = `${
					err.local.key
				} must be one of: [${err.local.valids.join(",")}]`;
				break;

			default:
				// console.error(err);
				break;
		}
	});
	return errors;
};

const dateWithFormat = () =>
	Joi.date().raw().format("DD/MM/YYYY").error(_customErrors);

const dateOfBirth = () =>
	Joi.date().raw().format("DD/MM/YYYY").error(_customErrors);

const firstName = () => Joi.string().min(2).error(_customErrors);

const lastName = () => Joi.string().min(2).error(_customErrors);

const symbol = () => Joi.string().min(1).error(_customErrors);

const model = () => Joi.string().min(1).error(_customErrors);

const manufacturer = () => Joi.string().min(1).error(_customErrors);

const line = () => Joi.string().min(1).error(_customErrors);

const string = () => Joi.string().error(_customErrors);

const boolean = () => Joi.boolean().error(_customErrors);

const zelfNameDuration_ = () =>
	Joi.string()
		.valid(...zelfNameDuration)
		.error(_customErrors);

const province = () =>
	Joi.string()
		.valid(...provinceCA)
		.error(_customErrors);

const showRecords = () =>
	Joi.string()
		.valid(...recordShow)
		.error(_customErrors);

const stringEnum = (enumArray) =>
	Joi.string()
		.valid(...enumArray)
		.error(_customErrors);

const number = () => Joi.number().error(_customErrors);

const object = (schema) => Joi.object(schema);

const array = () => Joi.array();

const objectId = () => Joi.string().hex().length(24).error(_customErrors);

const base64ImageRegExp =
	/^data:image\/(png|jpeg|jpg|gif|bmp);base64,([A-Za-z0-9+/=]+)$/;

const imageBase64WithType = () =>
	Joi.string().regex(base64ImageRegExp).error(_customErrors);

const urlSecure = () =>
	Joi.string()
		.uri({
			scheme: ["https"],
			allowQuerySquareBrackets: true,
		})
		.error(_customErrors);

const validate = (schemaObj, params, or = undefined) => {
	let schema = Joi.object(schemaObj)
		.options({
			abortEarly: false,
		})
		.unknown(true);

	if (or) {
		schema = schema.or(...or);
	}

	return schema.validate(params);
};

const fileObject = () =>
	Joi.object({
		base64: Joi.string().required(),
		extension: Joi.string().required(),
	});

const alternative = (key, value, then, otherwise) => {
	return Joi.alternatives().conditional(key, { is: value, then, otherwise });
};

const alternativeMany = (schema) => {
	return Joi.alternatives().try(schema);
};

const jsonObjectWithMinKeys = () =>
	Joi.object()
		.min(1) // Ensures the object has at least one key
		.error(_customErrors);

module.exports = {
	fileObject,
	objectId,
	object,
	array,
	stringEnum,
	string,
	boolean,
	number,
	dateWithFormat,
	dateOfBirth,
	alternative,
	validate,
	model,
	manufacturer,
	line,
	symbol,
	lastName,
	imageBase64WithType,
	urlSecure,
	alternativeMany,
	firstName,
	province,
	showRecords,
	jsonObjectWithMinKeys,
	zelfNameDuration_,
};
