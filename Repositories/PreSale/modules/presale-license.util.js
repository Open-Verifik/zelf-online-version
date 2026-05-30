const PRESALE_LICENSE_TIERS = [
    { minAmount: 1000, years: 3 },
    { minAmount: 201, years: 2 },
    { minAmount: 0, years: 1 },
];

const getPresaleLicenseExtensionYears = (amountUSD) => {
    const tier = PRESALE_LICENSE_TIERS.find((t) => amountUSD >= t.minAmount);
    return tier?.years ?? 0;
};

module.exports = {
    PRESALE_LICENSE_TIERS,
    getPresaleLicenseExtensionYears,
};
