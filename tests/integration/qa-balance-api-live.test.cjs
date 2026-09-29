// Read-only checks against a running API; no simulated providers or payouts.
const test = require('node:test');
const assert = require('node:assert/strict');
const base = process.env.QA_API_BASE || 'http://127.0.0.1:3003';
const origin = 'https://test.example.com';
const ton = 'EQDSMp6iTSQkQYqi9TfHLyYa-EwGdD1MH-4AQliWeII0V_8K';
test('real providers return balances; invalid TON and unauthenticated requests cannot masquerade as zero', async () => {
    const session = await fetch(base+'/api/sessions',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({identifier:`qa_read_${Date.now()}`})});
    assert.equal(session.status,200);const {data}=await session.json();
    const get = path => fetch(base+path,{headers:{Origin:origin,Authorization:`Bearer ${data.token}`}});
    for (const path of ['/api/avalanche/address/0xB8aB5d8c0a32410653C98adE00E0a202fdCe2117','/api/bitcoin/address/bc1qzsqe0vr9dqnmhnnsd05z3uhfj23z5d8ty4v4zl','/api/ton/address/'+ton]) {
        const result=await get(path);assert.equal(result.status,200,path);
        const body=await result.json();assert.ok(Number.isFinite(Number(body.data.balance)),path);
        assert.ok(Array.isArray(body.data.tokenHoldings.tokens));
        if(path.includes('/ton/')) {assert.equal(typeof body.data.historyComplete,'boolean');assert.equal(typeof body.data.holdingsComplete,'boolean');}
    }
    const invalid=await get('/api/ton/address/'+ton.replace('II','ll'));assert.ok(invalid.status>=400);
    assert.equal((await fetch(base+'/api/ton/address/'+ton)).status,401);
    const referrals=await get('/api/my-tags/referrals?tagName=qa&domain=zelf');assert.equal(referrals.status,200);
    const rows=(await referrals.json()).data.referrals;
    assert.equal(new Set(rows.map(row=>row.id)).size, rows.length);
    assert.ok(rows.every(row=>row.rewardType==='registration'||row.rewardType==='purchase'));
});
