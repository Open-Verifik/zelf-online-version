const fs = require("fs");
const readline = require("readline");
const createCsvWriter = require("csv-writer").createObjectCsvWriter;

// Global constants for conditions
const MIN_AGE = 81; // Minimum age to process
const MAX_AGE = 100; // Maximum age to process
const MIN_DOCUMENT_NUMBER_LENGTH = 5;
// Set file encoding
const fileEncoding = "utf16le"; // Change to "utf8" if your file is UTF-8

// Helper function to clean fields
function cleanField(field) {
	if (!field) return "";

	return field
		.replace(/\x00/g, "") // Remove null bytes
		.replace(/^N'/, "") // Remove "N'" only if it's at the start of the string
		.replace(/'$/g, "") // Remove trailing single quotes
		.trim()
		.replace(/[\u0300-\u036f]/g, "") // Remove diacritical marks (accents)
		.toLowerCase(); // Convert the entire field to lowercase
}

function capitalizeWords(field) {
	return field
		.split(" ") // Split by spaces into individual words
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1)) // Capitalize the first letter of each word
		.join(" "); // Join words back with a single space
}

// Helper function to check for accented characters
function hasAccents(value) {
	const accentedRegex = /[\u0300-\u036f]|[\u00C0-\u00FF]/u;
	return accentedRegex.test(value);
}

// Function to create the CSV writer for a specific age
function createCsvWriterForAge(age) {
	return createCsvWriter({
		path: `list_for_${age}.csv`, // File name dynamically changes based on age
		header: [
			{ id: "documentNumber", title: "documentNumber" },
			{ id: "firstName", title: "firstName" },
			{ id: "lastName", title: "lastName" },
			{ id: "birthDate", title: "birthDate" },
			{ id: "age", title: "age" },
			{ id: "maritalStatus", title: "maritalStatus" },
			{ id: "gender", title: "gender" },
			{ id: "hasAccents", title: "hasAccents" }, // New field to detect accents
		],
	});
}

function parseLine(line, targetAge) {
	line = line.replace(/[()]/g, "").trim();

	const [rawId, rawNombre, rawSegundoNombre, rawApellidoPaterno, rawApellidoMaterno, rawFechaNacimiento, rawEdad, rawEstadoCivil, rawGenero] = line
		.split(",")
		.map((item) => item?.trim());

	const documentNumber = `${Number(cleanField(rawId))}`;
	const age = Number(cleanField(rawEdad)?.replace(/\D/g, "")); // Keep only numeric age

	// Skip document numbers with fewer than 5 digits
	if (documentNumber.length < MIN_DOCUMENT_NUMBER_LENGTH) {
		return null;
	}

	// Include only records where age matches the targetAge
	if (age !== targetAge) {
		return null;
	}

	// Clean and parse other fields
	const firstName = capitalizeWords(`${cleanField(rawNombre)} ${cleanField(rawSegundoNombre)}`.trim());
	const lastName = capitalizeWords(`${cleanField(rawApellidoPaterno)} ${cleanField(rawApellidoMaterno)}`.trim());
	const birthDate = cleanField(rawFechaNacimiento)
		.replace(/CASTN?'/i, "") // Remove "CASTN'" or "CAST'"
		.replace(/' AS Date/i, "") // Remove "' AS Date"
		.replace(/CAST/i, ""); // Remove standalone "CAST"
	const maritalStatus = capitalizeWords(cleanField(rawEstadoCivil));
	const gender = capitalizeWords(cleanField(rawGenero));

	// Detect if the firstName or lastName contains accented characters
	const hasAccentsInName = hasAccents(firstName) || hasAccents(lastName);

	return {
		documentNumber,
		firstName,
		lastName,
		birthDate,
		age,
		maritalStatus,
		gender,
		hasAccents: hasAccentsInName, // Add new field for accent detection
	};
}

async function processFileForAge(targetAge) {
	const csvWriter = createCsvWriterForAge(targetAge);
	const readStream = fs.createReadStream("chamos.txt", { encoding: fileEncoding });
	const rl = readline.createInterface({
		input: readStream,
		crlfDelay: Infinity,
	});

	let records = [];
	let lineCount = 0;

	// Process each line
	for await (const line of rl) {
		if (line.trim()) {
			const record = parseLine(line, targetAge);

			// Skip null records
			if (!record) continue;

			records.push(record);
			lineCount++;
		}

		// Write batch every 1000 records
		if (records.length >= 1000) {
			await csvWriter.writeRecords(records);
			console.log(`Processed ${lineCount} lines for age ${targetAge}.`);
			records = []; // Clear the records array
		}
	}

	// Write remaining records at the end
	if (records.length > 0) {
		await csvWriter.writeRecords(records);
	}

	console.log(`Finished processing age ${targetAge}. Total lines processed: ${lineCount}.`);
}

async function main() {
	for (let age = MIN_AGE; age <= MAX_AGE; age++) {
		console.log(`Processing records for age ${age}...`);
		await processFileForAge(age);
	}
	console.log("All age groups processed successfully!");
}

main().catch((err) => console.error("Error processing file:", err));
