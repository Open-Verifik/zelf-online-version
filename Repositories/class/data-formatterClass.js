class DataFormatter {
	constructor(jsonData) {
		this.data = jsonData;

		this.englishKeys = {
			address: "address",
			balance: "balance",
			fullName: "fullName",
			fiatBalance: "fiatBalance",
			currency: "currency",
			account: "account",
			tokenHoldings: "tokenHoldings",
			transactions: "transactions",
		};

		this.mapping = {
			address: true,
			balance: true,
			fullName: true,
			fiatBalance: true,
			currency: true,
			account: true,
			tokenHoldings: true,
			transactions: true,
		};
	}

	translateKeys() {
		const translatedData = {};

		for (const key in this.data) {
			if (this.data._id && this.mapping[key]) {
				translatedData[key] = this.data[key];

				continue;
			}

			if (this.englishKeys[key]) {
				translatedData[this.englishKeys[key]] = this.data[key];
			}
		}

		// Sort the keys A-Z
		const sortedData = {};

		Object.keys(translatedData)
			.sort()
			.forEach((key) => {
				sortedData[key] = translatedData[key];
			});

		if (sortedData.year) {
			sortedData.year = sortedData.year.toString();
		}

		return sortedData;
	}
}

module.exports = DataFormatter;
