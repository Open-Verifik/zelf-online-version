const OnboardingModule = require("../modules/human-authn-onboarding.module");
const { errorHandler } = require("../../../Core/http-handler");

const onboardingProgress = async (ctx) => {
	try {
		const data = await OnboardingModule.getProgressForAuthUser(ctx.state.user);

		ctx.body = { data };
	} catch (error) {
		const _exception = errorHandler(error, ctx);

		ctx.status = _exception.status;
		ctx.body = { message: _exception.message, code: _exception.code };
	}
};

module.exports = {
	onboardingProgress,
};
