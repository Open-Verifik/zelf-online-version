// routes/protected.js
const Router = require("@koa/router");

const router = new Router();

// Protected route
router.get("/protected", (ctx) => {
	console.log({
		authUser: ctx.state.user,
	});

	ctx.body = `This is a protected endpoint. Welcome, ${ctx.state.user.username}!`;
});

require("./protected-repositories")(router);

module.exports = router;
