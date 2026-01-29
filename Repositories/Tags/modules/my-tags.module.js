const config = require("../../../Core/config");
const { searchTag } = require("./tags.module");
const TagsSearchModule = require("./tags-search.module");
const moment = require("moment");
const { getCoinbaseCharge } = require("../../coinbase/modules/coinbase_commerce.module");
const { getDomainConfig } = require("../config/supported-domains");
const jwt = require("jsonwebtoken");
const bitcoinModule = require("../../bitcoin/modules/bitcoin-scrapping.module");
const ETHModule = require("../../etherscan/modules/etherscan-scrapping.module");
const solanaModule = require("../../Solana/modules/solana-scrapping.module");
const AvalancheModule = require("../../Avalanche/modules/avalanche-scrapping.module");
const { sendCustomEmail } = require("../../../Core/mailgun");
const { buildMetadata, storeInIPFS, storeInWalrus, storeInArweave } = require("./tags-payment.module");

/**
 * Confirm payment with Coinbase
 * @param {string} coinbase_hosted_url
 * @returns {Object} - Payment confirmation
 */
const _confirmPaymentWithCoinbase = async (coinbase_hosted_url) => {
    const chargeID = coinbase_hosted_url?.split("/pay/")[1];

    if (!chargeID) {
        const error = new Error("coinbase_charge_id_not_found");
        error.status = 404;
        throw error;
    }

    const charge = await getCoinbaseCharge(chargeID);

    if (!charge) {
        const error = new Error("coinbase_charge_not_found");
        error.status = 404;
        throw error;
    }

    const timeline = charge.timeline;

    let confirmed = false;

    for (let index = 0; index < timeline.length; index++) {
        const _timeline = timeline[index];

        if (_timeline.status === "COMPLETED") {
            confirmed = true;
        }
    }

    return {
        charge,
        confirmed: config.coinbase.forceApproval || confirmed,
        amountReceived: config.coinbase.forceApproval || confirmed ? charge.pricing.settlement?.amount : 0,
    };
};

/**
 * Renew my tag
 * @param {string} tagName
 * @param {string} domain
 * @param {string} network
 * @param {string} token
 */
const verifyPaymentConfirmation = async (tagName, domain, network, token) => {
    const tokenDecoded = jwt.verify(token, config.JWT_SECRET);

    const domainConfig = getDomainConfig(domain);

    if (!tokenDecoded || !tokenDecoded.tagName || !tokenDecoded.tagPayName) {
        const error = new Error("tag_not_authenticated");
        error.status = 401;
        throw error;
    }

    // Verify the tag belongs to the user
    if (tokenDecoded.tagName !== `${tagName}.${domain}`) {
        const error = new Error("tag_not_owned");
        error.status = 403;
        throw error;
    }

    // Get current tag data
    const tagData = await searchTag({ tagName, domain }, {});

    if (tagData.available) {
        const error = new Error("tag_not_found");
        error.status = 404;
        throw error;
    }

    const tagObject = tagData.tagObject;

    const amountToPay = tokenDecoded.prices[network]?.amountToSend;

    const addressMapping = {
        ETH: tokenDecoded.paymentAddress.ethAddress,
        SOL: tokenDecoded.paymentAddress.solanaAddress,
        BTC: tokenDecoded.paymentAddress.btcAddress,
        coinbase: tokenDecoded.coinbase_hosted_url,
        CB: tokenDecoded.coinbase_hosted_url,
        AVAX: tokenDecoded.paymentAddress.avalancheAddress || tokenDecoded.paymentAddress.ethAddress,
    };

    const paymentConfirmation = await confirmPayUniqueAddress(network, addressMapping[network], amountToPay);

    const initiatedAt = tokenDecoded.initiatedAt ? moment.unix(tokenDecoded.initiatedAt) : null;

    const renewedAtCondition = Boolean(tagObject.publicData.renewedAt && initiatedAt && moment(tagObject.publicData.renewedAt).isAfter(initiatedAt));

    const registeredAtCondition = Boolean(tokenDecoded.initiatedAt && moment(tagObject.publicData.registeredAt).isAfter(initiatedAt));

    if (renewedAtCondition || registeredAtCondition) {
        return {
            cache: true,
            confirmed: paymentConfirmation.confirmed,
            amountReceived: paymentConfirmation.amountReceived,
            paymentConfirmation,
            publicData: tagObject.publicData,
            reward: "pending_to_code",
            //await getPurchaseReward(zelfNameObject.publicData.zelfName, moment(authUser.payment.registeredAt)),
        };
    }
    // logic to extend the duration of the tag
    await addDurationToTag(
        {
            tagName: tagObject.publicData[domainConfig.getTagKey()].split(".")[0],
            price: amountToPay,
            domain,
            duration: tokenDecoded.duration || 1,
            domainConfig,
        },
        tagObject,
    );

    return {
        tagObject,
        confirmed: paymentConfirmation.confirmed,
        amountReceived: paymentConfirmation.amountReceived,
        // paymentConfirmation,
        amountReceived: paymentConfirmation.amountReceived,
    };
};

const isETHPaymentConfirmed = async (address, amountToPay) => {
    try {
        const response = await ETHModule.getAddress({ address });

        const numericBalance = Number(response?.balance ?? 0);

        if (!Number.isNaN(numericBalance) && numericBalance <= amountToPay) {
            return {
                confirmed: false,
                amountReceived: 0,
                amountToPay,
                transactions: response?.transactions,
                balance: response?.balance,
                checkedFactor: "balance",
            };
        }

        const amountReceived = response?.transactions
            .filter((transaction) => transaction.traffic === "IN")
            .reduce((sum, transaction) => sum + Number(transaction.amount), 0);

        return {
            confirmed: amountReceived >= amountToPay,
            amountReceived,
            amountToPay,
            transactions: response?.transactions,
            balance: response?.balance,
            checkedFactor: "transactions",
        };
    } catch (error) {
        console.error(error);
    }

    return false;
};

const isSolanaPaymentConfirmed = async (address, amountToPay) => {
    try {
        const response = await solanaModule.getAddress({ id: address });

        const numericBalance = Number(response?.balance ?? 0);

        if (!Number.isNaN(numericBalance) && numericBalance <= amountToPay) {
            return {
                confirmed: false,
                amountReceived: 0,
                amountToPay,
                transactions: response?.transactions,
                balance: response?.balance,
                checkedFactor: "balance",
            };
        }

        const amountReceived = response?.transactions
            .filter((transaction) => transaction.traffic === "IN")
            .reduce((sum, transaction) => sum + Number(transaction.amount), 0);

        return {
            confirmed: amountReceived >= amountToPay,
            amountReceived,
            amountToPay,
            transactions: response?.transactions,
            balance: response?.balance,
            checkedFactor: "transactions",
        };
    } catch (error) {}

    return false;
};

const isAvalanchePaymentConfirmed = async (address, amountToPay) => {
    try {
        const response = await AvalancheModule.getAddress({ id: address });

        const numericBalance = Number(response?.balance ?? 0);

        if (!Number.isNaN(numericBalance) && numericBalance <= amountToPay) {
            return {
                confirmed: false,
                amountReceived: 0,
                amountToPay,
                transactions: response?.transactions,
                balance: response?.balance,
                checkedFactor: "balance",
            };
        }

        const amountReceived = response?.transactions
            .filter((transaction) => transaction.traffic === "IN")
            .reduce((sum, transaction) => sum + Number(transaction.amount), 0);

        return {
            confirmed: amountReceived >= amountToPay,
            amountReceived,
            amountToPay,
            transactions: response?.transactions,
            balance: response?.balance,
            checkedFactor: "transactions",
        };
    } catch (error) {
        console.error(error);
    }

    return false;
};

/**
 * checkout BTC comparison
 * @param {String} address
 * @param {Number} amountDetected
 * @returns Boolean
 */
const isBTCPaymentConfirmed = async (address, zelfNamePrice) => {
    try {
        const response = await bitcoinModule.getBalance({
            id: address,
        });

        const numericReceived = Number(response?.balance ?? 0);
        const amountReceived = Number.isNaN(numericReceived) ? "0" : numericReceived.toFixed(7);

        return {
            amountReceived,
            confirmed: !Number.isNaN(numericReceived) && numericReceived === Number(zelfNamePrice),
            zelfNamePrice,
        };
    } catch (error) {}

    return false;
};

const confirmPayUniqueAddress = async (network, address, amountToPay) => {
    const map = {
        ETH: isETHPaymentConfirmed,
        SOL: isSolanaPaymentConfirmed,
        BTC: isBTCPaymentConfirmed,
        AVAX: isAvalanchePaymentConfirmed,
        coinbase: _confirmPaymentWithCoinbase,
    };

    try {
        const confirmation = await map[network](address, amountToPay);

        return confirmation;
    } catch (exception) {
        console.error(exception);

        const error = new Error("payment_confirmation_failed");
        error.status = 500;

        throw error;
    }
};

/**
 * Transfer my tag
 * @param {Object} params
 * @param {Object} authUser
 */
const transferMyTag = async (params, authUser) => {
    return "not-implemented";
};

/**
 * Update old tag object
 * @param {Object} tagObject
 * @param {string} domain
 */
const updateOldTagObject = async (tagObject, domain = "zelf") => {
    return "not-implemented";
};

/**
 * Add duration to tag (for RevenueCat webhook)
 * @param {Object} params - Parameters including tagName, domain, duration, eventID, eventPrice
 * @param {Object} preview - Tag preview object
 * @returns {Object} - Updated tag records
 */
const addDurationToTag = async (params, tagObject) => {
    const { tagName, domain, duration, price } = params;

    const domainConfig = params.domainConfig || getDomainConfig(domain || "zelf");

    const { metadata } = buildMetadata(params, tagObject, domainConfig);

    if (domainConfig.tags.storage.walrusEnabled) {
        // await storeInWalrus(tagObject, domainConfig, metadata);
    }

    if (domainConfig.tags.storage.ipfsEnabled) {
        await storeInIPFS(tagObject, domainConfig, metadata);
    }

    if (domainConfig.tags.storage.arweaveEnabled) {
        await storeInArweave(tagObject, domainConfig, metadata);
    }

    return tagObject;
};

const sendEmailReceipt = async (tagName, domain, network, email, token) => {
    const tokenDecoded = jwt.verify(token, config.JWT_SECRET);

    if (!tokenDecoded) {
        throw new Error("invalid_token");
    }

    // Get current tag data
    const tagData = await searchTag({ tagName, domain }, {});

    if (tagData.available) {
        const error = new Error("tag_not_found");
        error.status = 404;
        throw error;
    }

    const tagObject = tagData.tagObject;

    const price =
        tokenDecoded.prices[network]?.price ||
        tokenDecoded.prices.ETH?.price ||
        tokenDecoded.prices.SOL?.price ||
        tokenDecoded.prices.BTC?.price ||
        tokenDecoded.prices.AVAX?.price;

    // Format dates for better readability
    const transactionDate = moment(tagObject.publicData.registeredAt).format("YYYY-MM-DD HH:mm:ss");
    const expiresDate = moment(tagObject.publicData.expiresAt).format("YYYY-MM-DD HH:mm:ss");
    const yearLabel = tokenDecoded.duration === 1 ? "1 YEAR" : `${tokenDecoded.duration} YEARS`;

    return await sendCustomEmail(
        email,
        "purchase_receipt",
        {
            subject: `Your Zelf Domain Receipt - ${tokenDecoded.tagName}`,
            tagName: tokenDecoded.tagName,
            transactionDate,
            expires: expiresDate,
            subtotal: price,
            discount: tokenDecoded.discount || 0,
            total: price - (tokenDecoded.discount || 0),
            year: tokenDecoded.duration,
            yearLabel,
        },
        tokenDecoded.language || "en",
    );
};

/**
 * Get my referrals for a specific tag (referrer) in a single domain.
 * @param {string} tagName - Referrer tag name without domain (e.g. "miguel")
 * @param {string} domain - Domain (e.g. "zelf") -> full referrer tag = "miguel.zelf"
 * @param {Object} authUser
 */
const getMyReferrals = async (tagName, domain, authUser) => {
    const referralTagName = tagName.includes(".") ? tagName : `${tagName}.${domain}`;
    const domainConfig = getDomainConfig(domain);

    const ipfsRecords = await TagsSearchModule.searchIPFS(
        {
            key: "referralTagName",
            value: referralTagName,
            domain,
            domainConfig,
        },
        authUser,
    );

    const arweaveRecords = await TagsSearchModule.searchArweave(
        {
            key: "referralTagName",
            value: referralTagName,
            domain,
            domainConfig,
        },
        authUser,
    );

    const domainRecords = [...ipfsRecords, ...arweaveRecords];

    const map = new Map();
    for (const record of domainRecords) {
        const name = record.name || record.tagName;
        if (!map.has(name)) {
            map.set(name, record);
        }
    }

    const referrals = [];
    for (const [name, record] of map) {
        const type = record.publicData?.type || record.metadata?.extraParams?.type || "hold";
        const status = type === "mainnet" ? "tag_name_purchased" : "tag_name_created";

        referrals.push({
            id: record.id || record.ipfsId || name,
            name,
            status,
            rewardZns: 5,
        });
    }

    return referrals;
};

const ReferralRewardModel = require("../models/referral-rewards.model");
const TagsTokenModule = require("./tags-token.module");
const IPFS = require("../../../Core/ipfs");

/**
 * 1. Create reward record if not found (status "pending").
 * 2. Call giveTokensAfterPurchase to send ZNS.
 * 3. On success: set status "completed", receipt fields (completedAt, payload, attempts++), save. Return { signature, rewardAmount }.
 * 4. On failure: set status "failed", payload.error, attempts++, save. Throw so user can retry later.
 * @param {Object|null} rewardRecord - Existing record or null to create one
 * @param {string} friendFullTagName - Friend's full tag (e.g. one5024.sui)
 * @param {string} friendDomain - Friend's domain
 * @param {string} referralTagName - Referrer's full tag (e.g. miguel.zelf)
 * @param {string} domain - Referrer's domain
 * @param {Object} referrerTagRecord - Referrer's tag from IPFS (publicData.solanaAddress, publicData.ethAddress = who we reward)
 * @param {Object} friendRecord - IPFS/Arweave record for the friend's tag
 * @param {number} rewardAmount - ZNS amount to send
 * @returns {Promise<{ signature: string, rewardAmount: number }>}
 * @throws {Error} "token_transfer_failed" when giveTokensAfterPurchase fails (record is updated to "failed", attempts incremented)
 */
const _sendReferralRewardAndUpdateRecord = async (
    rewardRecord,
    friendFullTagName,
    friendDomain,
    referralTagName,
    domain,
    referrerTagRecord,
    friendRecord,
    rewardAmount,
) => {
    const referrerSolanaAddress = referrerTagRecord?.publicData?.solanaAddress;

    const referrerEthAddress = referrerTagRecord?.publicData?.ethAddress || "not_set";

    if (!referrerSolanaAddress) {
        const err = new Error("referrer_tag_solana_address_not_found");
        err.status = 400;
        throw err;
    }

    // 1. Create record if not found (addresses from referrer's tag in IPFS)
    if (!rewardRecord) {
        rewardRecord = new ReferralRewardModel({
            tagName: friendFullTagName,
            domain: friendDomain,
            ethAddress: referrerEthAddress,
            solanaAddress: referrerSolanaAddress,
            referralTagName,
            referralDomain: domain,
            referralSolanaAddress: referrerSolanaAddress,
            tagPrice: friendRecord.publicData?.price || 0,
            status: "pending",
            attempts: 0,
            payload: {},
            ipfsHash: friendRecord.ipfsHash || "",
            arweaveId: friendRecord.arweaveId || "",
        });
    }

    // 2. Send ZNS to referrer's Solana address (from their tag in IPFS)
    let signature;

    try {
        signature = await TagsTokenModule.giveTokensAfterPurchase(rewardAmount, referrerSolanaAddress);
    } catch (error) {
        console.error("Error sending referral reward:", error);

        rewardRecord.status = "failed";

        rewardRecord.payload = { ...rewardRecord.payload, error: error?.message || "token_transfer_failed" };

        rewardRecord.attempts += 1;

        await rewardRecord.save();

        const err = new Error("token_transfer_failed");

        err.status = 502;

        throw err;
    }

    // 3. Success: store receipt in IPFS and update MongoDB
    const ipfsCid = await _storeReferralRewardReceipt({
        rewardRecord,
        friendFullTagName,
        friendDomain,
        referralTagName,
        domain,
        rewardAmount,
        signature,
        referrerSolanaAddress,
        referrerEthAddress,
        friendRecord,
    });

    return { signature, rewardAmount, ipfsCid };
};

/**
 * Store referral reward receipt in IPFS and update MongoDB record.
 * @param {Object} params - Receipt parameters
 * @returns {Promise<string|null>} IPFS CID or null if storage failed
 */
const _storeReferralRewardReceipt = async ({
    rewardRecord,
    friendFullTagName,
    friendDomain,
    referralTagName,
    domain,
    rewardAmount,
    signature,
    referrerSolanaAddress,
    referrerEthAddress,
    friendRecord,
}) => {
    const rewardDate = moment().format("YYYY-MM-DD");
    const rewardPrimaryKey = `referral_${friendFullTagName}_${referralTagName}`;

    const rewardData = {
        type: "referral",
        rewardPrimaryKey,
        referralTagName,
        referralDomain: domain,
        friendTagName: friendFullTagName,
        friendDomain,
        rewardAmount,
        signature,
        referrerSolanaAddress,
        referrerEthAddress,
        friendTagPrice: friendRecord.publicData?.price || 0,
        friendTagType: friendRecord.publicData?.type || "hold",
        rewardDate,
        redeemedAt: moment().format("YYYY-MM-DD HH:mm:ss"),
        status: "completed",
    };

    // Store reward receipt as JSON in IPFS
    const rewardJson = JSON.stringify(rewardData);
    const base64Json = Buffer.from(rewardJson).toString("base64");
    const filename = `referral-reward-${rewardPrimaryKey}.json`;

    // Metadata for IPFS querying
    const ipfsMetadata = {
        rewardPrimaryKey,
        rewardedTagName: referralTagName,
        friendTagName: friendFullTagName,
        rewardType: "referral",
        rewardDate,
    };

    let ipfsResult = null;
    try {
        ipfsResult = await IPFS.pinFile(`data:application/json;base64,${base64Json}`, filename, "application/json", ipfsMetadata);
    } catch (ipfsError) {
        console.error("Error storing referral reward in IPFS:", ipfsError);
        // Continue anyway - IPFS storage is secondary, MongoDB is primary
    }

    // Update MongoDB record with receipt
    rewardRecord.status = "completed";
    rewardRecord.completedAt = new Date();
    rewardRecord.payload = { signature, rewardAmount, ipfsCid: ipfsResult?.IpfsHash || null };
    rewardRecord.attempts += 1;
    rewardRecord.solanaAddress = referrerSolanaAddress;
    rewardRecord.ethAddress = referrerEthAddress;

    if (ipfsResult?.IpfsHash) {
        rewardRecord.ipfsHash = ipfsResult.IpfsHash;
    }

    await rewardRecord.save();

    console.log({ ipfsResult });

    return { signature, rewardAmount, ipfsCid: ipfsResult?.IpfsHash || null };
};

/**
 * Step 1: Verify referral exists in IPFS/Arweave and return the friend's record.
 * @param {string} referralTagName - Full referrer tag (e.g. miguel.zelf)
 * @param {string} friendFullTagName - Full friend tag to find (e.g. one5024.sui)
 * @param {string} friendDomain - Friend's domain
 * @param {Object} authUser - Authenticated user (referrer)
 * @returns {Promise<Object>} The friend's IPFS/Arweave record
 * @throws {Error} "referral_not_found" if no record matches friendFullTagName
 */
const _findReferralRecordInStorage = async (referralTagName, friendFullTagName, friendDomain, authUser) => {
    const domainConfig = getDomainConfig(friendDomain);

    const ipfsRecords = await TagsSearchModule.searchIPFS(
        {
            key: "referralTagName",
            value: referralTagName,
            domain: friendDomain,
            domainConfig,
        },
        authUser,
    );

    const arweaveRecords = await TagsSearchModule.searchArweave(
        {
            key: "referralTagName",
            value: referralTagName,
            domain: friendDomain,
            domainConfig,
        },
        authUser,
    );

    const records = [...ipfsRecords, ...arweaveRecords];

    const friendRecord = records.find((r) => (r.name || r.tagName) === friendFullTagName);

    if (!friendRecord) throw new Error("referral_not_found");

    return friendRecord;
};

/**
 * Step 3: Calculate referral reward amount (ZNS tokens).
 * - Hold (non-mainnet): fixed 10 ZNS.
 * - Mainnet (purchased): 10% of friend's tag purchase price, converted to ZNS using config.token.rewardPrice (cents per ZNS; default 0.05).
 *   Formula: rewardAmount = (tagPrice * 0.1) / znsPrice.
 * @param {Object} friendRecord - Friend's IPFS/Arweave record (publicData.type, publicData.price or metadata.extraParams)
 * @returns {number} ZNS reward amount
 */
const _calculateReferralRewardAmount = (friendRecord) => {
    const type = friendRecord.publicData?.type || friendRecord.metadata?.extraParams?.type || "hold";

    const isMainnet = type === "mainnet";

    let rewardAmount = 10; // Default: 10 ZNS for hold (tag created, not purchased)

    if (isMainnet) {
        const tagPrice = friendRecord.publicData?.price || friendRecord.metadata?.extraParams?.price || 0;
        const znsPrice = config.token?.rewardPrice || 0.05; // Cents per ZNS
        if (tagPrice > 0) {
            rewardAmount = (tagPrice * 0.1) / znsPrice; // 10% of purchase price in ZNS
        }
    }

    return rewardAmount;
};

/**
 * Step 4: Check if referral reward has already been claimed.
 * Checks IPFS first (permanent record), then MongoDB as backup.
 * @param {string} friendFullTagName - Friend's full tag (e.g. one5024.sui)
 * @param {string} referralTagName - Referrer's full tag (e.g. miguel.zelf)
 * @returns {Promise<Object|null>} Existing MongoDB record if found (for retry), or null if no claim
 * @throws {Error} "reward_already_claimed" if already claimed in IPFS or completed in MongoDB
 */
const _checkIfRewardAlreadyClaimed = async (friendFullTagName, referralTagName) => {
    // Check IPFS for existing reward record using rewardPrimaryKey
    const rewardPrimaryKey = `referral_${friendFullTagName}_${referralTagName}`;
    const ipfsRewards = await IPFS.filter("rewardPrimaryKey", rewardPrimaryKey);

    if (ipfsRewards && ipfsRewards.length > 0) {
        throw new Error("reward_already_claimed");
    }

    // Backup: Check MongoDB
    const rewardRecord = await ReferralRewardModel.findOne({
        tagName: friendFullTagName,
        referralTagName: referralTagName,
    });

    if (rewardRecord && rewardRecord.status === "completed") {
        throw new Error("reward_already_claimed");
    }

    // Return existing record (pending/failed) for retry, or null for new claim
    return rewardRecord;
};

/**
 * Claim referral reward
 * @param {string} tagName - Referrer tag name
 * @param {string} domain - Referrer domain
 * @param {string} friendTagName - Friend tag name
 * @param {string} friendDomain - Friend domain
 * @param {Object} authUser - Authenticated user (referrer)
 */
const claimReferralReward = async (tagName, domain, friendTagName, friendDomain, authUser) => {
    const referralTagName = tagName.includes(".") ? tagName : `${tagName}.${domain}`;
    const friendFullTagName = friendTagName.includes(".") ? friendTagName : `${friendTagName}.${friendDomain}`;

    // 1. Verify referral exists in IPFS/Arweave
    const friendRecord = await _findReferralRecordInStorage(referralTagName, friendFullTagName, friendDomain, authUser);

    // 2. Get referrer's tag from IPFS (addresses for reward record and ZNS transfer come from here)
    const referrerTagData = await searchTag({ tagName: referralTagName, domain }, {});

    if (referrerTagData.available || !referrerTagData.tagObject) {
        const err = new Error("referrer_tag_not_found");
        err.status = 404;
        throw err;
    }

    const referrerTagRecord = referrerTagData.tagObject;

    // 3. Check if already claimed (IPFS first, MongoDB backup)
    const rewardRecord = await _checkIfRewardAlreadyClaimed(friendFullTagName, referralTagName);

    // 4. Determine Reward (ZNS amount)
    const rewardAmount = _calculateReferralRewardAmount(friendRecord);

    // 5. Send ZNS and update record (addresses from referrer's tag in IPFS)
    const {
        signature,
        rewardAmount: amount,
        ipfsCid,
    } = await _sendReferralRewardAndUpdateRecord(
        rewardRecord,
        friendFullTagName,
        friendDomain,
        referralTagName,
        domain,
        referrerTagRecord,
        friendRecord,
        rewardAmount,
    );

    return { success: true, rewardAmount: amount, signature, ipfsCid };
};

module.exports = {
    verifyPaymentConfirmation,
    transferMyTag,
    updateOldTagObject,
    addDurationToTag,
    // Utility functions
    _confirmPaymentWithCoinbase,
    sendEmailReceipt,
    getMyReferrals,
    claimReferralReward,
};
