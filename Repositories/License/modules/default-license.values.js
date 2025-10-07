const PRICE_PER_TAG_MULTIPLIER = 0.07;
const PRICE_PER_ACTIVE_USER_MULTIPLIER = 0.1;

const _findPlanByPrice = (price) => {
	const planKey = Object.keys(plans).find((plan) => plans[plan].price === price);

	return planKey ? plans[planKey] : null;
};

const _setTagPrice = (multiplier) => {
	return Math.round(PRICE_PER_TAG_MULTIPLIER * multiplier * 10000) / 10000;
};

const _setActiveUserPrice = (multiplier) => {
	return Math.round(PRICE_PER_ACTIVE_USER_MULTIPLIER * multiplier * 10000) / 10000;
};

const _setZelfProofPrice = (multiplier) => {
	return Math.round(PRICE_PER_TAG_MULTIPLIER * multiplier * 10000) / 10000;
};

const plans = {
	zelfBasic: {
		code: "zelfBasic",
		price: 9900, // 99 USD
		limits: {
			pricePerTag: _setTagPrice(6), //
			pricePerActiveUser: _setActiveUserPrice(10),
			tags: parseInt(99 / _setTagPrice(6)),
			zelfkeys: parseInt(99 / _setActiveUserPrice(10)),
			zelfproofs: parseInt(99 / _setTagPrice(6)),
		},
	},
	zelfStartUp: {
		code: "zelfStartUp",
		price: 49900, // 499 USD
		limits: {
			pricePerTag: _setTagPrice(5),
			pricePerActiveUser: _setActiveUserPrice(8),
			tags: parseInt(499 / _setTagPrice(5)),
			zelfkeys: parseInt(499 / _setActiveUserPrice(8)),
			zelfproofs: parseInt(499 / _setTagPrice(5)),
		},
	},
	zelfBusiness: {
		code: "zelfBusiness",
		price: 99900, // 999 USD
		limits: {
			pricePerTag: _setTagPrice(4),
			pricePerActiveUser: _setActiveUserPrice(7),
			tags: parseInt(999 / _setTagPrice(4)),
			zelfkeys: parseInt(999 / _setActiveUserPrice(7)),
			zelfproofs: parseInt(999 / _setTagPrice(4)),
		},
	},
	zelfGold: {
		code: "zelfGold",
		price: 249900, // 2499 USD
		limits: {
			pricePerTag: _setTagPrice(3),
			pricePerActiveUser: _setActiveUserPrice(5),
			tags: parseInt(2499 / _setTagPrice(3)),
			zelfkeys: parseInt(2499 / _setActiveUserPrice(5)),
			zelfproofs: parseInt(2499 / _setTagPrice(3)),
		},
	},
	zelfEnterprise: {
		code: "zelfEnterprise",
		price: 499900, // 4999 USD
		limits: {
			pricePerTag: _setTagPrice(2),
			pricePerActiveUser: _setActiveUserPrice(3),
			tags: parseInt(4999 / _setTagPrice(2)),
			zelfkeys: parseInt(4999 / _setActiveUserPrice(3)),
			zelfproofs: parseInt(4999 / _setTagPrice(2)),
		},
	},
};

module.exports = {
	plans,
	findPlanByPrice: _findPlanByPrice,
	_setTagPrice,
	_setActiveUserPrice,
	_setZelfProofPrice,
};
