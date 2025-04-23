const fetch = require("node-fetch");
const FormData = require("form-data");

// Configuration
const PUBLISHER_URL = "https://walrus-testnet-publisher.nami.cloud";
// Example Base64 string (replace with your actual Base64 data)
const BASE64_FILE = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="; // Tiny 1x1 PNG
const FILE_NAME = "example.png"; // Name for the uploaded file
const MIME_TYPE = "image/png"; // MIME type of the file

async function uploadBase64ToWalrus(base64Data, fileName, mimeType) {
	try {
		// Convert Base64 to Buffer
		const fileBuffer = Buffer.from(base64Data, "base64");

		// Create FormData instance
		const form = new FormData();
		form.append("file", fileBuffer, {
			filename: fileName,
			contentType: mimeType,
		});

		// Send POST request to Walrus publisher
		const response = await fetch(`${PUBLISHER_URL}/v1/blobs`, {
			method: "PUT",
			body: form,
		});

		// Check response
		if (!response.ok) {
			console.log({ response });
			throw new Error(`Upload failed: ${response.statusText}`);
		}

		// Parse response
		const storageInfo = await response.json();
		console.log({ storageInfo, newlyCreated: storageInfo.newlyCreated.blobObject });
		console.log("Upload successful!");
		console.log("Blob ID:", storageInfo.blobId);
		console.log("Stored until epoch:", storageInfo.endEpoch);
		console.log("Blob URL:", storageInfo.blobUrl);

		return storageInfo;
	} catch (error) {
		console.error("Error uploading to Walrus:", error.message);
		throw error;
	}
}

// Execute upload
uploadBase64ToWalrus(BASE64_FILE, FILE_NAME, MIME_TYPE)
	.then(() => console.log("Upload process completed."))
	.catch((err) => console.error("Upload process failed:", err));
