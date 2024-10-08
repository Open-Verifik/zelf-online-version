const config = require("./config");
const aws = require("aws-sdk");
const axios = require("axios").default;

const spacesEndpoint = new aws.Endpoint("nyc3.digitaloceanspaces.com");
const s3 = new aws.S3({
	endpoint: spacesEndpoint,
	accessKeyId: config.backup.access_key_id,
	secretAccessKey: config.backup.secret_access_key,
});

const basePathEnviroment = `${config.base_url.replace("https://", "").replace("http://", "")}`;

const basePaths = {
	pdf: "pdf/",
	tarjetaDePropiedad: "tarjetas-de-propiedad/",
	registraduria: "pdf/registraduria/",
	curp: "pdf/curp/",
	projects: "projects/",
	caras: "caras/",
};

const downloadStream = async (url) => {
	const response = await axios({
		method: "GET",
		url,
		responseType: "stream",
	});

	if (!response.data) {
		throw new Error("The file cannot be downloaded.");
	}

	return response.data;
};

/**
 *
 * @param {base64} file
 * @param {string} fileName
 * @param {string} mimeType
 * @param {string} ACL
 * @param {string} path
 * @param {*} bucket
 */
const uploadFile = async (file, fileName, mimeType, ACL = "public-read", path = "public", bucket = "cdn-verifik") => {
	let basePath = basePaths[path];

	if (!basePath) {
		basePath = `${basePathEnviroment}/${path}/`;
	}

	const params = {
		Bucket: bucket,
		Key: `${basePath}${fileName}`,
		ContentType: mimeType,
		Body: file,
		ACL,
	};

	const uploadedData = await s3.upload(params).promise();

	uploadedData.Subdomain = `https://cdn.verifik.co/${uploadedData.Key}`;

	return uploadedData;
};

const uploadFileBase64 = async (base64, fileName, mimeType, ACL = "public-read", path = "pdf", bucket = "cdn-verifik") => {
	const buf = Buffer.from(base64.replace(`data:${mimeType};base64,`, ""), "base64");

	const params = {
		Bucket: bucket,
		Key: `${basePaths[path]}${fileName}`,
		ContentType: mimeType,
		Body: buf,
		ContentEncoding: "base64",
		ACL,
	};

	const uploadedData = await s3.upload(params).promise();

	uploadedData.Subdomain = `https://cdn.verifik.co/${uploadedData.Key}`;

	return uploadedData;
};

const uploadFileBase64V2 = async (base64, path, ACL = "public-read", bucket = "cdn-verifik") => {
	const mimeType = base64.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,.*/) ? base64.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,.*/)[1] : "png";

	const buf = Buffer.from(base64.replace(`data:${mimeType};base64,`, ""), "base64");

	const fileName = `${path}-${mimeType.replace("/", ".")}`.replace(/\s/g, "");

	const params = {
		Bucket: bucket,
		Key: fileName,
		ContentType: mimeType,
		Body: buf,
		ContentEncoding: "base64",
		ACL,
	};

	const uploadedData = await s3.upload(params).promise();

	uploadedData.Subdomain = `https://cdn.verifik.co/${uploadedData.Key}`;

	uploadedData.mimeType = mimeType;

	return uploadedData;
};

module.exports = {
	uploadFileBase64,
	uploadFileBase64V2,
	downloadStream,
	uploadFile,
};
