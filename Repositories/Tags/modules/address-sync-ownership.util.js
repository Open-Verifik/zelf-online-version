const { verifyMessage, isAddress } = require('ethers');
const ADDRESS_KEYS = new Set(['bitcoinAddress','btcAddress','suiAddress','stellarAddress','xlmAddress','kusamaAddress','ksmAddress','polkadotAddress','dotAddress','tonAddress','aptosAddress']);
const addressSyncMessage = (tagName, fields) => {
    const keys = Object.keys(fields).filter(key => !key.startsWith('_')).sort();
    if (!keys.length || keys.some(key => !ADDRESS_KEYS.has(key) || typeof fields[key] !== 'string' || !fields[key] || /[\r\n]/.test(fields[key]))) throw new Error('invalid_sync_addresses');
    return ['Zelf address sync v1', tagName.toLowerCase(), fields._syncIssuedAt, ...keys.map(key => `${key}=${fields[key]}`)].join('\n');
};
const verifyAddressSyncOwnership = (tagName, fields, owner, now = Date.now()) => {
    try {
        const issuedAt = Number(fields._syncIssuedAt);
        if (!Number.isSafeInteger(issuedAt) || Math.abs(now / 1000 - issuedAt) > 300 || !isAddress(owner)) return false;
        return verifyMessage(addressSyncMessage(tagName, fields), fields._syncSignature).toLowerCase() === owner.toLowerCase();
    } catch { return false; }
};
module.exports = { addressSyncMessage, verifyAddressSyncOwnership };
