const dashdash = require("dashdash");
const fs = require("fs");
const pluralize = require("pluralize");
const { Sequelize, initDB, getDB, disconnect } = require("../../../Core/database");

const PLACEHOLDERS = [
	{
		key: "modelName",
		replaces: "{{MODELNAME}}",
	},
	{
		key: "table",
		replaces: "{{TABLENAME}}",
	},
	{
		key: "primaryKey",
		replaces: "{{PRIMARYKEY}}",
	},
	{
		key: "modelInitial",
		replaces: "{{MODELINITIAL}}",
	},
	{
		key: "baseUrl",
		replaces: "{{BASEPATH}}",
	},
	{
		key: "fieldDetails",
		replaces: "{{FIELD_DETAILS}}",
	},
];

const TEMPLATES = ["middlewares", "models", "modules", "controllers", "routes"];

/**
 * @param {*} stringParam - the string table name to singularize
 * @return {string} - string name in lower case and delimited by -
 */
const generateFileInitial = (stringParam) => {
	const parts = stringParam.toLowerCase().split("_");
	parts[parts.length - 1] = pluralize.singular(parts[parts.length - 1]);

	return parts.join("-");
};

const options = [
	{
		names: ["help", "h"],
		type: "bool",
		help: "Show this help",
	},
	{
		names: ["modelName", "m"],
		type: "string",
		help: "Name of the model",
	},
	{
		names: ["table", "t"],
		type: "string",
		help: "Table this model is for",
	},
	{
		names: ["featureCode", "f"],
		type: "string",
		help: "The feature code to validate when accessing these routes",
	},
	{
		names: ["pk"],
		type: "string",
		help: "The name of the Primary Key field",
	},
	{
		names: ["modelOnly"],
		type: "bool",
		help: "Only the model would be generated",
	},
];

const parser = dashdash.createParser({
	options,
});

/**
 * Returns the database fields
 * @param {*} table - the table to extract fields from
 * @param {*} primaryKey - will be used if for some reason the model generation failed
 */
const fetchTableFields = async (table, primaryKey) => {
	let allFields = null;
	let actualPrimaryKey = primaryKey;
	try {
		throw new Error("deprecated");
		await initDB();
		const db = getDB();
		const result = await db.query(`DESCRIBE ${table}`, {
			type: Sequelize.QueryTypes.DESCRIBE,
		});

		Object.keys(result).forEach((fieldName) => {
			const field = result[fieldName];
			if (field.allowNull) {
				// Don't need to write this if it's true:
				delete field.allowNull;
			} else if (field.defaultValue === null) {
				// Not allowing null, so remove this defaultValue fields as well
				delete field.defaultValue;
			}

			if (field.primaryKey) {
				field.autoIncrement = true;
				field.primaryKey = true;
				actualPrimaryKey = fieldName;
			} else {
				delete field.primaryKey;
			}

			if (["created_at", "updated_at"].indexOf(fieldName) > -1) {
				field.defaultValue = "Sequelize.NOW";
			}

			// Update type, based on field:
			if (field.type === "TIMESTAMP") {
				field.type = "Sequelize.DATE";
			} else if (field.type === "BLOB") {
				field.type = "Sequelize.BLOB";
			} else if (field.type.indexOf("INT") === 0) {
				field.type = "Sequelize.INTEGER";
			} else if (field.type.indexOf("ENUM") === 0) {
				const enumStr = field.type.substring(5, field.type.length - 1).replace(/,/, ", ");
				field.type = "Sequelize.STRING";
				field.enum = `[${enumStr}]`;
			} else if (field.type.indexOf("TINYINT") === 0) {
				field.type = "Sequelize.BOOLEAN";
			} else if (field.type.indexOf("VARCHAR") === 0) {
				field.type = "Sequelize.STRING";
			} else {
				field.type = `'${field.type}'`;
			}
		});

		allFields = result;
	} catch (e) {
		console.info(e);
		allFields = {
			[primaryKey]: {
				type: "Sequelize.INTEGER",
				primaryKey: true,
				autoIncrement: true,
			},
			created_at: {
				type: "Sequelize.DATE",
				defaultValue: "Sequelize.NOW",
			},
			updated_at: {
				type: "Sequelize.DATE",
				defaultValue: "Sequelize.NOW",
			},
			deleted_at: {
				type: "Sequelize.DATE",
				defaultValue: null,
			},
		};
	} finally {
		disconnect();
	}

	return {
		allFields,
		primaryKey: actualPrimaryKey,
	};
};

/**
 * @param {String} featureCode
 * @return {*} object
 */
const getMiddlewareMappings = (featureCode) => {
	if (featureCode) {
		const template = `    const permission = await Permission.hasPermission(
        request.user,
        {code: '{{FEATURECODE}}', can{{ACTION}}: true}
    );

    if (!permission) {
        return next(new ForbiddenError('User does not have the required feature'));
    }

    return next();`;

		const replacements = {
			MIDDLEWARE_GET_VALIDATION: {
				FEATURECODE: featureCode,
				ACTION: "Read",
			},
			MIDDLEWARE_SHOW_VALIDATION: {
				FEATURECODE: featureCode,
				ACTION: "Read",
			},
			MIDDLEWARE_CREATE_VALIDATION: {
				FEATURECODE: featureCode,
				ACTION: "Create",
			},
			MIDDLEWARE_UPDATE_VALIDATION: {
				FEATURECODE: featureCode,
				ACTION: "Update",
			},
			MIDDLEWARE_DESTROY_VALIDATION: {
				FEATURECODE: featureCode,
				ACTION: "Delete",
			},
		};
		const mappings = {};

		Object.keys(replacements).forEach((key) => {
			const replacement = replacements[key];
			let templateCopy = template;
			Object.keys(replacement).forEach((innerKey) => {
				const regex = new RegExp(`{{${innerKey}}}`, "g");
				templateCopy = templateCopy.replace(regex, replacement[innerKey]);
			});

			mappings[key] = templateCopy;
		});

		mappings.MIDDLEWARE_REQUIRES = `const {ForbiddenError} = require('restify-errors');
const Permission = require('../../../modules/Utility/permission.module');

`;

		return mappings;
	}

	return {
		MIDDLEWARE_REQUIRES: "",
		MIDDLEWARE_GET_VALIDATION: "    return next();",
		MIDDLEWARE_SHOW_VALIDATION: "    return next();",
		MIDDLEWARE_CREATE_VALIDATION: "    return next();",
		MIDDLEWARE_UPDATE_VALIDATION: "    return next();",
		MIDDLEWARE_DESTROY_VALIDATION: "    return next();",
	};
};

/**
 * Generate Repository
 */
const runAction = async () => {
	try {
		const { featureCode, help, table, modelName, pk, modelOnly } = parser.parse(process.argv);
		if (help || !table || !modelName) {
			const helpText = parser.help(options);

			console.info(`Usage:\n    npm run generate:repository -- --table=table_name --modelName=Sample --pk=tablePrimaryKeyId`);
			console.info(`Options:\n${helpText}`);
			return;
		}

		const { allFields, primaryKey } = await fetchTableFields(table, pk);

		const repoPath = `Repositories/${modelName}`;
		const basePath = `${__dirname}/../../../${repoPath}`;

		if (fs.existsSync(basePath)) {
			console.info(`[Skip] ${repoPath} already exists`);
		} else {
			console.info(`[Perform] Creating ${repoPath}`);
			fs.mkdirSync(basePath);
		}

		TEMPLATES.forEach(async (directory) => {
			if (modelOnly && directory !== "models") {
				return;
			}

			if (fs.existsSync(`${repoPath}/${directory}`)) {
				console.info(`[Skip] ${repoPath}/${directory} already exists`);
			} else {
				console.info(`[Perform] Creating ${repoPath}/${directory}`);
				fs.mkdirSync(`${basePath}/${directory}`);
			}

			const modelInitial = generateFileInitial(table);
			const fileCategory = directory.substring(0, directory.length - 1);
			const fileName = `${modelInitial}.${fileCategory}.js`;
			const baseUrl = table.toLowerCase().replace(/_/g, "-");

			let fieldDetails = "";
			let customMappings = {};
			if (directory === "models") {
				const tmpFieldDetails = JSON.stringify(allFields, null, 4)
					.replace(/(?<!\\)"/g, "")
					.replace(/\\/g, "")
					.replace(/([^,{])$/gm, "$1,");
				fieldDetails = tmpFieldDetails.substring(0, tmpFieldDetails.length - 1);
			} else if (directory === "middlewares") {
				customMappings = getMiddlewareMappings(featureCode);
			}

			const replaceParams = {
				primaryKey,
				modelName,
				table,
				modelInitial,
				baseUrl,
				fieldDetails,
			};

			if (fs.existsSync(`${basePath}/${directory}/${fileName}`)) {
				console.info(`[Skip] ${repoPath}/${directory}/${fileName} already exists`);
			} else {
				console.info(`[Perform] Creating ${repoPath}/${directory}/${fileName}`);
				let templateFile = fs.readFileSync(`${__dirname}/${directory}.template`).toString();
				PLACEHOLDERS.forEach((holder) => {
					const replacement = replaceParams[holder.key];
					const regex = new RegExp(holder.replaces, "g");
					templateFile = templateFile.replace(regex, replacement);
				});
				Object.keys(customMappings).forEach((key) => {
					const replacement = customMappings[key];
					const regex = new RegExp(`{{${key}}}`, "g");
					templateFile = templateFile.replace(regex, replacement);
				});
				fs.writeFileSync(`${basePath}/${directory}/${fileName}`, templateFile);
			}
		});

		console.info("\nIMPORTANT!");
		console.info("- Confirm that the model is correct");
		console.info("- Add the model to Utilities/model-registry.js");
		console.info("- Update api.routes.js to include your new route");
	} catch (e) {
		console.error(e);
	}
};

runAction();

process.on("SIGINT", () => {
	console.info("SIGINT: Attempting to terminate");
	disconnect();
});

process.on("SIGTERM", () => {
	console.info("SIGTERM: Attempting to terminate");
	disconnect();
});
