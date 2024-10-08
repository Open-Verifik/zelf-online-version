const bcrypt = require("twin-bcrypt");
const crypto = require("crypto");
const config = require("./config");
const encryptionMethod = "AES-256-CBC";
const encryptionSecretKey = crypto.createHash("sha256").update(String(config.encryptionSecret)).digest("base64").substr(0, 32);
const iv = encryptionSecretKey.substr(0, 16);
const { authenticator } = require("otplib");

/**
 *
 * @param {*} length
 * @return {*} result
 */
const randomString = (length = 7) => {
	let result = "";
	const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	const charactersLength = characters.length;
	for (let i = 0; i < length; i++) {
		result += characters.charAt(Math.floor(Math.random() * charactersLength));
	}
	return result;
};

/**
 * Encrypt a string
 * @param {string} string
 * @return {string} hashedResult
 */
const encryptString = (string) => {
	// const salt = bcrypt.genSalt(SALT_WORK_FACTOR);
	return bcrypt.hashSync(string);
};

/**
 * Generate random md5 hash
 * @param {integer} length
 * @return {string} hashedResult
 */
const md5random = (length) => {
	const str = randomString(length);
	return crypto.createHash("md5").update(str).digest("hex");
};

/**
 * encrypt variable
 * @param {string} variable
 * @return {string} encrypted variable
 */
const encrypt = (variable) => {
	if (!variable) {
		return null;
	}

	const cryptoInstance = crypto.createCipheriv(encryptionMethod, encryptionSecretKey, iv);

	return cryptoInstance.update(variable, "utf8", "base64") + cryptoInstance.final("base64");
};

/**
 * decrypt variable
 * @param {string} variable
 * @return {string} decrypted variable
 */
const decrypt = (variable) => {
	if (!variable) {
		return null;
	}

	const cryptoInstance = crypto.createDecipheriv(encryptionMethod, encryptionSecretKey, iv);

	return cryptoInstance.update(variable, "base64", "utf8") + cryptoInstance.final("utf8");
};

const generateAuthenticatorSecret = () => {
	return authenticator.generateSecret();
};

module.exports = {
	encryptString,
	md5random,
	randomString,
	encrypt,
	decrypt,
	generateAuthenticatorSecret,
};
