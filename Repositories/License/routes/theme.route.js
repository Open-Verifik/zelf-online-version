const Controller = require("../controllers/theme.controller");
const Middleware = require("../middlewares/theme.middleware");
const config = require("../../../Core/config");
const base = "/license/theme";

module.exports = (server) => {
	const PATH = config.basePath(base);

	server.get(`${PATH}`, Middleware.getThemeValidation, Controller.getThemeSettings);
	server.post(`${PATH}`, Middleware.updateThemeValidation, Controller.updateThemeSettings);
};

/**
 * @swagger
 * components:
 *   schemas:
 *     ThemeSettings:
 *       type: object
 *       properties:
 *         zns:
 *           type: object
 *           properties:
 *             enabled:
 *               type: boolean
 *               description: Whether ZNS theme is enabled
 *             darkMode:
 *               type: boolean
 *               description: Whether dark mode is enabled
 *             colors:
 *               type: object
 *               properties:
 *                 primary:
 *                   type: string
 *                   pattern: '^#[0-9A-Fa-f]{6}$'
 *                   description: Primary color hex code
 *                 secondary:
 *                   type: string
 *                   pattern: '^#[0-9A-Fa-f]{6}$'
 *                   description: Secondary color hex code
 *                 background:
 *                   type: string
 *                   pattern: '^#[0-9A-Fa-f]{6}$'
 *                   description: Background color hex code
 *                 backgroundSecondary:
 *                   type: string
 *                   pattern: '^#[0-9A-Fa-f]{6}$'
 *                   description: Secondary background color hex code
 *                 text:
 *                   type: string
 *                   pattern: '^#[0-9A-Fa-f]{6}$'
 *                   description: Primary text color hex code
 *                 textSecondary:
 *                   type: string
 *                   pattern: '^#[0-9A-Fa-f]{6}$'
 *                   description: Secondary text color hex code
 *                 textMuted:
 *                   type: string
 *                   pattern: '^#[0-9A-Fa-f]{6}$'
 *                   description: Muted text color hex code
 *                 header:
 *                   type: string
 *                   pattern: '^#[0-9A-Fa-f]{6}$'
 *                   description: Header background color hex code
 *                 headerText:
 *                   type: string
 *                   pattern: '^#[0-9A-Fa-f]{6}$'
 *                   description: Header text color hex code
 *                 button:
 *                   type: string
 *                   pattern: '^#[0-9A-Fa-f]{6}$'
 *                   description: Primary button color hex code
 *                 buttonText:
 *                   type: string
 *                   pattern: '^#[0-9A-Fa-f]{6}$'
 *                   description: Button text color hex code
 *                 buttonHover:
 *                   type: string
 *                   pattern: '^#[0-9A-Fa-f]{6}$'
 *                   description: Button hover color hex code
 *                 buttonSecondary:
 *                   type: string
 *                   pattern: '^#[0-9A-Fa-f]{6}$'
 *                   description: Secondary button color hex code
 *                 buttonSecondaryText:
 *                   type: string
 *                   pattern: '^#[0-9A-Fa-f]{6}$'
 *                   description: Secondary button text color hex code
 *                 border:
 *                   type: string
 *                   pattern: '^#[0-9A-Fa-f]{6}$'
 *                   description: Border color hex code
 *                 borderHover:
 *                   type: string
 *                   pattern: '^#[0-9A-Fa-f]{6}$'
 *                   description: Border hover color hex code
 *                 success:
 *                   type: string
 *                   pattern: '^#[0-9A-Fa-f]{6}$'
 *                   description: Success color hex code
 *                 successText:
 *                   type: string
 *                   pattern: '^#[0-9A-Fa-f]{6}$'
 *                   description: Success text color hex code
 *                 warning:
 *                   type: string
 *                   pattern: '^#[0-9A-Fa-f]{6}$'
 *                   description: Warning color hex code
 *                 warningText:
 *                   type: string
 *                   pattern: '^#[0-9A-Fa-f]{6}$'
 *                   description: Warning text color hex code
 *                 error:
 *                   type: string
 *                   pattern: '^#[0-9A-Fa-f]{6}$'
 *                   description: Error color hex code
 *                 errorText:
 *                   type: string
 *                   pattern: '^#[0-9A-Fa-f]{6}$'
 *                   description: Error text color hex code
 *                 card:
 *                   type: string
 *                   pattern: '^#[0-9A-Fa-f]{6}$'
 *                   description: Card background color hex code
 *                 cardBorder:
 *                   type: string
 *                   pattern: '^#[0-9A-Fa-f]{6}$'
 *                   description: Card border color hex code
 *                 shadow:
 *                   type: string
 *                   pattern: '^rgba\\(\\d+,\\s*\\d+,\\s*\\d+,\\s*[0-1]?\\.?\\d+\\)$'
 *                   description: Shadow color rgba value
 *         zelfkeys:
 *           type: object
 *           properties:
 *             enabled:
 *               type: boolean
 *               description: Whether ZelfKeys theme is enabled
 *             darkMode:
 *               type: boolean
 *               description: Whether dark mode is enabled
 *             colors:
 *               type: object
 *               properties:
 *                 primary:
 *                   type: string
 *                   pattern: '^#[0-9A-Fa-f]{6}$'
 *                   description: Primary color hex code
 *                 secondary:
 *                   type: string
 *                   pattern: '^#[0-9A-Fa-f]{6}$'
 *                   description: Secondary color hex code
 *                 background:
 *                   type: string
 *                   pattern: '^#[0-9A-Fa-f]{6}$'
 *                   description: Background color hex code
 *                 backgroundSecondary:
 *                   type: string
 *                   pattern: '^#[0-9A-Fa-f]{6}$'
 *                   description: Secondary background color hex code
 *                 text:
 *                   type: string
 *                   pattern: '^#[0-9A-Fa-f]{6}$'
 *                   description: Primary text color hex code
 *                 textSecondary:
 *                   type: string
 *                   pattern: '^#[0-9A-Fa-f]{6}$'
 *                   description: Secondary text color hex code
 *                 textMuted:
 *                   type: string
 *                   pattern: '^#[0-9A-Fa-f]{6}$'
 *                   description: Muted text color hex code
 *                 header:
 *                   type: string
 *                   pattern: '^#[0-9A-Fa-f]{6}$'
 *                   description: Header background color hex code
 *                 headerText:
 *                   type: string
 *                   pattern: '^#[0-9A-Fa-f]{6}$'
 *                   description: Header text color hex code
 *                 button:
 *                   type: string
 *                   pattern: '^#[0-9A-Fa-f]{6}$'
 *                   description: Primary button color hex code
 *                 buttonText:
 *                   type: string
 *                   pattern: '^#[0-9A-Fa-f]{6}$'
 *                   description: Button text color hex code
 *                 buttonHover:
 *                   type: string
 *                   pattern: '^#[0-9A-Fa-f]{6}$'
 *                   description: Button hover color hex code
 *                 buttonSecondary:
 *                   type: string
 *                   pattern: '^#[0-9A-Fa-f]{6}$'
 *                   description: Secondary button color hex code
 *                 buttonSecondaryText:
 *                   type: string
 *                   pattern: '^#[0-9A-Fa-f]{6}$'
 *                   description: Secondary button text color hex code
 *                 border:
 *                   type: string
 *                   pattern: '^#[0-9A-Fa-f]{6}$'
 *                   description: Border color hex code
 *                 borderHover:
 *                   type: string
 *                   pattern: '^#[0-9A-Fa-f]{6}$'
 *                   description: Border hover color hex code
 *                 success:
 *                   type: string
 *                   pattern: '^#[0-9A-Fa-f]{6}$'
 *                   description: Success color hex code
 *                 successText:
 *                   type: string
 *                   pattern: '^#[0-9A-Fa-f]{6}$'
 *                   description: Success text color hex code
 *                 warning:
 *                   type: string
 *                   pattern: '^#[0-9A-Fa-f]{6}$'
 *                   description: Warning color hex code
 *                 warningText:
 *                   type: string
 *                   pattern: '^#[0-9A-Fa-f]{6}$'
 *                   description: Warning text color hex code
 *                 error:
 *                   type: string
 *                   pattern: '^#[0-9A-Fa-f]{6}$'
 *                   description: Error color hex code
 *                 errorText:
 *                   type: string
 *                   pattern: '^#[0-9A-Fa-f]{6}$'
 *                   description: Error text color hex code
 *                 card:
 *                   type: string
 *                   pattern: '^#[0-9A-Fa-f]{6}$'
 *                   description: Card background color hex code
 *                 cardBorder:
 *                   type: string
 *                   pattern: '^#[0-9A-Fa-f]{6}$'
 *                   description: Card border color hex code
 *                 shadow:
 *                   type: string
 *                   pattern: '^rgba\\(\\d+,\\s*\\d+,\\s*\\d+,\\s*[0-1]?\\.?\\d+\\)$'
 *                   description: Shadow color rgba value
 *     ThemeResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         data:
 *           $ref: '#/components/schemas/ThemeSettings'
 * tags:
 *   - name: Theme
 *     description: Theme settings management operations
 */

/**
 * @swagger
 * /api/license/theme:
 *   get:
 *     summary: Get user's theme settings
 *     description: Retrieve the current user's theme settings for ZNS and ZelfKeys
 *     tags: [Theme]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Theme settings retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ThemeResponse'
 *       401:
 *         description: Unauthorized - User not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: User has no license or theme settings not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/license/theme:
 *   post:
 *     summary: Update user's theme settings
 *     description: Update the current user's theme settings for ZNS and ZelfKeys
 *     tags: [Theme]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ThemeSettings'
 *     responses:
 *       200:
 *         description: Theme settings updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ThemeResponse'
 *       400:
 *         description: Bad request - Invalid theme settings
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized - User not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: User has no license
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
