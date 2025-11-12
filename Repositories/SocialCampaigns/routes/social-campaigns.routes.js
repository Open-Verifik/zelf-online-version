const config = require("../../../Core/config");

const Controller = require("../controllers/social-campaigns.controller");
const Middleware = require("../middlewares/social-campaigns.middleware");

const base = "/social-campaigns";

module.exports = (server) => {
	const PATH = config.basePath(base);

	// Step 1: Provide social email
	server.post(`${PATH}/provide-email`, Middleware.provideEmailValidation, Controller.provideEmail);

	// Step 2: Validate social email with OTP
	server.post(`${PATH}/validate-email`, Middleware.validateOTPValidation, Controller.validateOTP);
};

/**
 * @swagger
 * components:
 *   schemas:
 *     ProvideEmailRequest:
 *       type: object
 *       required: [email]
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: Social email address to validate
 *           example: "user@example.com"
 *     ValidateOTPRequest:
 *       type: object
 *       required: [email, otp]
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: Email address that received the OTP
 *           example: "user@example.com"
 *         otp:
 *           type: string
 *           description: One-time password code received via email
 *           example: "123456"
 *     ProvideEmailResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: "OTP code has been sent to your email"
 *         email:
 *           type: string
 *           example: "user@example.com"
 *     ValidateOTPResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: "Email validated successfully"
 *         email:
 *           type: string
 *           example: "user@example.com"
 *         verified:
 *           type: boolean
 *           example: true
 */

/**
 * @swagger
 * /api/social-campaigns/provide-email:
 *   post:
 *     summary: Provide social email for validation
 *     description: Sends an OTP code to the provided email address for validation
 *     tags: [SocialCampaigns]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProvideEmailRequest'
 *     responses:
 *       200:
 *         description: OTP code sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProvideEmailResponse'
 *       400:
 *         description: Invalid request data
 *       429:
 *         description: Too many attempts. Please try again later
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/social-campaigns/validate-otp:
 *   post:
 *     summary: Validate social email with OTP
 *     description: Validates the OTP code sent to the email address
 *     tags: [SocialCampaigns]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ValidateOTPRequest'
 *     responses:
 *       200:
 *         description: Email validated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidateOTPResponse'
 *       400:
 *         description: Invalid request data or OTP code
 *       404:
 *         description: OTP not found or expired
 *       429:
 *         description: Too many validation attempts
 *       500:
 *         description: Internal server error
 */
