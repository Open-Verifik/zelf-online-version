/**
 * Offline lease for `/api/zelf-ids`. Existing v4 proof + QR, then the same persist rules as online lease.
 * Do not import Tags offline or Tags registration.
 */
const HumanAuthnModule = require("../../HumanAuthn/modules/human-authn.module");
const { extractZelfProofFromQR, generateQRFromZelfProof } = require("../../Tags/modules/qr-zelfproof-extractor.module");
const { getDomainConfig } = require("../../Tags/config/supported-domains");
const ZelfIdModule = require("./zelf-id.module");
const ZelfIdPartsModule = require("./zelf-id-parts.module");
const { getBareName } = require("./zelf-id-plan.module");

const normalizeName = (name, domain) => {
    if (!name) return name;
    const trimmed = String(name).trim().toLowerCase();
    return trimmed.includes(".") ? trimmed : `${trimmed}.${String(domain || "zelf").toLowerCase()}`;
};

const nameFromPublicData = (publicData = {}, domainConfig) => {
    const key = domainConfig?.getTagKey?.() || "tagName";
    return publicData[key] || publicData.tagName || publicData.zelfName || publicData.id;
};

/**
 * Preview a v4 proof through Human Authn (not Tags 3.1.6 `previewZelfProof`).
 * @param {Object} params
 * @param {string} params.zelfProof
 * @returns {Promise<{ preview: Object, publicData: Object }>}
 */
const previewHumanAuthn = async (params = {}) => {
    const preview = await HumanAuthnModule.preview({
        zelfProof: params.zelfProof,
        verifierKey: params.verifierKey,
    });

    if (preview?.error) {
        const error = new Error(preview.error.code || preview.error.message || "409:invalid_zelf_proof");
        error.status = 409;
        throw error;
    }

    return {
        preview,
        publicData: preview.publicData || preview.cleartext_data || {},
    };
};

/**
 * Lease an existing v4 proof onto a name. Inbound: `tagName`, `domain`, plus `zelfProof`
 * and/or `zelfProofQRCode`. Optional `referralTagName`, `duration`, `password`, `removePGP`.
 *
 * @param {Object} params
 * @param {Object} authUser
 * @returns {Promise<Object>}
 */
const leaseOffline = async (params, authUser) => {
    const { tagName, domain, referralTagName, duration } = params;
    let zelfProof = params.zelfProof;
    let zelfProofQRCode = params.zelfProofQRCode;

    const domainConfig = getDomainConfig(domain);
    if (!domainConfig) throw new Error(`409:unsupported_domain`);

    if (!zelfProof && zelfProofQRCode) {
        zelfProof = await extractZelfProofFromQR(zelfProofQRCode);
    }

    if (!zelfProof || typeof zelfProof !== "string") {
        const error = new Error("409:missing_or_invalid_zelf_proof");
        error.status = 409;
        throw error;
    }

    if (!zelfProofQRCode) {
        zelfProofQRCode = await generateQRFromZelfProof(zelfProof);
    }

    const { preview, publicData } = await previewHumanAuthn({ zelfProof });
    const resolvedDomain = publicData.domain || domain;
    const nameFromProof = nameFromPublicData(publicData, domainConfig);

    if (!nameFromProof) {
        const error = new Error("409:tag_not_found_in_zelfProof");
        error.status = 409;
        throw error;
    }

    if (normalizeName(nameFromProof, resolvedDomain) !== normalizeName(tagName, resolvedDomain)) {
        const error = new Error("409:tag_does_not_match_in_zelfProof");
        error.status = 409;
        throw error;
    }

    await ZelfIdModule._findDuplicatedTag(tagName, domain, domainConfig);

    const referralTagObject = await ZelfIdModule._validateReferral(referralTagName, authUser, domainConfig);
    const decrypted = await ZelfIdPartsModule.decryptParams({ password: params.password, removePGP: params.removePGP }, authUser);
    const password = decrypted.password;
    const securityType = password ? (/^\d{6}$/.test(password) ? "pin" : "password") : null;
    const tagKey = domainConfig.getTagKey() || "tagName";

    const zelfIDObject = {
        ...publicData,
        [tagKey]: tagName.includes(".") ? tagName : `${tagName}.${domain}`,
        tagName,
        domain,
        duration: duration || "1",
        zelfProof,
        zelfProofQRCode,
        hasPassword: preview.passwordLayer === "WithPassword" ? "true" : "false",
        origin: "offline",
        v: "4",
    };

    await ZelfIdModule.persistZelfIdLease(zelfIDObject, referralTagObject, domainConfig, securityType, authUser);

    const persistedPublic = zelfIDObject.ipfs?.publicData || {};
    let plan = persistedPublic.plan;
    if (!plan && persistedPublic.extraParams) {
        try {
            const extra =
                typeof persistedPublic.extraParams === "string" ? JSON.parse(persistedPublic.extraParams) : persistedPublic.extraParams;
            plan = extra.plan;
        } catch (_error) {
            plan = undefined;
        }
    }

    return {
        ipfs: zelfIDObject.ipfs ? [zelfIDObject.ipfs] : [],
        arweave: zelfIDObject.arweave ? [zelfIDObject.arweave] : [],
        available: false,
        name: tagName,
        tagName: `${getBareName(tagName)}.${domain}`,
        domain,
        zelfIDObject: {
            ...(zelfIDObject.ipfs || {}),
            zelfProof: zelfIDObject.zelfProof,
            zelfProofQRCode: zelfIDObject.zelfProofQRCode,
            publicData: {
                ...persistedPublic,
                ...publicData,
                origin: "offline",
                v: "4",
                plan,
            },
        },
    };
};

module.exports = {
    previewHumanAuthn,
    leaseOffline,
};
