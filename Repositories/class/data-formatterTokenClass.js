class DataFormatter {
	constructor(jsonData) {
		this.data = jsonData;

		this.englishKeys = {
			tokenType: "tokenType",
			name: "name",
			symbol: "symbol",
			amount: "amount",
			type: "type",
			address: "address",
			image: "image",
		};

		this.mapping = {
			tokenType: true,
			name: true,
			symbol: true,
			amount: true,
			type: true,
			address: true,
			image: true,
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
