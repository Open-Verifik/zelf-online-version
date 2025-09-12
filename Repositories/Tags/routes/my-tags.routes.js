const config = require("../../../Core/config");

const Controller = require("../controllers/my-tags.controller");

const Middleware = require("../middlewares/my-tags.middleware");

const base = "/my-tags";

module.exports = (server) => {
	const PATH = config.basePath(base);

	// transfer tag
	server.post(`${PATH}/transfer`, Middleware.transferValidation, Controller.transferTag);

	// pay for a tag (new or renew)
	server.get(`${PATH}/pay`, Middleware.howToRenewValidation, Controller.howToRenewTag);

	// renew tag
	server.post(`${PATH}/renew`, Middleware.renewValidation, Controller.renewTag);
};

/**
 * @swagger
 * components:
 *   schemas:
 *     TagTransferRequest:
 *       type: object
 *       required: [tagName, newOwnerEmail, faceBase64]
 *       properties:
 *         tagName:
 *           type: string
 *           description: Tag name to transfer (supports multiple domains)
 *           example: "username.avax"
 *         domain:
 *           type: string
 *           description: Specific domain for the tag
 *           example: "avax"
 *         newOwnerEmail:
 *           type: string
 *           format: email
 *           description: Email of the new owner
 *           example: "newowner@example.com"
 *         faceBase64:
 *           type: string
 *           description: Base64 encoded face image for biometric verification
 *           example: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ..."
 *         os:
 *           type: string
 *           enum: [DESKTOP, ANDROID, IOS]
 *           description: Operating system
 *           example: "DESKTOP"
 *         captchaToken:
 *           type: string
 *           description: Captcha token for validation
 *           example: "captcha_token_here"
 *     TagRenewRequest:
 *       type: object
 *       required: [tagName, duration]
 *       properties:
 *         tagName:
 *           type: string
 *           description: Tag name to renew (supports multiple domains)
 *           example: "username.btc"
 *         domain:
 *           type: string
 *           description: Specific domain for the tag
 *           example: "btc"
 *         duration:
 *           type: string
 *           enum: ["1", "2", "3", "4", "5", "lifetime"]
 *           description: Renewal duration in years or lifetime
 *           example: "1"
 *         os:
 *           type: string
 *           enum: [DESKTOP, ANDROID, IOS]
 *           description: Operating system
 *           example: "DESKTOP"
 *         captchaToken:
 *           type: string
 *           description: Captcha token for validation
 *           example: "captcha_token_here"
 *     TagTransferResponse:
 *       type: object
 *       properties:
 *         data:
 *           type: object
 *           properties:
 *             success:
 *               type: boolean
 *               description: Whether the transfer was successful
 *               example: true
 *             tagName:
 *               type: string
 *               description: The transferred tag name
 *               example: "username.avax"
 *             domain:
 *               type: string
 *               description: The domain of the transferred tag
 *               example: "avax"
 *             newOwner:
 *               type: string
 *               description: Email of the new owner
 *               example: "newowner@example.com"
 *     TagRenewResponse:
 *       type: object
 *       properties:
 *         data:
 *           type: object
 *           properties:
 *             success:
 *               type: boolean
 *               description: Whether the renewal was successful
 *               example: true
 *             tagName:
 *               type: string
 *               description: The renewed tag name
 *               example: "username.btc"
 *             domain:
 *               type: string
 *               description: The domain of the renewed tag
 *               example: "btc"
 *             newExpiryDate:
 *               type: string
 *               format: date-time
 *               description: New expiry date
 *               example: "2025-12-31T23:59:59.000Z"
 *     TagPaymentInfo:
 *       type: object
 *       properties:
 *         data:
 *           type: object
 *           properties:
 *             tagName:
 *               type: string
 *               description: The tag name
 *               example: "username.tech"
 *             domain:
 *               type: string
 *               description: The domain of the tag
 *               example: "tech"
 *             price:
 *               type: number
 *               description: Price in cents
 *               example: 75
 *             currency:
 *               type: string
 *               description: Currency code
 *               example: "USD"
 *             paymentMethods:
 *               type: array
 *               items:
 *                 type: string
 *               description: Available payment methods
 *               example: ["USDC", "ETH", "BTC"]
 * tags:
 *   - name: My Tags
 *     description: User-specific tag management operations
 */

/**
 * @swagger
 * /api/my-tags/transfer:
 *   post:
 *     summary: Transfer tag ownership - Multi-domain support
 *     description: Transfer ownership of a tag to another user. Supports multiple domains.
 *     tags: [My Tags]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TagTransferRequest'
 *     responses:
 *       200:
 *         description: Tag transferred successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TagTransferResponse'
 *       403:
 *         description: Session not active, rate limit exceeded, or access forbidden
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/SessionError'
 *                 - $ref: '#/components/schemas/LimitError'
 *                 - type: object
 *                   properties:
 *                     validationError:
 *                       type: string
 *                       example: "Access forbidden"
 *       409:
 *         description: Validation error, captcha failed, or domain not supported
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/CaptchaError'
 *                 - $ref: '#/components/schemas/DomainError'
 *                 - type: object
 *                   properties:
 *                     validationError:
 *                       type: string
 *                       example: "Invalid tag name"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/my-tags/pay:
 *   get:
 *     summary: Get tag payment information - Multi-domain support
 *     description: Get payment information for a tag renewal or purchase. Supports multiple domains.
 *     tags: [My Tags]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: tagName
 *         required: true
 *         schema:
 *           type: string
 *         description: Tag name to get payment info for (supports multiple domains)
 *         example: "username.bdag"
 *       - in: query
 *         name: domain
 *         schema:
 *           type: string
 *         description: Specific domain for the tag
 *         example: "bdag"
 *       - in: query
 *         name: duration
 *         schema:
 *           type: string
 *           enum: ["1", "2", "3", "4", "5", "lifetime"]
 *         description: Renewal duration
 *         example: "1"
 *     responses:
 *       200:
 *         description: Payment information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TagPaymentInfo'
 *       403:
 *         description: Session not active or rate limit exceeded
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/SessionError'
 *                 - $ref: '#/components/schemas/LimitError'
 *       409:
 *         description: Validation error or domain not supported
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/DomainError'
 *                 - type: object
 *                   properties:
 *                     validationError:
 *                       type: string
 *                       example: "Invalid tag name"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/my-tags/renew:
 *   post:
 *     summary: Renew tag lease - Multi-domain support
 *     description: Renew the lease duration for a tag. Supports multiple domains.
 *     tags: [My Tags]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TagRenewRequest'
 *     responses:
 *       200:
 *         description: Tag renewed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TagRenewResponse'
 *       403:
 *         description: Session not active, rate limit exceeded, or access forbidden
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/SessionError'
 *                 - $ref: '#/components/schemas/LimitError'
 *                 - type: object
 *                   properties:
 *                     validationError:
 *                       type: string
 *                       example: "Access forbidden"
 *       409:
 *         description: Validation error, captcha failed, or domain not supported
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/CaptchaError'
 *                 - $ref: '#/components/schemas/DomainError'
 *                 - type: object
 *                   properties:
 *                     validationError:
 *                       type: string
 *                       example: "Invalid duration"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
