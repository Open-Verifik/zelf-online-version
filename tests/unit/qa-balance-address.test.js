const { tonAddressLookupValues } = require('../../Repositories/Tags/modules/ton-address-lookup.util');
const { mapRouteScanHolding } = require('../../Repositories/Avalanche/modules/avalanche-balance.util');
const ton = 'EQDSMp6iTSQkQYqi9TfHLyYa-EwGdD1MH-4AQliWeII0V_8K';
test('bounceable, non-bounceable and raw TON spellings resolve the same account', () => {
    const variants = tonAddressLookupValues(ton);
    expect(variants).toHaveLength(3);
    for (const address of variants) expect(new Set(tonAddressLookupValues(address))).toEqual(new Set(variants));
    expect(() => tonAddressLookupValues(ton.replace('II', 'll'))).toThrow();
});
test('RouteScan integer quantities keep token decimals instead of inflating the balance', () => {
    expect(mapRouteScanHolding({tokenQuantity:'1234567890123456789',tokenDecimals:18,tokenSymbol:'WAVAX'}).amount).toBe('1.234567890123456789');
    expect(() => mapRouteScanHolding({tokenQuantity:'unknown',tokenDecimals:18})).toThrow();
});
