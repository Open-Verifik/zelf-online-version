// routes/protected.js
const Router = require("@koa/router");

const router = new Router();

// Protected route
router.get("/protected", (ctx) => {
	ctx.body = `This is a protected endpoint. Welcome, ${ctx.state.user.username}!`;
});

require("./protected-repositories")(router);

module.exports = router;
