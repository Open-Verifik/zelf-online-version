const { Wallet } = require('ethers');
const { addressSyncMessage, verifyAddressSyncOwnership } = require('../../Repositories/Tags/modules/address-sync-ownership.util');
const owner = new Wallet('0x' + '01'.repeat(32));
test('passwordless sync requires the registered owner signature over exact address and wallet', async () => {
    const now = Date.now();
    const fields = {tonAddress:'EQDSMp6iTSQkQYqi9TfHLyYa-EwGdD1MH-4AQliWeII0V_8K',_syncIssuedAt:String(Math.floor(now/1000))};
    fields._syncSignature = await owner.signMessage(addressSyncMessage('qa99.zelf', fields));
    expect(verifyAddressSyncOwnership('qa99.zelf',fields,owner.address,now)).toBe(true);
    expect(verifyAddressSyncOwnership('other.zelf',fields,owner.address,now)).toBe(false);
    expect(verifyAddressSyncOwnership('qa99.zelf',{...fields,tonAddress:'changed'},owner.address,now)).toBe(false);
    expect(verifyAddressSyncOwnership('qa99.zelf',fields,Wallet.createRandom().address,now)).toBe(false);
    expect(verifyAddressSyncOwnership('qa99.zelf',fields,owner.address,now+301000)).toBe(false);
    expect(verifyAddressSyncOwnership('qa99.zelf',{tonAddress:fields.tonAddress},owner.address,now)).toBe(false);
});
