const Module = require("../modules/zelf-proof.module");
const ClientModule = require("../../Client/modules/client.module");

const encrypt = async (ctx) => {
	try {
		const data = await Module.encrypt(ctx.request.body, ctx.state.user);

		ctx.body = { ...data };

		if (ctx.state.user) {
			await ClientModule.update(
				{
					increaseApiUsage: true,
				},
				ctx.state.user
			);
		}
	} catch (error) {
		console.error(error);

		ctx.status = error.status || 500;

		ctx.body = { error: error.message };
	}
};

const encryptQRCode = async (ctx) => {
	try {
		const data = await Module.encryptQRCode(ctx.request.body, ctx.state.user);

		ctx.body = { ...data };

		if (ctx.state.user) {
			await ClientModule.update(
				{
					increaseApiUsage: true,
				},
				ctx.state.user
			);
		}
	} catch (error) {
		console.error(error);

		ctx.status = error.status || 500;

		ctx.body = { error: error.message };
	}
};

const decrypt = async (ctx) => {
	try {
		const data = await Module.decrypt(ctx.request.body, ctx.state.user);

		ctx.body = { ...data };

		if (ctx.state.user) {
			await ClientModule.update(
				{
					increaseApiUsage: true,
				},
				ctx.state.user
			);
		}
	} catch (error) {
		console.error(error);

		ctx.status = error.status || 500;

		ctx.body = { error: error.message };
	}
};

const preview = async (ctx) => {
	try {
		const data = await Module.preview(ctx.request.body, ctx.state.user);

		ctx.body = { ...data };

		if (ctx.state.user) {
			await ClientModule.update(
				{
					increaseApiUsage: true,
				},
				ctx.state.user
			);
		}
	} catch (error) {
		console.error({ error });

		ctx.status = error.status || 500;

		ctx.body = { error: error.message };
	}
};

module.exports = {
	encrypt,
	encryptQRCode,
	decrypt,
	preview,
};
