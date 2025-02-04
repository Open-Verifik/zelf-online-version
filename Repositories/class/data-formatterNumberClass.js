class DataFormatter {
	static sortAndTransformData(data) {
		if (Array.isArray(data)) {
			return data.map((item) => DataFormatter.sortAndTransformData(item));
		} else if (typeof data === "object" && data !== null) {
			return Object.keys(data)
				.sort()
				.reduce((sortedObj, key) => {
					sortedObj[key] = DataFormatter.sortAndTransformData(data[key]);
					return sortedObj;
				}, {});
		} else if (typeof data === "string") {
			if (/^\d{1,3}(,\d{3})*(\.\d+)?$/.test(data)) {
				const formatted = data.replace(/,/g, ".");
				return parseFloat(formatted);
			}

			if (!isNaN(data) && !/^0x[a-fA-F0-9]+$/i.test(data)) {
				return parseFloat(data);
			}
		}

		return data;
	}

	static formatData(data) {
		return this.sortAndTransformData(data);
	}
}

module.exports = DataFormatter;
