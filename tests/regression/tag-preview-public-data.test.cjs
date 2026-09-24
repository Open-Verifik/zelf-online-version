const { test } = require('node:test');
const assert = require('node:assert/strict');
const { hasMissingOwner, applyPreviewPublicData } = require('../../Repositories/Tags/modules/tag-preview-public-data');

// Public fields observed from the real qa99 response on 2026-09-24. No proof or credentials.
const record = () => ({ name: 'qa99.zelf', publicData: {
    zelfName: 'qa99.zelf', domain: 'zelf', type: 'mainnet', plan: 'unlimited',
    expiresAt: '2029-05-07 01:56:38', btcAddress: 'bc1qzsqe0vr9dqnmhnnsd05z3uhfj23z5d8ty4v4zl',
} });
const preview = () => ({ publicData: {
    zelfName: 'qa99.zelf', domain: 'zelf', ethAddress: '0xB8aB5d8c0a32410653C98adE00E0a202fdCe2117',
    solanaAddress: 'E5zQvcpuRdtcwZfRxBKHLgnUQRf6wCsYBf75Lix5upEG',
    btcAddress: 'bc1qzsqe0vr9dqnmhnnsd05z3uhfj23z5d8ty4v4zl',
} });

test('legacy qa99 owner and Solana address are available at the canonical response path', () => {
    const tag = record();
    assert.equal(hasMissingOwner(tag.publicData), true);
    applyPreviewPublicData(tag, preview());
    assert.equal(tag.publicData.ethAddress, preview().publicData.ethAddress);
    assert.equal(tag.publicData.solanaAddress, preview().publicData.solanaAddress);
    assert.equal(hasMissingOwner(tag.publicData), false);
    assert.equal(tag.publicData.type, 'mainnet');
    assert.equal(tag.publicData.plan, 'unlimited');
    assert.equal(tag.publicData.expiresAt, '2029-05-07 01:56:38');
});

test('proof name or domain mismatch cannot supply an owner', () => {
    for (const changes of [{ zelfName: 'other.zelf' }, { domain: 'other' }, { zelfName: '' }]) {
        const tag = record(), proof = preview(); Object.assign(proof.publicData, changes);
        applyPreviewPublicData(tag, proof);
        assert.equal(tag.publicData.ethAddress, undefined);
    }
});

test('explicitly conflicting addresses cannot be merged', () => {
    for (const changes of [{ ethAddress: '0xdifferent' }, { evmAddress: '0xdifferent' }, { btcAddress: 'different' }]) {
        const tag = record(); Object.assign(tag.publicData, changes);
        const before = structuredClone(tag);
        applyPreviewPublicData(tag, preview());
        assert.deepEqual(tag, before);
    }
});

test('EVM casing and hold name suffix do not prevent recovery', () => {
    const tag = record(); tag.publicData.zelfName = 'QA99.ZELF.hold';
    tag.publicData.evmAddress = preview().publicData.ethAddress.toLowerCase();
    assert.equal(hasMissingOwner(tag.publicData), false);
    applyPreviewPublicData(tag, preview());
    assert.equal(tag.publicData.solanaAddress, preview().publicData.solanaAddress);
});

test('missing preview keeps the record unconfirmed and cannot mark a name available', () => {
    const tag = record(), before = structuredClone(tag);
    for (const proof of [null, {}, { publicData: {} }]) applyPreviewPublicData(tag, proof);
    assert.deepEqual(tag, before);
    assert.equal(hasMissingOwner(tag.publicData), true);
});

test('preview can fill only missing public addresses, never plan or expiry or private fields', () => {
    const tag = record(), proof = preview();
    Object.assign(proof.publicData, { type: 'hold', expiresAt: '2099', privateKey: 'must-not-copy', plan: 'free' });
    applyPreviewPublicData(tag, proof);
    assert.equal(tag.publicData.type, 'mainnet');
    assert.equal(tag.publicData.expiresAt, '2029-05-07 01:56:38');
    assert.equal(tag.publicData.plan, 'unlimited');
    assert.equal(tag.publicData.privateKey, undefined);
});
