const { test } = require('node:test');
const assert = require('node:assert/strict');
const { assertTagAvailable } = require('../../Repositories/Tags/modules/tag-availability');

test('only an explicit complete empty search permits registration', () => {
    assert.doesNotThrow(() => assertTagAvailable({ available: true, ipfs: [], arweave: [] }));
});

test('missing, failed and incomplete results remain retryable, not duplicate conflicts', () => {
    for (const result of [null, {}, { available: false }, { available: true, searchIncomplete: true },
        { available: true, error: 'upstream_failed' }]) {
        assert.throws(() => assertTagAvailable(result), { status: 503, message: '503:tag_search_incomplete' });
    }
});

test('a record on either store prevents registration, even with a contradictory available flag', () => {
    for (const records of [{ tagObject: {} }, { ipfs: [{}] }, { arweave: [{}] }]) {
        assert.throws(() => assertTagAvailable({ available: true, ...records }), { status: 409 });
    }
});
