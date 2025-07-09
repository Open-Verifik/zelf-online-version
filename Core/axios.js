const config = require("./config");

const axios = require("axios");

let _defaultAxios = null;

let _azureInstance = null;

let _openCVInstance = null;

let _encryptionInstance = null;

const getAzureInstance = () => {
	_azureInstance = axios.create({
		baseURL: config.azureVision.url,
		timeout: 50000,
	});

	_azureInstance.defaults.headers.common["Ocp-Apim-Subscription-Key"] = config.azureVision.key;

	return _azureInstance;
};

const getDefaultInstance = (timeout) => {
	_defaultAxios = axios.create({
		timeout: timeout ?? 25000,
	});

	_defaultAxios.defaults.headers.common["Content-Type"] = "application/json; charset=UTF-8";
	_defaultAxios.defaults.headers.common["Accept"] = "*/*";

	return _defaultAxios;
};

const getCleanInstance = (timeout = 90000) => {
	return axios.create({
		timeout,
	});
};

const getEncryptionInstance = () => {
	_encryptionInstance = axios.create({
		timeout: 25000,
		baseURL: config.zelfProof.url,
	});

	_encryptionInstance.defaults.headers.common["X-API-Key"] = config.zelfProof.apiKey;

	return _encryptionInstance;
};

module.exports = {
	getDefaultInstance,
	getCleanInstance,
	getAzureInstance,

	getEncryptionInstance,
};
