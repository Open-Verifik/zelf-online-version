/**
 * Reward and RevenueCat routes on /api/tags and /api/zelf-ids (2026-10-01 audit). They called
 * functions that never existed and always failed. The purchase reward release is an in-memory
 * fake here: it moves real tokens.
 */
jest.mock("../../Repositories/Tags/modules/tags-token.module", () => ({ releasePurchaseRewards: jest.fn() }));
// stellar-hd-wallet is ESM and cannot load under Jest; the controllers only need it at runtime.
jest.mock("../../Repositories/Wallet/modules/stellar", () => ({ createStellarWallet: jest.fn(), healPublicDataXlm: jest.fn() }));

const TagsTokenModule = require("../../Repositories/Tags/modules/tags-token.module");
const RewardRoutes = require("../../Repositories/Tags/controllers/reward-routes.controller");

const ctx = () => ({ request: { body: {} }, state: { user: { superAdminId: "admin" } }, status: 404, body: undefined });

beforeEach(() => {
	jest.clearAllMocks();
	jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => jest.restoreAllMocks());

describe("purchase-rewards", () => {
	test("releases the oldest pending Tags purchase reward", async () => {
		TagsTokenModule.releasePurchaseRewards.mockResolvedValue({ _id: "p1", status: "completed", signature: "sig-1" });
		const context = ctx();

		await RewardRoutes.purchaseRewards(context);

		expect(TagsTokenModule.releasePurchaseRewards).toHaveBeenCalledTimes(1);
		expect(context.status).toBe(404); // untouched: Koa answers 200 once a body is set
		expect(context.body).toEqual({ data: { _id: "p1", status: "completed", signature: "sig-1" } });
	});

	test("answers 202 while the transfer is not confirmed yet", async () => {
		TagsTokenModule.releasePurchaseRewards.mockResolvedValue({ _id: "p1", status: "processing", pending: true, signature: "sig-1" });
		const context = ctx();

		await RewardRoutes.purchaseRewards(context);

		expect(context.status).toBe(202);
		expect(context.body.data.pending).toBe(true);
	});

	test("keeps the status and code of a transfer that was not sent", async () => {
		const error = new Error("reward_transfer_not_sent");
		error.status = 503;
		error.code = "reward_transfer_not_sent";
		TagsTokenModule.releasePurchaseRewards.mockRejectedValue(error);
		const context = ctx();

		await RewardRoutes.purchaseRewards(context);

		expect(context.status).toBe(503);
		expect(context.body.code).toBe("reward_transfer_not_sent");
	});
});

test("referral-rewards answers 410 and points to the per-referral claim", async () => {
	const context = ctx();

	await RewardRoutes.referralRewardsRetired(context);

	expect(context.status).toBe(410);
	expect(context.body).toEqual({
		code: "referral_rewards_batch_retired",
		message: "Referral rewards are claimed per referral.",
		replacement: "POST /api/my-tags/referrals/claim",
	});
	expect(TagsTokenModule.releasePurchaseRewards).not.toHaveBeenCalled();
});

test("/api/tags/revenue-cat answers 410 and points to the Zelf ID route", async () => {
	const context = ctx();

	await RewardRoutes.tagsRevenueCatRetired(context);

	expect(context.status).toBe(410);
	expect(context.body).toMatchObject({ code: "revenue_cat_route_moved", replacement: "POST /api/zelf-ids/revenue-cat" });
});

describe("route wiring", () => {
	const routesOf = (routesFile, controllerFile, middlewareFile, controller) => {
		const middleware = new Proxy({}, { get: (_target, name) => Object.assign(async () => {}, { middlewareName: String(name) }) });
		let routes;
		jest.isolateModules(() => {
			jest.doMock(controllerFile, () => controller);
			jest.doMock(middlewareFile, () => middleware);
			const server = { routes: [], get() {}, delete() {}, put() {}, patch() {} };
			server.post = (path, ...handlers) => server.routes.push({ path, handlers });
			require(routesFile)(server);
			routes = server.routes;
		});
		return (path) => routes.find((route) => route.path === path).handlers.map((handler) => handler.middlewareName || handler);
	};

	test("Tags: revenue-cat skips validation and answers 410; reward routes keep the super admin check", () => {
		const controller = require("../../Repositories/Tags/controllers/tags.controller.js");
		const route = routesOf(
			"../../Repositories/Tags/routes/tags.routes",
			"../../Repositories/Tags/controllers/tags.controller",
			"../../Repositories/Tags/middlewares/tags.middleware",
			controller
		);

		expect(route("/api/tags/revenue-cat")).toEqual([RewardRoutes.tagsRevenueCatRetired]);
		expect(route("/api/tags/purchase-rewards")).toEqual(["referralRewardsValidation", RewardRoutes.purchaseRewards]);
		expect(route("/api/tags/referral-rewards")).toEqual(["referralRewardsValidation", RewardRoutes.referralRewardsRetired]);
	});

	test("Zelf IDs: purchase and referral rewards use the shared handlers behind the super admin check", () => {
		const controller = require("../../Repositories/ZelfID/controllers/zelf-id.controller.js");
		const route = routesOf(
			"../../Repositories/ZelfID/routes/zelf-ids.routes",
			"../../Repositories/ZelfID/controllers/zelf-id.controller",
			"../../Repositories/ZelfID/middlewares/zelf-id.middleware",
			controller
		);

		expect(route("/api/zelf-ids/purchase-rewards")).toEqual(["referralRewardsValidation", RewardRoutes.purchaseRewards]);
		expect(route("/api/zelf-ids/referral-rewards")).toEqual(["referralRewardsValidation", RewardRoutes.referralRewardsRetired]);
	});
});
