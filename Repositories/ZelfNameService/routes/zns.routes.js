const config = require("../../../Core/config");

const Controller = require("../controllers/zns.controller");

const Middleware = require("../middlewares/zns.middleware");

const base = "/zelf-name-service";

module.exports = (server) => {
	const PATH = config.basePath(base);

	// Route definitions
	server.get(`${PATH}/v2/search`, Middleware.getValidation, Controller.searchZelfName_v2);
	server.post(`${PATH}/v2/search`, Middleware.getValidation, Controller.searchZelfName_v2);
	server.post(`${PATH}/v2/lease`, Middleware.leaseValidation, Controller.leaseZelfName_v2);
	server.post(`${PATH}/v2/lease-recovery`, Middleware.leaseRecoveryValidation, Controller.leaseRecovery);

	server.post(`${PATH}/v2/lease-offline`, Middleware.leaseOfflineValidation, Controller.leaseOfflineZelfName_v2);
	server.post(`${PATH}/v2/lease-confirmation`, Middleware.leaseConfirmationValidation, Controller.leaseConfirmation_v2);
	server.post(`${PATH}/v2/preview`, Middleware.previewValidation, Controller.previewZelfName_v2);
	server.post(`${PATH}/preview-zelfproof`, Middleware.previewZelfProofValidation, Controller.previewZelfProof);
	server.post(`${PATH}/v2/decrypt`, Middleware.decryptValidation, Controller.decryptZelfName_v2);
	server.post(`${PATH}/revenue-cat`, Middleware.revenueCatWebhookValidation, Controller.revenueCatWebhook);
	server.post(`${PATH}/purchase-rewards`, Middleware.referralRewardsValidation, Controller.purchaseRewards);
	server.post(`${PATH}/referral-rewards`, Middleware.referralRewardsValidation, Controller.referralRewards);
	server.put(`${PATH}/:zelfName`, Middleware.updateValidation, Controller.update);
};

/**
 * @swagger
 * components:
 *   schemas:
 *     ZelfNameSearchRequest:
 *       type: object
 *       properties:
 *         zelfName:
 *           type: string
 *           description: Zelf name to search for
 *           example: "username.zelf"
 *         key:
 *           type: string
 *           description: Search key for advanced search
 *           example: "email"
 *         value:
 *           type: string
 *           description: Search value for advanced search
 *           example: "user@example.com"
 *         os:
 *           type: string
 *           enum: [DESKTOP, ANDROID, IOS]
 *           description: Operating system
 *           example: "DESKTOP"
 *         captchaToken:
 *           type: string
 *           description: Captcha token for validation
 *           example: "captcha_token_here"
 *     ZelfNameLeaseRequest:
 *       type: object
 *       required: [zelfName, faceBase64, type, os]
 *       properties:
 *         zelfName:
 *           type: string
 *           description: Zelf name to lease (must end with .zelf)
 *           example: "username.zelf"
 *         faceBase64:
 *           type: string
 *           description: Base64 encoded face image for biometric verification
 *           example: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ..."
 *         type:
 *           type: string
 *           enum: [create, import]
 *           description: Type of lease operation
 *           example: "create"
 *         os:
 *           type: string
 *           enum: [DESKTOP, ANDROID, IOS]
 *           description: Operating system
 *           example: "DESKTOP"
 *         captchaToken:
 *           type: string
 *           description: Captcha token for validation
 *           example: "captcha_token_here"
 *         password:
 *           type: string
 *           description: Password for wallet (required for import type)
 *           example: "secure_password"
 *         mnemonic:
 *           type: string
 *           description: Mnemonic phrase (required for import type)
 *           example: "word1 word2 word3..."
 *         wordsCount:
 *           type: number
 *           description: Number of words for mnemonic (required for create type)
 *           example: 12
 *         addServerPassword:
 *           type: boolean
 *           description: Whether to add server password
 *           example: false
 *     ZelfNameLeaseRecoveryRequest:
 *       type: object
 *       required: [zelfProof, newZelfName, faceBase64, password, os]
 *       properties:
 *         zelfProof:
 *           type: string
 *           description: Zelf proof for recovery
 *           example: "zelf_proof_data"
 *         newZelfName:
 *           type: string
 *           description: New zelf name for recovery (must end with .zelf)
 *           example: "newusername.zelf"
 *         faceBase64:
 *           type: string
 *           description: Base64 encoded face image
 *           example: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ..."
 *         password:
 *           type: string
 *           description: Password for recovery
 *           example: "secure_password"
 *         os:
 *           type: string
 *           enum: [DESKTOP, ANDROID, IOS]
 *           description: Operating system
 *           example: "DESKTOP"
 *         captchaToken:
 *           type: string
 *           description: Captcha token for validation
 *           example: "captcha_token_here"
 *     ZelfNameLeaseConfirmationRequest:
 *       type: object
 *       required: [zelfName, coin, network]
 *       properties:
 *         zelfName:
 *           type: string
 *           description: Zelf name for lease confirmation
 *           example: "username.zelf"
 *         coin:
 *           type: string
 *           description: Cryptocurrency for payment
 *           example: "USDC"
 *         network:
 *           type: string
 *           enum: [coinbase, CB, ETH, SOL, BTC]
 *           description: Payment network
 *           example: "ETH"
 *     ZelfNamePreviewRequest:
 *       type: object
 *       required: [zelfName, os]
 *       properties:
 *         zelfName:
 *           type: string
 *           description: Zelf name to preview
 *           example: "username.zelf"
 *         os:
 *           type: string
 *           enum: [DESKTOP, ANDROID, IOS]
 *           description: Operating system
 *           example: "DESKTOP"
 *         captchaToken:
 *           type: string
 *           description: Captcha token for validation
 *           example: "captcha_token_here"
 *     ZelfProofPreviewRequest:
 *       type: object
 *       required: [zelfProof, os]
 *       properties:
 *         zelfProof:
 *           type: string
 *           description: Zelf proof to preview
 *           example: "zelf_proof_data"
 *         os:
 *           type: string
 *           enum: [DESKTOP, ANDROID, IOS]
 *           description: Operating system
 *           example: "DESKTOP"
 *         captchaToken:
 *           type: string
 *           description: Captcha token for validation
 *           example: "captcha_token_here"
 *     ZelfNameDecryptRequest:
 *       type: object
 *       required: [faceBase64, zelfName, os]
 *       properties:
 *         faceBase64:
 *           type: string
 *           description: Base64 encoded face image for biometric verification
 *           example: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ..."
 *         password:
 *           type: string
 *           description: Password for decryption
 *           example: "secure_password"
 *         zelfName:
 *           type: string
 *           description: Zelf name to decrypt
 *           example: "username.zelf"
 *         addServerPassword:
 *           type: boolean
 *           description: Whether to add server password
 *           example: false
 *         os:
 *           type: string
 *           enum: [DESKTOP, ANDROID, IOS]
 *           description: Operating system
 *           example: "DESKTOP"
 *         captchaToken:
 *           type: string
 *           description: Captcha token for validation
 *           example: "captcha_token_here"
 *     ZelfNameOfflineLeaseRequest:
 *       type: object
 *       required: [zelfName, zelfProof, zelfProofQRCode]
 *       properties:
 *         zelfName:
 *           type: string
 *           description: Zelf name to lease offline (must end with .zelf)
 *           example: "username.zelf"
 *         zelfProof:
 *           type: string
 *           description: Zelf proof for offline lease
 *           example: "zelf_proof_data"
 *         zelfProofQRCode:
 *           type: string
 *           description: QR code data for zelf proof
 *           example: "qr_code_data"
 *     RevenueCatWebhookRequest:
 *       type: object
 *       required: [product_id, period_type, currency, price, id, app_id, transaction_id, environment]
 *       properties:
 *         product_id:
 *           type: string
 *           description: Product ID from RevenueCat
 *           example: "premium_subscription"
 *         period_type:
 *           type: string
 *           description: Period type (trial, intro, normal)
 *           example: "normal"
 *         currency:
 *           type: string
 *           description: Currency code
 *           example: "USD"
 *         price:
 *           type: number
 *           description: Price in cents
 *           example: 999
 *         id:
 *           type: string
 *           description: Event ID
 *           example: "event_123"
 *         app_id:
 *           type: string
 *           description: App ID
 *           example: "app_123"
 *         transaction_id:
 *           type: string
 *           description: Transaction ID
 *           example: "txn_123"
 *         environment:
 *           type: string
 *           description: Environment (sandbox, production)
 *           example: "production"
 *     ZelfNameUpdateRequest:
 *       type: object
 *       required: [duration]
 *       properties:
 *         duration:
 *           type: string
 *           enum: ["1", "2", "3", "4", "5", "lifetime"]
 *           description: Lease duration in years or lifetime
 *           example: "1"
 *     ZelfNameSearchResponse:
 *       type: object
 *       properties:
 *         data:
 *           type: object
 *           properties:
 *             available:
 *               type: boolean
 *               description: Whether the zelf name is available
 *               example: true
 *             zelfName:
 *               type: string
 *               description: The zelf name that was searched
 *               example: "username.zelf"
 *             ipfs:
 *               type: array
 *               items:
 *                 type: object
 *               description: IPFS data if available
 *             arweave:
 *               type: array
 *               items:
 *                 type: object
 *               description: Arweave data if available
 *     ZelfNameLeaseResponse:
 *       type: object
 *       properties:
 *         data:
 *           type: object
 *           properties:
 *             success:
 *               type: boolean
 *               description: Whether the lease was successful
 *               example: true
 *             zelfName:
 *               type: string
 *               description: The leased zelf name
 *               example: "username.zelf"
 *             walletAddress:
 *               type: string
 *               description: Generated wallet address
 *               example: "0x1234567890abcdef..."
 *             mnemonic:
 *               type: string
 *               description: Mnemonic phrase (for create type)
 *               example: "word1 word2 word3..."
 *     ZelfNamePreviewResponse:
 *       type: object
 *       properties:
 *         data:
 *           type: object
 *           properties:
 *             zelfName:
 *               type: string
 *               description: The zelf name
 *               example: "username.zelf"
 *             preview:
 *               type: object
 *               description: Preview data
 *     ZelfNameDecryptResponse:
 *       type: object
 *       properties:
 *         data:
 *           type: object
 *           properties:
 *             decrypted:
 *               type: boolean
 *               description: Whether decryption was successful
 *               example: true
 *             walletData:
 *               type: object
 *               description: Decrypted wallet data
 *     ZelfPayResponse:
 *       type: object
 *       properties:
 *         data:
 *           type: object
 *           properties:
 *             zelfPay:
 *               type: object
 *               description: ZelfPay data
 *     CaptchaError:
 *       type: object
 *       properties:
 *         captchaScore:
 *           type: number
 *           description: Captcha score (0-1)
 *           example: 0.5
 *         validationError:
 *           type: string
 *           description: Error message
 *           example: "Captcha not acceptable"
 *     SessionError:
 *       type: object
 *       properties:
 *         validationError:
 *           type: string
 *           description: Session-related error message
 *           example: "Session is not active"
 *     LimitError:
 *       type: object
 *       properties:
 *         validationError:
 *           type: string
 *           description: Rate limit error message
 *           example: "Search limit exceeded"
 */

/**
 * @swagger
 * /api/zelf-name-service/v2/search:
 *   get:
 *     summary: Search for a zelf name (v2)
 *     description: Enhanced search functionality with improved data handling and zelfPay integration. Includes automatic updates for old zelf name objects.
 *     tags: [Zelf Name Service - Search]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: zelfName
 *         schema:
 *           type: string
 *         description: Zelf name to search for
 *         example: "username.zelf"
 *       - in: query
 *         name: key
 *         schema:
 *           type: string
 *         description: Search key for advanced search
 *         example: "email"
 *       - in: query
 *         name: value
 *         schema:
 *           type: string
 *         description: Search value for advanced search
 *         example: "user@example.com"
 *       - in: query
 *         name: os
 *         schema:
 *           type: string
 *           enum: [DESKTOP, ANDROID, IOS]
 *         description: Operating system
 *         example: "DESKTOP"
 *       - in: query
 *         name: captchaToken
 *         schema:
 *           type: string
 *         description: Captcha token for validation
 *         example: "captcha_token_here"
 *     responses:
 *       200:
 *         description: Search completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ZelfNameSearchResponse'
 *       403:
 *         description: Session not active or rate limit exceeded
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/SessionError'
 *                 - $ref: '#/components/schemas/LimitError'
 *       409:
 *         description: Validation error or captcha failed
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/CaptchaError'
 *                 - type: object
 *                   properties:
 *                     validationError:
 *                       type: string
 *                       example: "missing zelfName or search by key|value"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/zelf-name-service/v2/search:
 *   post:
 *     summary: Search for a zelf name (v2) - POST
 *     description: Enhanced search functionality using POST method. Same functionality as GET v2 but with request body.
 *     tags: [Zelf Name Service - Search]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ZelfNameSearchRequest'
 *     responses:
 *       200:
 *         description: Search completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ZelfNameSearchResponse'
 *       403:
 *         description: Session not active or rate limit exceeded
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/SessionError'
 *                 - $ref: '#/components/schemas/LimitError'
 *       409:
 *         description: Validation error or captcha failed
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/CaptchaError'
 *                 - type: object
 *                   properties:
 *                     validationError:
 *                       type: string
 *                       example: "missing zelfName or search by key|value"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/zelf-name-service/v2/lease:
 *   post:
 *     summary: Lease a zelf name (v2)
 *     description: Enhanced lease functionality with improved validation and error handling. Supports both creating new wallets and importing existing ones.
 *     tags: [Zelf Name Service - Leasing]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ZelfNameLeaseRequest'
 *     responses:
 *       200:
 *         description: Zelf name leased successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ZelfNameLeaseResponse'
 *       403:
 *         description: Session not active or rate limit exceeded
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/SessionError'
 *                 - $ref: '#/components/schemas/LimitError'
 *       409:
 *         description: Validation error, captcha failed, or zelf name not available
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/CaptchaError'
 *                 - type: object
 *                   properties:
 *                     validationError:
 *                       type: string
 *                       example: "Not a valid zelf name"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/zelf-name-service/v2/lease-recovery:
 *   post:
 *     summary: Recover and lease a new zelf name
 *     description: Recover access using an existing zelf proof and lease a new zelf name. This is used for account recovery scenarios.
 *     tags: [Zelf Name Service - Leasing]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ZelfNameLeaseRecoveryRequest'
 *     responses:
 *       200:
 *         description: Recovery and lease completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ZelfNameLeaseResponse'
 *       403:
 *         description: Session not active or rate limit exceeded
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/SessionError'
 *                 - $ref: '#/components/schemas/LimitError'
 *       409:
 *         description: Validation error, captcha failed, or recovery failed
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/CaptchaError'
 *                 - type: object
 *                   properties:
 *                     validationError:
 *                       type: string
 *                       example: "Invalid zelf proof"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/zelf-name-service/zelfpay:
 *   get:
 *     summary: Get ZelfPay information
 *     description: Retrieve ZelfPay information for a given zelf proof. Used for payment processing and wallet integration.
 *     tags: [Zelf Name Service - Purchasing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: zelfProof
 *         required: true
 *         schema:
 *           type: string
 *         description: Zelf proof for payment verification
 *         example: "zelf_proof_data"
 *     responses:
 *       200:
 *         description: ZelfPay information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ZelfPayResponse'
 *       409:
 *         description: Missing ZelfProof
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 validationError:
 *                   type: string
 *                   example: "Missing ZelfProof"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/zelf-name-service/v2/lease-offline:
 *   post:
 *     summary: Lease a zelf name offline (v2)
 *     description: Enhanced offline lease functionality with improved validation and error handling.
 *     tags: [Zelf Name Service - Leasing]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ZelfNameOfflineLeaseRequest'
 *     responses:
 *       200:
 *         description: Offline lease completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ZelfNameLeaseResponse'
 *       409:
 *         description: Validation error or invalid zelf name
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 validationError:
 *                   type: string
 *                   example: "Not a valid zelf name"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/zelf-name-service/v2/lease-confirmation:
 *   post:
 *     summary: Confirm lease payment (v2)
 *     description: Enhanced lease confirmation with improved validation and error handling.
 *     tags: [Zelf Name Service - Purchasing]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ZelfNameLeaseConfirmationRequest'
 *     responses:
 *       200:
 *         description: Lease confirmation completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ZelfNameLeaseResponse'
 *       400:
 *         description: Invalid lease confirmation details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 validationError:
 *                   type: string
 *                   example: "Invalid lease confirmation details"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/zelf-name-service/v2/preview:
 *   post:
 *     summary: Preview zelf name (v2)
 *     description: Enhanced preview functionality with improved validation and error handling.
 *     tags: [Zelf Name Service - Preview]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ZelfNamePreviewRequest'
 *     responses:
 *       200:
 *         description: Preview completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ZelfNamePreviewResponse'
 *       403:
 *         description: Session not active or rate limit exceeded
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/SessionError'
 *                 - $ref: '#/components/schemas/LimitError'
 *       409:
 *         description: Validation error or captcha failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CaptchaError'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/zelf-name-service/preview-zelfproof:
 *   post:
 *     summary: Preview zelf proof
 *     description: Preview a zelf proof to validate and get preview data without processing.
 *     tags: [Zelf Name Service - Preview]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ZelfProofPreviewRequest'
 *     responses:
 *       200:
 *         description: Zelf proof preview completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ZelfNamePreviewResponse'
 *       403:
 *         description: Session not active or rate limit exceeded
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/SessionError'
 *                 - $ref: '#/components/schemas/LimitError'
 *       409:
 *         description: Validation error or captcha failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CaptchaError'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/zelf-name-service/v2/decrypt:
 *   post:
 *     summary: Decrypt zelf name (v2)
 *     description: Enhanced decryption functionality with improved validation and error handling.
 *     tags: [Zelf Name Service - Decryption]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ZelfNameDecryptRequest'
 *     responses:
 *       200:
 *         description: Decryption completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ZelfNameDecryptResponse'
 *       403:
 *         description: Session not active or rate limit exceeded
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/SessionError'
 *                 - $ref: '#/components/schemas/LimitError'
 *       409:
 *         description: Validation error or captcha failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CaptchaError'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/zelf-name-service/revenue-cat:
 *   post:
 *     summary: RevenueCat webhook handler
 *     description: Handle RevenueCat subscription events and webhooks for payment processing.
 *     tags: [Zelf Name Service - Purchasing]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               event:
 *                 $ref: '#/components/schemas/RevenueCatWebhookRequest'
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   description: Webhook processing result
 *       403:
 *         description: Access forbidden - unauthorized client or email
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 validationError:
 *                   type: string
 *                   example: "Access forbidden"
 *       409:
 *         description: Missing event payload or validation error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 validationError:
 *                   type: string
 *                   example: "Missing event payload"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/zelf-name-service/purchase-rewards:
 *   post:
 *     summary: Release purchase rewards
 *     description: Release purchase rewards for the authenticated user. Requires super admin privileges.
 *     tags: [Zelf Name Service - Purchasing]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Purchase rewards released successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   description: Purchase rewards data
 *       403:
 *         description: Unauthorized - requires super admin privileges
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Unauthorized"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/zelf-name-service/referral-rewards:
 *   post:
 *     summary: Release referral rewards
 *     description: Release referral rewards for the authenticated user. Requires super admin privileges.
 *     tags: [Zelf Name Service - Purchasing]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Referral rewards released successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   description: Referral rewards data
 *       403:
 *         description: Unauthorized - requires super admin privileges
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Unauthorized"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/zelf-name-service/{zelfName}:
 *   put:
 *     summary: Update zelf name lease duration
 *     description: Update the lease duration for a specific zelf name. Requires the user to own the zelf name.
 *     tags: [Zelf Name Service - Leasing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: zelfName
 *         required: true
 *         schema:
 *           type: string
 *         description: The zelf name to update
 *         example: "username.zelf"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ZelfNameUpdateRequest'
 *     responses:
 *       200:
 *         description: Zelf name updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   description: Updated zelf name data
 *       403:
 *         description: Access forbidden - user doesn't own the zelf name
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 validationError:
 *                   type: string
 *                   example: "Access forbidden"
 *       409:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 validationError:
 *                   type: string
 *                   example: "Invalid duration"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
