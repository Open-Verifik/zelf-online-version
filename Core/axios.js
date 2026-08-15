const config = require("./config");

const axios = require("axios");

let _defaultAxios = null;

let _azureInstance = null;

let _encryptionInstance = null;

let _encryptionInstanceV4 = null;

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

const getEncryptionInstanceV4 = () => {
	_encryptionInstanceV4 = axios.create({
		timeout: 25000,
		baseURL: config.zelfProofV4.url,
	});

	_encryptionInstanceV4.defaults.headers.common["X-API-Key"] = config.zelfProofV4.apiKey;

	return _encryptionInstanceV4;
};

module.exports = {
	getDefaultInstance,
	getCleanInstance,
	getAzureInstance,
	getEncryptionInstance,
	getEncryptionInstanceV4,
};
