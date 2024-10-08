const readline = require("readline");
const dashdash = require("dashdash");
const fs = require("fs");
const pluralize = require("pluralize");

const PLACEHOLDERS = [
	{ key: "modelName", replaces: "{{MODELNAME}}" },
	{ key: "primaryKey", replaces: "{{PRIMARYKEY}}" },
	{ key: "modelInitial", replaces: "{{MODELINITIAL}}" },
	{ key: "baseUrl", replaces: "{{BASEPATH}}" },
	// { key: "fieldDetails", replaces: "{{FIELD_DETAILS}}" },
];

const TEMPLATES = ["middlewares", "models", "modules", "controllers", "routes"];

const question = (prompt) => {
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
	});

	return new Promise((resolve) => {
		rl.question(prompt, (answer) => {
			rl.close();
			resolve(answer);
		});
	});
};

const forceAnswer = async (
	prompt,
	enumAnswer = { y: true, Y: true, n: false, N: false }
) => {
	let answer;
	do {
		const rawAnswer = await question(prompt);

		answer = enumAnswer[rawAnswer];
	} while (answer === undefined);

	return answer;
};
/**
 * @param {*} stringParam - the string table name to singularize
 * @return {string} - string name in lower case and delimited by -
 */
const generateFileInitial = (stringParam) => {
	const parts = stringParam.toLowerCase().split("_");
	parts[parts.length - 1] = pluralize.singular(parts[parts.length - 1]);

	return parts.join("-");
};

/**
 * Generate Repository
 */
const runAction = async () => {
	try {
		const routeMiddlewareController = await forceAnswer(
			"needs route, middlware and controller? (Y/N): "
		);

		const needs = {
			modules: await forceAnswer("needs module? (Y/N): "),
			models: await forceAnswer("needs model? (Y/N): "),
			routes: routeMiddlewareController,
			middlewares: routeMiddlewareController,
			controllers: routeMiddlewareController,
		};

		const modelName = await question("Insert name of repository: ");
		const primaryKey = await question("Insert name of primary key: ");

		const repoPath = `Repositories/${modelName}`;
		const basePath = `${__dirname}/../../../${repoPath}`;

		if (fs.existsSync(basePath)) {
			console.info(`[Skip] ${repoPath} already exists`);
		} else {
			console.info(`[Perform] Creating ${repoPath}`);
			fs.mkdirSync(basePath);
		}

		const baseUrl = (modelInitial = modelName
			.replace(/([a-z])([A-Z])/g, "$1-$2")
			.toLowerCase());

		TEMPLATES.forEach(async (directory) => {
			if (!needs[directory])
				return console.info(`[Skip] ${repoPath}/${directory}`);

			if (fs.existsSync(`${repoPath}/${directory}`)) {
				console.info(`[Skip] ${repoPath}/${directory} already exists`);
			} else {
				console.info(`[Perform] Creating ${repoPath}/${directory}`);
				fs.mkdirSync(`${basePath}/${directory}`);
			}

			const fileCategory = directory.substring(0, directory.length - 1);
			const fileName = `${modelInitial}.${fileCategory}.js`;

			// let fieldDetails = "";
			// let customMappings = {};

			// if (directory === "models") {
			// 	const tmpFieldDetails = JSON.stringify(allFields, null, 4)
			// 		.replace(/(?<!\\)"/g, "")
			// 		.replace(/\\/g, "")
			// 		.replace(/([^,{])$/gm, "$1,");
			// 	fieldDetails = tmpFieldDetails.substring(0, tmpFieldDetails.length - 1);
			// }

			const replaceParams = {
				primaryKey,
				modelName,
				modelInitial,
				baseUrl,
				// fieldDetails,
			};

			if (fs.existsSync(`${basePath}/${directory}/${fileName}`)) {
				console.info(
					`[Skip] ${repoPath}/${directory}/${fileName} already exists`
				);
			} else {
				console.info(
					`[Perform] Creating ${repoPath}/${directory}/${fileName}`
				);
				let templateFile = fs
					.readFileSync(`${__dirname}/${directory}.template`)
					.toString();
				PLACEHOLDERS.forEach((holder) => {
					const replacement = replaceParams[holder.key];
					const regex = new RegExp(holder.replaces, "g");
					templateFile = templateFile.replace(regex, replacement);
				});
				// Object.keys(customMappings).forEach((key) => {
				// 	const replacement = customMappings[key];
				// 	const regex = new RegExp(`{{${key}}}`, "g");
				// 	templateFile = templateFile.replace(regex, replacement);
				// });
				fs.writeFileSync(
					`${basePath}/${directory}/${fileName}`,
					templateFile
				);
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
