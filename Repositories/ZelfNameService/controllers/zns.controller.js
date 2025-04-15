const Module = require("../modules/zns.module");
const Modulev2 = require("../modules/zns.v2.module");
const ZNSTokenModule = require("../modules/zns-token.module");
const RevenueCatModule = require("../modules/revenue-cat.module");
const { updateOldZelfNameObject } = require("../modules/my-zns.module");
const ZNSRecoveryModule = require("../modules/zns-recovery.module");

const searchZelfName = async (ctx) => {
	try {
		const data = await Module.searchZelfName(ctx.request.query, ctx.state.user);

		if (data && data.available && data.zelfName.includes("zelfpay")) {
			const zelfName = data.zelfName.replace("zelfpay", "zelf");

			const zelfNameData = await Module.searchZelfName({ zelfName }, ctx.state.user);

			const zelfNameObject = zelfNameData.ipfs?.length ? zelfNameData.ipfs[0] : zelfNameData.arweave[0];

			if (zelfNameObject) {
				ctx.body = {
					data: await Modulev2.createZelfPay(zelfNameObject, ctx.state.user),
				};

				return;
			}
		}

		ctx.body = { data };
	} catch (error) {
		console.error({ error });
		ctx.status = error.status || 500;

		ctx.body = { error: error.message };
	}
};

const searchZelfName_v2 = async (ctx) => {
	try {
		let data = await Modulev2.searchZelfName(ctx.request.query, ctx.state.user);

		if (data && data.available && data.zelfName.includes("zelfpay")) {
			const zelfName = data.zelfName.replace("zelfpay", "zelf");

			const zelfNameData = await Module.searchZelfName({ zelfName }, ctx.state.user);

			const zelfNameObject = zelfNameData.ipfs?.length ? zelfNameData.ipfs[0] : zelfNameData.arweave[0];

			if (zelfNameObject) {
				ctx.body = {
					data: await Modulev2.createZelfPay(zelfNameObject, ctx.state.user),
				};

				return;
			}
		} else if (data && data.ipfs?.length) {
			const zelfNameObject = data.ipfs[0];

			if (!zelfNameObject.publicData.registeredAt) {
				data = await updateOldZelfNameObject(zelfNameObject);
			}
		}

		ctx.body = { data };
	} catch (error) {
		console.error({ error });
		ctx.status = error.status || 500;

		ctx.body = { error: error.message };
	}
};

const leaseZelfName = async (ctx) => {
	try {
		const data = await Module.leaseZelfName({ ...ctx.request.body, zelfName: `${ctx.request.body.zelfName}`.toLowerCase() }, ctx.state.user);

		ctx.body = { data };
	} catch (error) {
		console.error({ error });

		ctx.status = error.status || 500;

		ctx.body = { error: error.message };
	}
};

const leaseZelfName_v2 = async (ctx) => {
	try {
		const data = await Modulev2.leaseZelfName({ ...ctx.request.body, zelfName: `${ctx.request.body.zelfName}`.toLowerCase() }, ctx.state.user);

		ctx.body = { data };
	} catch (error) {
		console.error({ error });

		ctx.status = error.status || 500;

		ctx.body = { error: error.message };
	}
};

const leaseRecovery = async (ctx) => {
	try {
		const data = await ZNSRecoveryModule.leaseRecovery(
			{ ...ctx.request.body, zelfName: `${ctx.request.body.zelfName}`.toLowerCase() },
			ctx.state.user
		);

		ctx.body = { data };
	} catch (error) {
		console.error({ error });

		ctx.status = error.status || 500;

		ctx.body = { error: error.message };
	}
};

const leaseConfirmation = async (ctx) => {
	try {
		const data = await Modulev2.leaseConfirmation(ctx.request.body, ctx.state.user);

		ctx.body = { data };
	} catch (error) {
		console.error({ error });

		ctx.status = error.status || 500;

		ctx.body = { error: error.message };
	}
};

const leaseConfirmation_v2 = async (ctx) => {
	try {
		const data = await Modulev2.leaseConfirmation(ctx.request.body, ctx.state.user);

		ctx.body = { data };
	} catch (error) {
		console.error({ error });

		ctx.status = error.status || 500;

		ctx.body = { error: error.message };
	}
};

const previewZelfName = async (ctx) => {
	try {
		const data = await Module.previewZelfName(
			{
				...ctx.request.body,
				zelfName: `${ctx.request.body.zelfName}`.toLowerCase(),
			},
			ctx.state.user
		);

		ctx.body = { data };
	} catch (error) {
		console.error({ error });

		ctx.status = error.status || 500;

		ctx.body = { error: error.message };
	}
};

const previewZelfProof = async (ctx) => {
	try {
		const data = await Module.previewZelfProof(ctx.request.body.zelfProof, ctx.state.user);

		ctx.body = { data };
	} catch (error) {
		console.error({ error });

		ctx.status = error.status || 500;

		ctx.body = { error: error.message };
	}
};

const decryptZelfName = async (ctx) => {
	try {
		const data = await Module.decryptZelfName(
			{
				...ctx.request.body,
				zelfName: `${ctx.request.body.zelfName}`.toLowerCase(),
			},
			ctx.state.user
		);

		ctx.body = { data };
	} catch (error) {
		console.error({ error });

		ctx.status = error.status || 500;

		ctx.body = { error: error.message };
	}
};

const decryptZelfName_v2 = async (ctx) => {
	try {
		const data = await Modulev2.decryptZelfName(
			{
				...ctx.request.body,
				zelfName: `${ctx.request.body.zelfName}`.toLowerCase(),
			},
			ctx.state.user
		);

		ctx.body = { data };
	} catch (error) {
		console.error({ error });

		ctx.status = error.status || 500;

		ctx.body = { error: error.message };
	}
};

const leaseOfflineZelfName = async (ctx) => {
	try {
		const data = await Module.leaseOffline(ctx.request.body, ctx.state.user);

		ctx.body = { data };
	} catch (error) {
		console.error({ error });

		ctx.status = error.status || 500;

		ctx.body = { error: error.message };
	}
};

const leaseOfflineZelfName_v2 = async (ctx) => {
	try {
		ctx.request.body.zelfName = `${ctx.request.body.zelfName}`.toLowerCase();

		const data = await Modulev2.leaseOffline(ctx.request.body, ctx.state.user);

		ctx.body = { data };
	} catch (error) {
		console.error({ error });

		ctx.status = error.status || 500;

		ctx.body = { error: error.message };
	}
};

const revenueCatWebhook = async (ctx) => {
	try {
		const data = await RevenueCatModule.webhookHandler(ctx.request.body);

		ctx.body = { data };
	} catch (error) {
		console.error(error);

		ctx.status = error.status || 500;

		ctx.body = { error: error.message };
	}
};

const referralRewards = async (ctx) => {
	try {
		const data = await ZNSTokenModule.releaseReferralRewards(ctx.state.user);

		ctx.body = { data };
	} catch (error) {
		console.error({ error });

		ctx.status = error.status || 500;

		ctx.body = { error: error.message };
	}
};

/**
 * purchase rewards for user
 * @param {Object} ctx
 * @returns {Object} data
 */
const purchaseRewards = async (ctx) => {
	try {
		const data = await ZNSTokenModule.releasePurchaseRewards(ctx.state.user);

		ctx.body = { data };
	} catch (error) {
		console.error({ error });

		ctx.status = error.status || 500;

		ctx.body = { error: error.message };
	}
};

const update = async (ctx) => {
	try {
		const data = await Module.update(ctx.request.body, ctx.state.user);

		ctx.body = { data };
	} catch (error) {
		console.error({ error });

		ctx.status = error.status || 500;

		ctx.body = { error: error.message };
	}
};

const zelfPay = async (ctx) => {
	try {
		const data = await Module.zelfPay(ctx.request.query, ctx.state.user);

		ctx.body = { data };
	} catch (error) {
		console.error({ error });

		ctx.status = error.status || 500;

		ctx.body = { error: error.message };
	}
};

module.exports = {
	searchZelfName,
	searchZelfName_v2,
	leaseZelfName,
	leaseZelfName_v2,
	leaseConfirmation,
	leaseConfirmation_v2,
	previewZelfName,
	previewZelfProof,
	decryptZelfName,
	decryptZelfName_v2,
	leaseOfflineZelfName,
	leaseOfflineZelfName_v2,
	revenueCatWebhook,
	referralRewards,
	purchaseRewards,
	update,
	zelfPay,
	leaseRecovery,
};
