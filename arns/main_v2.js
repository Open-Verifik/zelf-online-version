document.addEventListener("DOMContentLoaded", function () {
	// Extract the subdomain and format it as `username.zelf`
	const url = window.location.hostname;
	const subdomain = url.split("_")[0]; // Get the first part of the subdomain
	const undername = `${subdomain || "migueltrevino"}.zelf`;
	const apiUrl = `https://api.zelf.world`;
	let zelfNameObject = {};
	// Hardcoded API base URL for localhost
	const apiBaseUrl = `${apiUrl}/api/zelf-name-service/v2/search`;

	function _generateUniqueIdentifier() {
		// Generate a random string
		const randomString = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
		//use the random string as the identifier + navigator.userAgent combination
		return `${randomString}_${navigator.userAgent}`;
	}

	async function getSessionToken() {
		try {
			// Set up headers
			const headers = new Headers();
			headers.append("Content-Type", "application/json");

			// Set up POST options
			const options = {
				method: "POST",
				headers: headers,
				body: JSON.stringify({
					identifier: _generateUniqueIdentifier(),
					type: "general",
				}), // Include identifier in the request body
			};

			// Fetch the data from the API
			const response = await fetch(`${apiUrl}/api/sessions`, options);

			// Check if the response is OK
			if (!response.ok) {
				throw new Error(`Failed to fetch session token: ${response.statusText}`);
			}

			const _response = await response.json();

			const data = _response.data;

			// Save the token to localStorage
			localStorage.setItem("sessionToken", data.token);
		} catch (error) {
			console.error("Error fetching session token:", error);
		}
	}

	// Make an API call to fetch the image URL
	async function fetchZelfData(undername) {
		try {
			// show loading badge while we fetch decentralized data
			setLoading(true);
			// JWT token from localStorage
			await getSessionToken();

			// Set up headers
			const headers = new Headers();
			headers.append("Authorization", `Bearer ${localStorage.getItem("sessionToken")}`);
			headers.append("Content-Type", "application/json");

			// Set up POST options
			const options = {
				method: "POST",
				headers: headers,
				body: JSON.stringify({
					zelfName: undername,
					environment: "mainnet",
				}), // Include zelfName in the request body
			};

			// Fetch the data from the API
			const response = await fetch(apiBaseUrl, options);

			// Check if the response is OK
			if (!response.ok) {
				throw new Error(`Failed to fetch data: ${response.statusText}`);
			}

			const _response = await response.json();

			const data = _response.data;

			zelfNameObject = data.arweave?.length ? data.arweave[0] : data.ipfs[0];

			// Update the image URL in the HTML
			const imageElement = document.getElementById("zelfproof");
			const zelfNameElement = document.getElementById("zelfName");
			const zelfNameCopyElement = document.getElementById("zelf-name-copy");

			// Set the zelfName in the HTML
			zelfNameElement.innerHTML = zelfNameObject.publicData.zelfName;
			zelfNameCopyElement.innerHTML = zelfNameObject.publicData.zelfName;

			if (zelfNameObject.url) {
				imageElement.src = zelfNameObject.url;
				// Generate address cards dynamically
				generateAddressCards();
			} else {
				console.error("Image URL not found in the response");
			}
		} catch (error) {
			console.error("Error fetching Zelf data:", error);
		} finally {
			setLoading(false);
		}
	}

	// Function to generate address cards dynamically
	function generateAddressCards() {
		const grid = document.getElementById("addressesGrid");
		const secondContent = document.querySelector(".second-content");
		const nameLabel = document.querySelector(".name-label");

		// Clear current grid
		if (grid) {
			grid.innerHTML = "";
		}

		// Get all address properties from publicData
		const addressProperties = Object.keys(zelfNameObject.publicData).filter((key) => key.endsWith("Address") && zelfNameObject.publicData[key]);

		// Define the chains we want to display and their display names
		const requiredChains = [
			{ key: "ethAddress", displayName: "ETH", fallback: null },
			{ key: "solanaAddress", displayName: "Solana", fallback: null },
			{ key: "btcAddress", displayName: "BTC", fallback: null },
			{ key: "avaxAddress", displayName: "AVAX", fallback: "ethAddress" },
			{ key: "polAddress", displayName: "Polygon", fallback: "ethAddress" },
			{ key: "bnbAddress", displayName: "BNB", fallback: "ethAddress" },
			{ key: "suiAddress", displayName: "Sui", fallback: null },
		];

		// Generate cards for each required chain
		requiredChains.forEach((chain) => {
			let address = zelfNameObject.publicData[chain.key];

			// If the address doesn't exist but we have a fallback, use the fallback address
			if (!address && chain.fallback && zelfNameObject.publicData[chain.fallback]) {
				address = zelfNameObject.publicData[chain.fallback];
			}

			// Only create card if we have an address (either direct or fallback)
			if (address) {
				// Create address card
				const cardDiv = document.createElement("div");
				cardDiv.className = "card-div";

				// Shorten address to first 8 and last 8 characters
				const shortenedAddress = `${address.slice(0, 8)}...${address.slice(-8)}`;

				// Generate unique ID for the copy button
				const copyButtonId = `copy${chain.displayName.replace(/\s+/g, "")}Address`;

				cardDiv.innerHTML = `
                    <div class="card-address-container name">
                        <div class="card-address">
                            <span class="chain-pill">${chain.displayName}</span>
                            <span id="${chain.key}">${shortenedAddress}</span>
                        </div>
                        <div class="card-copy-action" id="${copyButtonId}">
							<span>COPY</span>
							<div style="width: 24px; height: 24px; position: relative">
								<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
									<path
										d="M11.0013 0.666992H3.0013C2.26797 0.666992 1.66797 1.26699 1.66797 2.00033V11.3337H3.0013V2.00033H11.0013V0.666992ZM13.0013 3.33366H5.66797C4.93464 3.33366 4.33464 3.93366 4.33464 4.66699V14.0003C4.33464 14.7337 4.93464 15.3337 5.66797 15.3337H13.0013C13.7346 15.3337 14.3346 14.7337 14.3346 14.0003V4.66699C14.3346 3.93366 13.7346 3.33366 13.0013 3.33366ZM13.0013 14.0003H5.66797V4.66699H13.0013V14.0003Z"
										fill="white"
									/>
								</svg>
							</div>
						</div>
					</div>
				`;

				// Add the card to the grid
				grid.appendChild(cardDiv);

				// Add event listener for copying
				const copyButton = cardDiv.querySelector(`#${copyButtonId}`);
				copyButton.addEventListener("click", function () {
					_writeToClipboard(address);
					copyButton.classList.add("copied");
					setTimeout(() => copyButton.classList.remove("copied"), 600);
				});
			}
		});

		// Also add any additional address properties that might exist but weren't in our required list
		const additionalAddresses = addressProperties.filter((key) => !requiredChains.some((chain) => chain.key === key));

		additionalAddresses.forEach((addressKey) => {
			const address = zelfNameObject.publicData[addressKey];
			const chainName = addressKey.replace("Address", "").toUpperCase();

			// Create address card
			const cardDiv = document.createElement("div");
			cardDiv.className = "card-div";

			// Format chain name for display
			const displayName = chainName.charAt(0).toUpperCase() + chainName.slice(1).toLowerCase();

			// Shorten address to first 8 and last 8 characters
			const shortenedAddress = `${address.slice(0, 8)}...${address.slice(-8)}`;

			// Generate unique ID for the copy button
			const copyButtonId = `copy${chainName.charAt(0).toUpperCase() + chainName.slice(1).toLowerCase()}Address`;

			cardDiv.innerHTML = `
                <div class="card-address-container name">
                    <div class="card-address">
                        <span class="chain-pill">${displayName}</span>
                        <span id="${addressKey}">${shortenedAddress}</span>
                    </div>
                    <div class="card-copy-action" id="${copyButtonId}">
						<span>COPY</span>
						<div style="width: 24px; height: 24px; position: relative">
							<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
								<path
									d="M11.0013 0.666992H3.0013C2.26797 0.666992 1.66797 1.26699 1.66797 2.00033V11.3337H3.0013V2.00033H11.0013V0.666992ZM13.0013 3.33366H5.66797C4.93464 3.33366 4.33464 3.93366 4.33464 4.66699V14.0003C4.33464 14.7337 4.93464 15.3337 5.66797 15.3337H13.0013C13.7346 15.3337 14.3346 14.7337 14.3346 14.0003V4.66699C14.3346 3.93366 13.7346 3.33366 13.0013 3.33366ZM13.0013 14.0003H5.66797V4.66699H13.0013V14.0003Z"
									fill="white"
								/>
							</svg>
						</div>
					</div>
				</div>
			`;

			// Add the card to the grid
			grid.appendChild(cardDiv);

			// Add event listener for copying
			const copyButton = cardDiv.querySelector(`#${copyButtonId}`);
			copyButton.addEventListener("click", function () {
				_writeToClipboard(address);
				copyButton.classList.add("copied");
				setTimeout(() => copyButton.classList.remove("copied"), 600);
			});
		});
	}

	// Call the function with the extracted zelfName
	fetchZelfData(undername);

	//copy from referral-code-div
	document.getElementById("copyReferralCode").addEventListener("click", function () {
		// Get the text content of the span
		const referralCode = document.getElementById("zelf-name-copy").textContent;

		_writeToClipboard(referralCode);
	});

	// download android app action https://play.google.com/store/apps/details?id=co.verifik.wallet id=downloadButton
	document.getElementById("downloadButton").addEventListener("click", function () {
		window.open("https://zelf.world/download", "_blank");
	});

	const _writeToClipboard = (text) => {
		navigator.clipboard
			.writeText(text)
			.then(() => {
				showToast("Address copied to clipboard");
			})
			.catch((err) => {
				console.error("Failed to copy text: ", err);
				showToast("Failed to copy", true);
			});
	};

	// Lightweight toast system (no libraries)
	function showToast(message, isError = false) {
		const container = document.getElementById("toastContainer");
		if (!container) return;

		const toast = document.createElement("div");
		toast.className = "toast";
		toast.textContent = message;
		if (isError) {
			toast.style.background = "rgba(200, 30, 30, 0.92)";
		}

		container.appendChild(toast);

		// trigger animation
		requestAnimationFrame(() => {
			toast.classList.add("show");
		});

		// auto remove after 2.2s
		setTimeout(() => {
			toast.classList.remove("show");
			setTimeout(() => {
				toast.remove();
			}, 300);
		}, 2200);
	}

	function setLoading(isLoading) {
		const badge = document.getElementById("loadingBadge");
		if (!badge) return;
		badge.style.display = isLoading ? "inline-flex" : "none";
	}
});
