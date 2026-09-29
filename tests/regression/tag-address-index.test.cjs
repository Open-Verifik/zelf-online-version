// #540: a TON address that only exists inside an Arweave `addresses2` tag must resolve to its name.
// Real Arweave GraphQL and a real local MongoDB; Pinata gets deliberately invalid credentials
// so the lookup has to succeed through the Arweave copy. No mocks, no registry writes.
// Needs MongoDB on MONGODB_URI (default mongodb://127.0.0.1:27017/zelf_testing).
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const { mkdtemp, rm } = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

// Public registry data: the Arweave owner wallet and qa99.zelf's registered TON account.
const ARWEAVE_OWNER = 'vzrsUNMg17WFPmh73xZguPbn_cZzqnef3btvmn6-YDk';
const QA99_TON = 'EQDSMp6iTSQkQYqi9TfHLyYa-EwGdD1MH-4AQliWeII0V_8K';

test('a packed legacy TON address resolves to its registered name, and only to it', { timeout: 120000 }, async () => {
    // Avoid loading a developer .env (Core/config intentionally uses dotenv override).
    const cwd = await mkdtemp(path.join(os.tmpdir(), 'zelf-address-index-'));
    const root = path.resolve(__dirname, '../..');
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/zelf_testing';
    try {
        const script = `
            const assert = require('node:assert/strict');
            const mongoose = require(${JSON.stringify(path.join(root, 'node_modules/mongoose'))});
            const { Address } = require(${JSON.stringify(path.join(root, 'node_modules/@ton/core'))});
            const Search = require(${JSON.stringify(path.join(root, 'Repositories/Tags/modules/tags-search.module'))});
            const Index = require(${JSON.stringify(path.join(root, 'Repositories/Tags/models/tag-address-index.model'))});
            const ton = Address.parse(${JSON.stringify(QA99_TON)});
            // The live zelf config is loaded from IPFS; legacy Arweave records are keyed by zelfName.
            const domainConfig = { name: 'zelf', tags: { storage: { keyPrefix: 'zelfName', ipfsEnabled: true, arweaveEnabled: true } },
                getTagKey: () => 'zelfName', getPrice: () => 0 };
            const byAddress = (value) => Search.searchTag({ key: 'tonAddress', value, domain: 'zelf', domainConfig, environment: 'all', type: 'both' });
            const until = async (check) => { for (let i = 0; i < 40; i++) { if (await check()) return; await new Promise((r) => setTimeout(r, 250)); } };
            (async () => {
                await mongoose.connect(${JSON.stringify(mongoUri)});
                await Index.deleteMany({});

                const before = await byAddress(${JSON.stringify(QA99_TON)});
                assert.equal(before.tagObject, undefined, 'empty index: the packed address is not searchable');

                const byName = await Search.searchTag({ tagName: 'qa99', domain: 'zelf', domainConfig, environment: 'all', type: 'both' });
                assert.equal(byName.tagObject.publicData.zelfName, 'qa99.zelf');
                assert.equal(byName.tagObject.publicData.tonAddress, ${JSON.stringify(QA99_TON)}, 'Arweave addresses2 is unpacked');

                await until(async () => (await Index.countDocuments({ key: 'tonAddress', value: ton.toRawString() })) > 0);
                assert.equal((await Index.findOne({ key: 'tonAddress', value: ton.toRawString() })).tagName, 'qa99.zelf');

                // A wrong hint must never win: the live record decides.
                await Index.create({ key: 'tonAddress', value: ton.toRawString(), tagName: 'qa.zelf', domain: 'zelf' });

                for (const spelling of [${JSON.stringify(QA99_TON)}, ton.toString({ bounceable: false, urlSafe: true }), ton.toRawString()]) {
                    const found = await byAddress(spelling);
                    assert.equal(found.available, false, spelling);
                    assert.equal(found.resolvedBy, 'addressIndex', spelling);
                    assert.equal(found.tagObject.publicData.zelfName, 'qa99.zelf', spelling);
                    assert.ok(Address.parse(found.tagObject.publicData.tonAddress).equals(ton), spelling);
                }

                const stranger = await byAddress('EQCD39VS5jcptHL8vMjEXrzGaRcCVYto7HUn4bpAOg8xqB2N');
                assert.equal(stranger.tagObject, undefined, 'an unregistered TON address stays unresolved');

                await Index.deleteMany({});
                await mongoose.disconnect();
                console.log('PASS: packed TON resolves through the verified index');
            })().catch(async (error) => { console.error(error); process.exitCode = 1; await mongoose.disconnect().catch(() => {}); });
        `;
        const { stdout } = await promisify(execFile)(process.execPath, ['-e', script], {
            cwd, timeout: 110000,
            env: { ...process.env, NODE_ENV: 'production', PINATA_ENV: 'production',
                PINATA_JWT: 'regression-deliberately-invalid', PINATA_JWT_PROD: 'regression-deliberately-invalid',
                PINATA_GATEWAY_URL: 'example.invalid', ARWEAVE_OWNER, MONGODB_URI: mongoUri },
        });
        assert.match(stdout, /PASS: packed TON resolves/);
    } finally {
        await rm(cwd, { recursive: true, force: true });
    }
});
