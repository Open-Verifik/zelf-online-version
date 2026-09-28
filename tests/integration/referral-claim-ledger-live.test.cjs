// Real isolated MongoDB; no blockchain transfers and no mocked services.
const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const Model = require('../../Repositories/Tags/models/referral-rewards.model');
test('a pending claim can be persisted before receipts exist and competing claims cannot both acquire it', async () => {
    const uri = process.env.MONGODB_URI_TEST || 'mongodb://127.0.0.1:27019/zelf_testing';
    if (new URL(uri).pathname !== '/zelf_testing') throw new Error('isolated_database_required');
    await mongoose.connect(uri); await Model.init();
    const tagName = `qa_ledger_${Date.now()}.zelf.hold`;
    const data = {tagName,domain:'zelf',ethAddress:'test',solanaAddress:'test',referralTagName:'test.zelf',referralDomain:'zelf',referralSolanaAddress:'test',attempts:0,tagPrice:0,rewardType:'registration',status:'pending'};
    try {
        const attempts = await Promise.allSettled([Model.create(data), Model.create(data)]);
        assert.equal(attempts.filter(r => r.status === 'fulfilled').length, 1);
        assert.equal(await Model.countDocuments({tagName}), 1);
        const record = await Model.findOne({tagName});
        assert.equal(record.ipfsHash, ''); assert.equal(record.arweaveId, '');
        const blocked = await Model.updateOne({_id:record._id,status:'failed'},{$set:{status:'pending'}});
        assert.equal(blocked.modifiedCount, 0);
        record.status='completed'; record.payload={signature:'test_confirmation',rewardAmount:10}; await record.save();
        assert.equal((await Model.findById(record._id)).payload.signature,'test_confirmation');
    } finally {await Model.deleteMany({tagName}); await mongoose.disconnect();}
});
