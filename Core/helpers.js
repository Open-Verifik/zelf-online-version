// const moment = require("moment");
// const fs = require("fs");
// const GlobalSettingsModule = require("../Repositories/GlobalSetting/modules/global-setting.module");
// const DiscordModule = require("../Repositories/Discord/modules/discord.module");
// const Config = require("./config");
// const diff = require("./diff");
// const { getDefaultInstance } = require("./axios");
// const axiosInstance = getDefaultInstance(0);

// const { DateTime, Settings } = require("luxon");

// Settings.defaultLocale = "es";

// const timeZoneBogota = "America/Bogota";

// const formats = Object.freeze({
// 	onlyDate: "yyyy-MM-dd",
// 	dateTime: "yyyy-MM-dd HH:mm:ss",
// 	date: "dd/MM/yyyy",
// });
const userAgents = {
	mobile: [
		"Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1",
		"Mozilla/5.0 (Linux; Android 10; SM-G973F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.106 Mobile Safari/537.36",
		"Mozilla/5.0 (Linux; U; Android 4.1.1; en-us; Nexus 7 Build/JRO03D) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Safari/534.30",
	],
	tablet: [
		"Mozilla/5.0 (iPad; CPU OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1",
		"Mozilla/5.0 (Android 10; Tablet; SM-T865) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.106 Safari/537.36",
		"Mozilla/5.0 (Linux; Android 6.0.1; Nexus 9 Build/MMB29K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.106 Safari/537.36",
	],
	desktop: [
		"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.106 Safari/537.36",
		"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_2) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.4 Safari/605.1.15",
		"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.106 Safari/537.36",
	],
};

const generateRandomUserAgent = () => {
	function getRandomInt(max) {
		return Math.floor(Math.random() * max);
	}
	const deviceTypes = Object.keys(userAgents);
	const randomDeviceType = deviceTypes[getRandomInt(deviceTypes.length)];
	const userAgentList = userAgents[randomDeviceType];
	const randomIndex = getRandomInt(userAgentList.length);

	return userAgentList[randomIndex];
};
// const getDateFromFormat = (date, format = formats.date) => {
// 	return DateTime.fromFormat(date, format);
// };

// const getDate = ({
// 	timezone = timeZoneBogota,
// 	keepLocalTime = false,
// 	date,
// }) => {
// 	date = date ? new Date(date) : new Date();

// 	return DateTime.fromJSDate(date).setZone(timezone, {
// 		keepLocalTime, //keep the local time but in timezone indicated
// 	});
// };

// const clearKeys = (key) =>
// 	key
// 		.normalize("NFD")
// 		.toLowerCase()
// 		.replace(/[^a-zA-Z ]/g, "")
// 		.replace(/\s(.)/g, function ($1) {
// 			return $1.toUpperCase();
// 		})
// 		.replace(/\s/g, "")
// 		.replace(/^(.)/, function ($1) {
// 			return $1.toLowerCase();
// 		});

// const RNEC2686Response = {
// 	expeditionDate:
// 		"Esta información ha sido catalogada como semi privada y no está disponible para su entrega de forma temporal. - RNEC 2686",
// 	expeditionPlace:
// 		"Esta información ha sido catalogada como semi privada y no está disponible para su entrega de forma temporal. - RNEC 2686",
// 	dateOfBirth:
// 		"Esta información ha sido catalogada como semi privada y no está disponible para su entrega de forma temporal. - RNEC 2686",
// 	// placeOfBirth: "Esta información ha sido catalogada como semi privada y no está disponible para su entrega de forma temporal. - RNEC 2686"
// };

// /**
//  *
//  * @param {Object} params
//  * @param {String} key
//  * @param {Boolean} required
//  * @param {String} type
//  * @param {Number | Object} length
//  * @param {Array} enumerator
//  */
// const validateInput = ({
// 	params,
// 	key,
// 	required = false,
// 	type = null,
// 	length = null,
// 	enumerator = null,
// }) => {
// 	let errors = [];
// 	if (required && !params[key]) {
// 		errors.push(`${key}_isRequired`);

// 		return errors;
// 	}

// 	if (type && typeof params[key] !== type)
// 		errors.push(`${key}_shouldBe_${type}`);

// 	if (length) {
// 		if (typeof length == "number" && params[key].length !== length)
// 			errors.push(`${key}_lengthShouldBe_${length}`);

// 		if (typeof length === "object") {
// 			if (
// 				length.min &&
// 				typeof length.min === "number" &&
// 				params[key].length < length.min
// 			)
// 				errors.push(`${key}_minLengthShouldBe_${length.min}`);

// 			if (
// 				length.min &&
// 				typeof length.max === "number" &&
// 				params[key].length < length.max
// 			)
// 				errors.push(`${key}_maxLengthShouldBe_${length.max}`);
// 		}
// 	}

// 	if (enumerator && !enumerator.some((currEnum) => currEnum == params[key]))
// 		errors.push(`${key}_shouldBeAnyOf_${enumerator.join("|")}`);

// 	return errors;
// };

// /**
//  * get key values from array
//  * @param {Array} array
//  * @param {string} key
//  */
// const getKeyValuesFromArray = (array, key) => {
// 	const values = [];

// 	for (let index = 0; index < array.length; index++) {
// 		const element = array[index].dataValues
// 			? array[index].dataValues
// 			: array[index];

// 		if (element[key]) {
// 			values.push(element[key]);
// 		}
// 	}

// 	return values;
// };

// const getElementInArray = (array = [], key, value, extraParams = {}) => {
// 	const { getFirstMatch } = extraParams;

// 	let foundElement = null;

// 	if (!array || !key) {
// 		return null;
// 	}

// 	for (let index = 0; index < array.length; index++) {
// 		const element = array[index].dataValues
// 			? array[index].dataValues
// 			: array[index];

// 		if (Array.isArray(value) && value.includes(element[key])) {
// 			foundElement = element;

// 			if (getFirstMatch) {
// 				return foundElement;
// 			}
// 		} else if (element[key] && element[key] === value) {
// 			foundElement = element;

// 			if (getFirstMatch) {
// 				return foundElement;
// 			}
// 		}
// 	}

// 	return foundElement;
// };

// const generateRandomString = (length = 3, numeric = false) => {
// 	const randomChars = numeric ? "0123456789" : "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

// 	let result = "";

// 	for (let i = 0; i < length; i++) {
// 		result += randomChars.charAt(
// 			Math.floor(Math.random() * randomChars.length)
// 		);
// 	}

// 	return result;
// };

// const randomString = (length = 3) => {
// 	const randomChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

// 	let result = "";

// 	for (let i = 0; i < length; i++) {
// 		result += randomChars.charAt(
// 			Math.floor(Math.random() * randomChars.length)
// 		);
// 	}

// 	return result;
// };

// const generateCode = () => {
// 	return [...generateRandomString(4, true), ...generateRandomString(4)].join(
// 		""
// 	);
// 	// return code.sort(() => Math.random() - 0.5).join('')
// };

// const roundToNearest50 = (amount) => {
// 	if (amount % 50 < 25) {
// 		return amount - (amount % 50);
// 	} else if (amount % 50 > 25) {
// 		return amount + (50 - (amount % 50));
// 	} else if (amount % 50 == 25) {
// 		return amount + 25; //when it is halfawy between the nearest 50 it will automatically round up, change this line to 'return amount - 25' if you want it to automatically round down
// 	}
// };

// function editDistance(s1, s2) {
// 	s1 = s1.toLowerCase();
// 	s2 = s2.toLowerCase();

// 	var costs = new Array();
// 	for (var i = 0; i <= s1.length; i++) {
// 		var lastValue = i;
// 		for (var j = 0; j <= s2.length; j++) {
// 			if (i == 0) costs[j] = j;
// 			else {
// 				if (j > 0) {
// 					var newValue = costs[j - 1];
// 					if (s1.charAt(i - 1) != s2.charAt(j - 1))
// 						newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
// 					costs[j - 1] = lastValue;
// 					lastValue = newValue;
// 				}
// 			}
// 		}
// 		if (i > 0) costs[s2.length] = lastValue;
// 	}
// 	return costs[s2.length];
// }

// /**
//  * Quick sort
//  * @param {array} array
//  * @param {string} property
//  * @param {boolean} desc
//  * @return {array} sortedArray
//  */
// const quickSort = (array, property, desc) => {
// 	if (array.length < 2) return array;

// 	const pivot = array[Math.floor(Math.random() * array.length)];

// 	const left = [];
// 	const equal = [];
// 	const right = [];

// 	for (const element of array) {
// 		if (element[property] > pivot[property]) {
// 			if (desc) {
// 				left.push(element);
// 			} else {
// 				right.push(element);
// 			}
// 		} else if (element[property] < pivot[property]) {
// 			if (desc) {
// 				right.push(element);
// 			} else {
// 				left.push(element);
// 			}
// 		} else equal.push(element);
// 	}

// 	return quickSort(left).concat(equal).concat(quickSort(right));
// };

// const removeNonNumericFromString = (string) => {
// 	string = `${string}`.replace(/\D/g, "");

// 	string = `${parseInt(string)}`;

// 	return string;
// };

// const generateOTP = (data) => {
// 	const otp_length = Math.pow(10, data.otp_length - 1 || 3);

// 	const otp = `${Math.floor(otp_length + Math.random() * (9 * otp_length))}`;

// 	return otp;
// };

// const removeArrayWrapper = (data) => {
// 	if (!data) {
// 		return null;
// 	}

// 	const keys = Object.keys(data);

// 	for (let index = 0; index < keys.length; index++) {
// 		keys[index] = keys[index].split(".").join("");

// 		const key = keys[index];

// 		if (Array.isArray(data[key]) && data[key].length === 1) {
// 			data[key] = data[key][0];

// 			removeArrayWrapper(data[key]);
// 		} else if (Array.isArray(data[key]) && data[key].length > 1) {
// 			for (let _index = 0; _index < data[key].length; _index++) {
// 				const element = data[key][_index];

// 				removeArrayWrapper(element);
// 			}
// 		}
// 	}

// 	return data;
// };

// const signDocument = () => {
// 	return {
// 		dateTime: `${moment().format("LLL")}`,
// 		message: Config.verifik.signature,
// 	};
// };

// const FixedLetterMap = {
// 	Ãœ: "Ü",
// 	"Ã‘": "Ñ",
// 	Ãš: "Ú",
// 	"Ã‰": "É",
// 	"Ã“": "Ó",
// 	"Ã": "Ñ",
// 	"Ã±": "Ñ",
// 	"Ñ…": "Ñ",
// 	"/": "Ñ",
// 	"\\\\U00F1": "Ñ",
// };

// const fixedCharInNames = (name) => {
// 	for (const char in FixedLetterMap) {
// 		name = name.replace(new RegExp(char, "g"), FixedLetterMap[char]);
// 	}
// 	return name;
// };

// /**
//  * Formats and splits a full name into its components.
//  * @param {string} fullName - The complete name.
//  * @param {boolean} nameAtEnd - Flag indicating if the name starts with the surname.
//  * @return {object} An object containing the formatted full name, first name, last name, and an array of all name parts.
//  */
// const formatFullName = (fullName = "", nameAtEnd = false) => {
// 	// Ensure consistent formatting and spacing.
// 	fullName = fullName.toUpperCase().trim().replace(/\s+/g, " ");
// 	fullName = fixedCharInNames(fullName);

// 	// Split the name into parts, taking into account conjunctions that are usually part of surnames.
// 	const arrayName = fullName
// 		.replace(/(?<=\s(de|los|las|la|del|y))\s/gi, "_")
// 		.split(/\s+/)
// 		.map((name) => name.replace(/_/g, " "));

// 	// Determine where first names and last names split.
// 	const startLast = arrayName.length > 2 ? arrayName.length - 2 : 1;

// 	let firstName = arrayName.slice(0, startLast).join(" ");
// 	let lastName = arrayName.slice(startLast).join(" ");

// 	// If the name starts with the surname, switch the firstName and lastName variables.
// 	if (nameAtEnd) {
// 		[firstName, lastName] = [lastName, firstName];
// 	}

// 	return {
// 		fullName: `${firstName} ${lastName}`, // Ensure the full name reflects the order
// 		firstName,
// 		lastName,
// 		arrayName,
// 	};
// };

// /**
//  * validate names prior signup
//  * @param {String} name
//  * @param {object} record
//  * @author Miguel Trevino
//  */
// const compareNamesInDocument = (name, lname, record) => {
// 	if (!record) {
// 		throw new Error("404:record_not_provided");
// 	}

// 	if (!record.firstName || !record.lastName) {
// 		throw new Error("404:firstName_or_lastName_not_found");
// 	}

// 	const namesToCompare = name.split(" ");

// 	const firstNames = record.firstName.split(" ");

// 	const lastNamesToCompare = lname.split(" ");

// 	const lastNames = record.lastName.split(" ");

// 	let nameMatches = 0;

// 	let lastNameMatches = 0;

// 	namesToCompare.forEach((name) => {
// 		let resultNames = compareNames(name, firstNames);

// 		if (resultNames > 0) {
// 			nameMatches += 1;
// 		}
// 	});

// 	lastNamesToCompare.forEach((lastName) => {
// 		let resultNames = compareNames(lastName, lastNames);

// 		if (resultNames > 0) {
// 			lastNameMatches += 1;
// 		}
// 	});

// 	if (lastNameMatches <= 0 || nameMatches <= 0) {
// 		throw new Error("403:document_does_not_match");
// 	}
// };

// /**
//  *
//  * @param {object} data
//  * @param {Array} compareArray
//  * @returns boolean
//  */
// const compareNames = (data, compareArray) => {
// 	let passed = 0;

// 	compareArray.forEach((element) => {
// 		const matchFound = findPercentMatch(element, data);

// 		if (matchFound >= 0.7) {
// 			passed += 1;
// 		}
// 	});

// 	return passed;
// };

// const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// const waitForFileExists = async (
// 	filePath,
// 	timeout = 10000,
// 	currentTime = 0
// ) => {
// 	if (currentTime > timeout) {
// 		throw new Error(`file_generated_timeout`);
// 	}

// 	if (fs.existsSync(filePath)) {
// 		return true;
// 	}

// 	await delay(100);

// 	return await waitForFileExists(filePath, timeout, currentTime + 200);
// };

// const getGlobalSetting = async (key, withError = true) => {
// 	const savedKey =
// 		(await GlobalSettingsModule.get({
// 			where_key: key,
// 			findOne: true,
// 		})) || {};

// 	if (savedKey.value) {
// 		return savedKey.value;
// 	}

// 	await DiscordModule.GlobalSetting(key);

// 	if (withError) {
// 		throw new Error("400:Endpoint out of service");
// 	}

// 	return null;
// };

// const expiredGlobalSetting = (key) =>
// 	DiscordModule.GlobalSetting(key, "expired");

// const countryByDocumentType = {
// 	CC: "CO",
// 	CE: "CO",
// 	PEP: "CO",
// 	TI: "CO",
// 	RC: "CO",
// 	PA: "CO",
// 	NIT: "CO",
// 	CCVE: "VE",
// 	CURP: "MX",
// 	DNI: "PE",
// 	RUT: "CL",
// 	CCCR: "CR",
// 	CCEC: "EC",
// };

// const findPercentMatch = (str1, str2) => {
// 	let percentage = null;

// 	if (!str1) {
// 		return 0;
// 	}

// 	percentage = _getTotalEquals(str1, str2) / Math.max(str1.length, str2.length);

// 	return percentage;
// };

// const _getTotalEquals = (str1, str2) => {
// 	const diffData = diff(str1.toLowerCase(), str2.toLowerCase());
// 	return diffData.reduce((totalEquals, data) => {
// 		if (!data.added && !data.removed) {
// 			return totalEquals + data.items.length;
// 		}
// 		return totalEquals;
// 	}, 0);
// };

// const getImageBase64FromUrl = async (url, includeMIME = false) => {
// 	const response = await axiosInstance.get(url, {
// 		responseType: "arraybuffer",
// 	});

// 	const base64 = Buffer.from(response.data, "binary").toString("base64");

// 	const mimetype = response.headers["content-type"];

// 	if (includeMIME) return `data:${mimetype};base64,${base64}`;

// 	return base64;
// };

// const toCamelCase = (str) => {
// 	// Convert snake_case to camelCase
// 	return str.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
// };

// const convertObjectKeysToCamelCase = (obj) => {
// 	let newObject = {};

// 	Object.keys(obj).forEach((key) => {
// 		const camelCaseKey = toCamelCase(key);
// 		newObject[camelCaseKey] = obj[key];
// 	});

// 	return newObject;
// };

// const getDateRanges = (option) => {
// 	let start, end;

// 	switch (option) {
// 		case "currentWeek":
// 			start = moment().startOf("isoWeek");
// 			end = moment().endOf("isoWeek");
// 			break;
// 		case "lastWeek":
// 			start = moment().subtract(1, "weeks").startOf("isoWeek");
// 			end = moment().subtract(1, "weeks").endOf("isoWeek");
// 			break;
// 		case "currentMonth":
// 			start = moment().startOf("month");
// 			end = moment().endOf("month");
// 			break;
// 		case "lastMonth":
// 			start = moment().subtract(1, "months").startOf("month");
// 			end = moment().subtract(1, "months").endOf("month");
// 			break;
// 		case "last30Days":
// 			start = moment().subtract(29, "days"); // Start from 29 days ago to include a total of 30 days including today
// 			end = moment(); // Today
// 			break;
// 		case "currentYear":
// 			start = moment().startOf("year");
// 			end = moment().endOf("year");
// 			break;
// 		default:
// 			return null;
// 	}

// 	const ranges = {
// 		labels: [],
// 		values: [],
// 	};

// 	if (option === "last30Days") {
// 		let currentDay = start.clone();
// 		while (currentDay <= end) {
// 			ranges.labels.push(currentDay.format("DD-MMM")); // Each day's label in 'DD-MMM' format
// 			ranges.values.push({
// 				start: currentDay.format("YYYY-MM-DD 00:00:01"), // Start of the day
// 				end: currentDay.format("YYYY-MM-DD 23:59:59"), // End of the day
// 			});
// 			currentDay.add(1, "days"); // Move to the next day
// 		}
// 	} else if (option === "currentYear") {
// 		let month = start.clone();
// 		while (month <= end) {
// 			let monthEnd = month.clone().endOf("month");
// 			ranges.labels.push(month.format("MMM"));
// 			ranges.values.push({
// 				start: month.format("YYYY-MM-DD 00:00:01"),
// 				end: monthEnd.format("YYYY-MM-DD 23:59:59"),
// 			});
// 			month.add(1, "months");
// 		}
// 	} else if (["currentMonth", "lastMonth"].includes(option)) {
// 		let weekStart = start.clone();
// 		while (weekStart < end) {
// 			let weekEnd = moment.min(weekStart.clone().endOf("isoWeek"), end);
// 			ranges.labels.push(
// 				`${weekStart.format("DD-MMM")} - ${weekEnd.format("DD-MMM")}`
// 			);
// 			ranges.values.push({
// 				start: weekStart.format("YYYY-MM-DD 00:00:01"),
// 				end: weekEnd.format("YYYY-MM-DD 23:59:59"),
// 			});
// 			weekStart = weekEnd.add(1, "days");
// 		}
// 	} else {
// 		let day = start.clone();
// 		while (day <= end) {
// 			ranges.labels.push(day.format("DD-MMM"));
// 			ranges.values.push({
// 				start: day.format("YYYY-MM-DD 00:00:01"),
// 				end: day.clone().endOf("day").format("YYYY-MM-DD 23:59:59"),
// 			});
// 			day.add(1, "days");
// 		}
// 	}

// 	return ranges;
// };

// /**
//  * Checks if a given date is relative to a specified date range.
//  *
//  * @param {string} startDate - The start date in 'YYYY-MM-DD HH:mm:ss' format.
//  * @param {string} endDate - The end date in 'YYYY-MM-DD HH:mm:ss' format.
//  * @param {string} dateToCheck - The date to check in 'YYYY-MM-DD HH:mm:ss' format. Defaults to current date and time.
//  * @returns {string} - Returns 'past' if the date is before the start date, 'inRange' if the date is within the range, and 'future' if the date is after the end date.
//  */
// const getDateRangePosition = (startDate, endDate, dateToCheck, log = false) => {
// 	const start = moment(startDate, "YYYY-MM-DD HH:mm:ss");
// 	const end = moment(endDate, "YYYY-MM-DD HH:mm:ss");
// 	const date = moment(dateToCheck || new Date(), "YYYY-MM-DD HH:mm:ss");

// 	const diffStart = date.diff(start, "day", true);

// 	const diffEnd = date.diff(end, "day", true);

// 	if (log) {
// 		console.info({
// 			diffStart,
// 			diffEnd,
// 		});
// 	}

// 	if (diffStart > 0 && diffEnd > 0) return "past";

// 	if (diffStart < 0 && diffEnd < 0) return "future";

// 	return "inRange"; // If it's not past and not future, it must be in range
// };

module.exports = {
	// convertObjectKeysToCamelCase,
	// toCamelCase,
	// getDateFromFormat,
	// countryByDocumentType,
	// getDate,
	// delay,
	// waitForFileExists,
	// formatFullName,
	// generateCode,
	// validateInput,
	// getKeyValuesFromArray,
	// getElementInArray,
	// generateRandomString,
	// randomString,
	// roundToNearest50,
	// findPercentMatch,
	// quickSort,
	// removeNonNumericFromString,
	// generateOTP,
	// removeArrayWrapper,
	// signDocument,
	// compareNamesInDocument,
	// getGlobalSetting,
	// expiredGlobalSetting,
	// RNEC2686Response,
	// fixedCharInNames,
	// clearKeys,
	// getImageBase64FromUrl,
	// getDateRanges,
	// getDateRangePosition,
	generateRandomUserAgent,
};
