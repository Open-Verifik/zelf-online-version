const sendTransactionValidation = (ctx, next) => {
	const { signedTx } = ctx.request.body;

	if (!signedTx) {
		ctx.status = 400;
		ctx.body = { error: "Missing signed transaction" };
		return;
	}

	return next();
};

module.exports = {
	sendTransactionValidation,
};
