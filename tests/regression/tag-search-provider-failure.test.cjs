// Real Pinata requests with deliberately invalid credentials; no service mocks and no writes.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const { mkdtemp, rm } = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

test('a real provider authentication failure cannot make a tag available', { timeout: 60000 }, async () => {
    // Avoid loading a developer .env (Core/config intentionally uses dotenv override).
    const cwd = await mkdtemp(path.join(os.tmpdir(), 'zelf-search-failure-'));
    const root = path.resolve(__dirname, '../..');
    try {
        const script = `
            const assert = require('node:assert/strict');
            const IPFS = require(${JSON.stringify(path.join(root, 'Core/ipfs'))});
            const Search = require(${JSON.stringify(path.join(root, 'Repositories/Tags/modules/tags-search.module'))});
            (async () => {
                await assert.rejects(IPFS.filter('name', 'regression528.zelf', { throwOnError: true }));
                const result = await Search.searchTag({ tagName: 'regression528', domain: 'zelf', environment: 'ipfs', type: 'both',
                    domainConfig: { name: 'zelf', tags: { storage: { keyPrefix: 'tagName', ipfsEnabled: true, arweaveEnabled: false } } } });
                assert.equal(result.available, false);
                assert.equal(result.searchIncomplete, true);
                assert.equal(result.tagObject, undefined);
                console.log('PASS: actual provider failure stays unavailable and incomplete');
            })().catch(() => { process.exitCode = 1; });
        `;
        const { stdout } = await promisify(execFile)(process.execPath, ['-e', script], {
            cwd, timeout: 50000,
            env: { ...process.env, NODE_ENV: 'production', PINATA_ENV: 'production',
                PINATA_JWT: 'regression-deliberately-invalid', PINATA_JWT_PROD: 'regression-deliberately-invalid',
                PINATA_GATEWAY_URL: 'example.invalid', MONGODB_URI: 'mongodb://127.0.0.1:27017/zelf_testing' },
        });
        assert.match(stdout, /PASS: actual provider failure/);
    } finally {
        await rm(cwd, { recursive: true, force: true });
    }
});
