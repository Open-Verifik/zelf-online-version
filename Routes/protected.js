// routes/protected.js
const Router = require("@koa/router");

const router = new Router();

/**
 * @swagger
 * /protected:
 *   get:
 *     summary: Protected endpoint
 *     description: A protected endpoint that requires JWT authentication
 *     tags: [Protected]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Protected endpoint response
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProtectedResponse'
 *       401:
 *         description: Unauthorized - Invalid or missing JWT token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/protected", (ctx) => {
	ctx.body = `This is a protected endpoint. Welcome, ${ctx.state.user.username}!`;
});

require("./protected-repositories")(router);

module.exports = router;
