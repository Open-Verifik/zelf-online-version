const HumanAuthnOnboarding = require("../models/human-authn-onboarding.model");
const { getMyLicense } = require("../../License/modules/license.module");

const STEP_FIELDS = ["playCreate", "playPreview", "playDecrypt"];

const emptyProgress = () => ({
	playCreate: { complete: false },
	playPreview: { complete: false },
	playDecrypt: { complete: false },
});

const getStaffEmail = (authUser) => authUser?.email || authUser?.staffEmail || null;

const resolveDomainName = async (authUser) => {
	if (!authUser) return null;

	try {
		const { myLicense } = await getMyLicense(authUser, true);
		return myLicense?.domainConfig?.name || null;
	} catch (error) {
		console.error("HumanAuthn onboarding: failed to resolve domain", error.message);
		return null;
	}
};

/**
 * Record a successful Play Area step for the authenticated user's license domain.
 * First success wins — later calls do not overwrite an already-complete step.
 */
const recordStep = async (authUser, step, payload = {}) => {
	if (!authUser || !STEP_FIELDS.includes(step)) {
		return null;
	}

	const domainName = await resolveDomainName(authUser);

	if (!domainName) {
		return null;
	}

	const existing = await HumanAuthnOnboarding.findOne({ domainName }).lean();

	if (existing?.[step]?.complete) {
		return existing;
	}

	const update = {
		[`${step}.complete`]: true,
		[`${step}.completedAt`]: new Date(),
		[`${step}.staffEmail`]: getStaffEmail(authUser),
	};

	if (step === "playCreate") {
		if (payload.zelfID) {
			update[`${step}.zelfID`] = payload.zelfID;
		}
		if (payload.identifier) {
			update[`${step}.identifier`] = payload.identifier;
		}
	}

	return HumanAuthnOnboarding.findOneAndUpdate(
		{ domainName },
		{
			$set: update,
			$setOnInsert: { domainName },
		},
		{ upsert: true, new: true }
	).lean();
};

const getProgressForAuthUser = async (authUser) => {
	const domainName = authUser ? await resolveDomainName(authUser) : null;

	if (!domainName) {
		return {
			domainName: null,
			...emptyProgress(),
		};
	}

	const doc = await HumanAuthnOnboarding.findOne({ domainName }).lean();
	const result = {
		domainName,
		...emptyProgress(),
	};

	for (const step of STEP_FIELDS) {
		if (doc?.[step]?.complete) {
			result[step] = {
				complete: true,
				completedAt: doc[step].completedAt,
				staffEmail: doc[step].staffEmail,
				...(step === "playCreate"
					? {
							zelfID: doc[step].zelfID,
							identifier: doc[step].identifier,
						}
					: {}),
			};
		}
	}

	return result;
};

module.exports = {
	recordStep,
	getProgressForAuthUser,
	resolveDomainName,
	STEP_FIELDS,
};
