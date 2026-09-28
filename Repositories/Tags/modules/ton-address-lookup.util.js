const { Address } = require("@ton/core");

/** EQ, UQ and raw addresses identify the same mainnet account. */
const tonAddressLookupValues = (value) => {
    const address = Address.parse(String(value).trim());
    return [...new Set([
        String(value).trim(),
        address.toString({ bounceable: true, testOnly: false, urlSafe: true }),
        address.toString({ bounceable: false, testOnly: false, urlSafe: true }),
        address.toRawString(),
    ])];
};
module.exports = { tonAddressLookupValues };
