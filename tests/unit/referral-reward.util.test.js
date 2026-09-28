const { rewardFriendKeys, findReferralRecord, groupReferralRecords, explicitReferralPrice } = require('../../Repositories/Tags/modules/referral-reward.util');
const hold = { id: 'old', publicData: { tagName: 'friend.zelf.hold', type: 'hold' } };
const paid = { id: 'new', publicData: { tagName: 'friend.zelf', type: 'mainnet', price: 32.5 } };
test('registration remains claimable after a reservation becomes a permanent wallet', () => {
    expect(findReferralRecord([paid], 'friend.zelf', 'registration')).toBe(paid);
    expect(findReferralRecord([hold, paid], 'friend.zelf', 'registration')).toBe(hold);
    expect(findReferralRecord([hold], 'friend.zelf', 'purchase')).toBeUndefined();
    expect(findReferralRecord([paid], 'other.zelf', 'registration')).toBeUndefined();
});
test('registration checks canonical and legacy receipt names; purchase remains separate', () => {
    expect(rewardFriendKeys('Friend.Zelf.hold', 'registration')).toEqual(['friend.zelf.hold', 'friend.hold']);
    expect(rewardFriendKeys('friend.sui', 'registration')[0]).toBe('friend.sui.hold');
    expect(rewardFriendKeys('friend.zelf', 'purchase')).toEqual(['friend.zelf']);
});
test('hold and permanent storage records count as one referred wallet', () => {
    expect([...groupReferralRecords([paid, hold, paid])]).toEqual([['friend.zelf', paid]]);
});
test('explicit free price must never fall back to a paid lifetime quote', () => {
    expect(explicitReferralPrice({ publicData: { price: 0 } })).toBe(0);
    expect(explicitReferralPrice({ publicData: { price: '0' } })).toBe(0);
    expect(explicitReferralPrice({ publicData: { plan: 'free' } })).toBe(0);
    expect(explicitReferralPrice({ publicData: { price: -2 } })).toBe(0);
    expect(explicitReferralPrice({ publicData: { price: 'unavailable' } })).toBe(0);
    expect(explicitReferralPrice(paid)).toBe(32.5);
    expect(explicitReferralPrice(hold)).toBeNull();
});
