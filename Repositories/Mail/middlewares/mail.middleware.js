const webhookValidator = async (ctx, next) => {
	await next();
};

module.exports = {
	webhookValidator,
};
