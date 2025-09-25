const config = require("../../../Core/config");

const Controller = require("../controllers/tags.controller");

const Middleware = require("../middlewares/tags.middleware");

const base = "/tags";

module.exports = (server) => {
	const PATH = config.basePath(base);

	// Route definitions
	server.get(`${PATH}/search`, Middleware.getValidation, Controller.searchTag); // [x]
	server.get(`${PATH}/search-by-domain`, Middleware.searchByDomainValidation, Controller.searchTagsByDomain); // [x]
	server.get(`${PATH}/preview`, Middleware.previewValidation, Controller.previewTag); // [x]

	server.post(`${PATH}/lease`, Middleware.leaseValidation, Controller.leaseTag); // [x]
	server.post(`${PATH}/lease-recovery`, Middleware.leaseRecoveryValidation, Controller.leaseRecovery); // [x]
	server.post(`${PATH}/lease-offline`, Middleware.leaseOfflineValidation, Controller.leaseOfflineTag); // [x]

	server.delete(`${PATH}/delete`, Middleware.deleteTagValidation, Controller.deleteTag); // [x]

	server.post(`${PATH}/preview-zelfproof`, Middleware.previewZelfProofValidation, Controller.previewZelfProof); // [x]
	server.post(`${PATH}/decrypt`, Middleware.decryptValidation, Controller.decryptTag); // [x]
	server.post(`${PATH}/revenue-cat`, Middleware.revenueCatWebhookValidation, Controller.revenueCatWebhook);
	server.post(`${PATH}/purchase-rewards`, Middleware.referralRewardsValidation, Controller.purchaseRewards);
	server.post(`${PATH}/referral-rewards`, Middleware.referralRewardsValidation, Controller.referralRewards);
	server.put(`${PATH}/:tagName`, Middleware.updateValidation, Controller.update);
};

/**
 * @swagger
 * components:
 *   schemas:
 *     TagSearchRequest:
 *       type: object
 *       properties:
 *         tagName:
 *           type: string
 *           description: Tag name to search for (supports multiple domains)
 *           example: "username.avax"
 *         domain:
 *           type: string
 *           description: Specific domain to search in
 *           example: "avax"
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
 *     TagLeaseRequest:
 *       type: object
 *       required: [tagName, faceBase64, type, os]
 *       properties:
 *         tagName:
 *           type: string
 *           description: Tag name to lease (supports multiple domains)
 *           example: "username.avax"
 *         domain:
 *           type: string
 *           description: Specific domain for the tag
 *           example: "avax"
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
 *     TagLeaseRecoveryRequest:
 *       type: object
 *       required: [zelfProof, newTagName, faceBase64, password, os]
 *       properties:
 *         zelfProof:
 *           type: string
 *           description: Zelf proof for recovery
 *           example: "zelf_proof_data"
 *         newTagName:
 *           type: string
 *           description: New tag name for recovery (supports multiple domains)
 *           example: "newusername.btc"
 *         domain:
 *           type: string
 *           description: Specific domain for the new tag
 *           example: "btc"
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
 *     TagLeaseConfirmationRequest:
 *       type: object
 *       required: [tagName, coin, network]
 *       properties:
 *         tagName:
 *           type: string
 *           description: Tag name for lease confirmation
 *           example: "username.tech"
 *         domain:
 *           type: string
 *           description: Specific domain for the tag
 *           example: "tech"
 *         coin:
 *           type: string
 *           description: Cryptocurrency for payment
 *           example: "USDC"
 *         network:
 *           type: string
 *           enum: [coinbase, CB, ETH, SOL, BTC]
 *           description: Payment network
 *           example: "ETH"
 *     TagPreviewRequest:
 *       type: object
 *       required: [tagName, os]
 *       properties:
 *         tagName:
 *           type: string
 *           description: Tag name to preview (supports multiple domains)
 *           example: "username.bdag"
 *         domain:
 *           type: string
 *           description: Specific domain for the tag
 *           example: "bdag"
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
 *     TagDecryptRequest:
 *       type: object
 *       required: [faceBase64, tagName, os]
 *       properties:
 *         faceBase64:
 *           type: string
 *           description: Base64 encoded face image for biometric verification
 *           example: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ..."
 *         password:
 *           type: string
 *           description: Password for decryption
 *           example: "secure_password"
 *         tagName:
 *           type: string
 *           description: Tag name to decrypt (supports multiple domains)
 *           example: "username.avax"
 *         domain:
 *           type: string
 *           description: Specific domain for the tag
 *           example: "avax"
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
 *     TagOfflineLeaseRequest:
 *       type: object
 *       required: [tagName, zelfProof, zelfProofQRCode]
 *       properties:
 *         tagName:
 *           type: string
 *           description: Tag name to lease offline (supports multiple domains)
 *           example: "username.btc"
 *         domain:
 *           type: string
 *           description: Specific domain for the tag
 *           example: "btc"
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
 *     TagUpdateRequest:
 *       type: object
 *       required: [duration]
 *       properties:
 *         duration:
 *           type: string
 *           enum: ["1", "2", "3", "4", "5", "lifetime"]
 *           description: Lease duration in years or lifetime
 *           example: "1"
 *     TagSearchResponse:
 *       type: object
 *       properties:
 *         data:
 *           type: object
 *           properties:
 *             available:
 *               type: boolean
 *               description: Whether the tag name is available
 *               example: true
 *             tagName:
 *               type: string
 *               description: The tag name that was searched
 *               example: "username.avax"
 *             domain:
 *               type: string
 *               description: The domain of the tag
 *               example: "avax"
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
 *     TagLeaseResponse:
 *       type: object
 *       properties:
 *         data:
 *           type: object
 *           properties:
 *             success:
 *               type: boolean
 *               description: Whether the lease was successful
 *               example: true
 *             tagName:
 *               type: string
 *               description: The leased tag name
 *               example: "username.avax"
 *             domain:
 *               type: string
 *               description: The domain of the leased tag
 *               example: "avax"
 *             walletAddress:
 *               type: string
 *               description: Generated wallet address
 *               example: "0x1234567890abcdef..."
 *             mnemonic:
 *               type: string
 *               description: Mnemonic phrase (for create type)
 *               example: "word1 word2 word3..."
 *     TagPreviewResponse:
 *       type: object
 *       properties:
 *         data:
 *           type: object
 *           properties:
 *             tagName:
 *               type: string
 *               description: The tag name
 *               example: "username.btc"
 *             domain:
 *               type: string
 *               description: The domain of the tag
 *               example: "btc"
 *             preview:
 *               type: object
 *               description: Preview data
 *     TagDecryptResponse:
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
 *     DomainError:
 *       type: object
 *       properties:
 *         validationError:
 *           type: string
 *           description: Domain-related error message
 *           example: "Domain not supported"
 * tags:
 *   - name: Tags
 *     description: Multi-domain tag management operations
 */

/**
 * @swagger
 * /api/tags/v2/search:
 *   get:
 *     summary: Search for a tag (v2) - Multi-domain support
 *     description: Enhanced search functionality with multi-domain support. Supports .zelf, .avax, .btc, .tech, .bdag domains and more.
 *     tags: [Tags]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: tagName
 *         schema:
 *           type: string
 *         description: Tag name to search for (supports multiple domains)
 *         example: "username.avax"
 *       - in: query
 *         name: domain
 *         schema:
 *           type: string
 *         description: Specific domain to search in
 *         example: "avax"
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
 *               $ref: '#/components/schemas/TagSearchResponse'
 *       403:
 *         description: Session not active or rate limit exceeded
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/SessionError'
 *                 - $ref: '#/components/schemas/LimitError'
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
 *                       example: "missing tagName or search by key|value"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/tags/v2/search:
 *   post:
 *     summary: Search for a tag (v2) - POST - Multi-domain support
 *     description: Enhanced search functionality using POST method with multi-domain support. Same functionality as GET v2 but with request body.
 *     tags: [Tags]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TagSearchRequest'
 *     responses:
 *       200:
 *         description: Search completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TagSearchResponse'
 *       403:
 *         description: Session not active or rate limit exceeded
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/SessionError'
 *                 - $ref: '#/components/schemas/LimitError'
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
 *                       example: "missing tagName or search by key|value"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/tags/v2/lease:
 *   post:
 *     summary: Lease a tag (v2) - Multi-domain support
 *     description: Enhanced lease functionality with multi-domain support. Supports creating and importing wallets for different domains.
 *     tags: [Tags]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TagLeaseRequest'
 *     responses:
 *       200:
 *         description: Tag leased successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TagLeaseResponse'
 *       403:
 *         description: Session not active or rate limit exceeded
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/SessionError'
 *                 - $ref: '#/components/schemas/LimitError'
 *       409:
 *         description: Validation error, captcha failed, domain not supported, or tag not available
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
 *                       example: "Not a valid tag name"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/tags/v2/lease-recovery:
 *   post:
 *     summary: Recover and lease a new tag - Multi-domain support
 *     description: Recover access using an existing zelf proof and lease a new tag with multi-domain support.
 *     tags: [Tags]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TagLeaseRecoveryRequest'
 *     responses:
 *       200:
 *         description: Recovery and lease completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TagLeaseResponse'
 *       403:
 *         description: Session not active or rate limit exceeded
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/SessionError'
 *                 - $ref: '#/components/schemas/LimitError'
 *       409:
 *         description: Validation error, captcha failed, domain not supported, or recovery failed
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
 * /api/tags/zelfpay:
 *   get:
 *     summary: Get ZelfPay information
 *     description: Retrieve ZelfPay information for a given zelf proof. Used for payment processing and wallet integration.
 *     tags: [Tags]
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
 * /api/tags/v2/lease-offline:
 *   post:
 *     summary: Lease a tag offline (v2) - Multi-domain support
 *     description: Enhanced offline lease functionality with multi-domain support.
 *     tags: [Tags]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TagOfflineLeaseRequest'
 *     responses:
 *       200:
 *         description: Offline lease completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TagLeaseResponse'
 *       409:
 *         description: Validation error, domain not supported, or invalid tag name
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/DomainError'
 *                 - type: object
 *                   properties:
 *                     validationError:
 *                       type: string
 *                       example: "Not a valid tag name"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/tags/v2/lease-confirmation:
 *   post:
 *     summary: Confirm lease payment (v2) - Multi-domain support
 *     description: Enhanced lease confirmation with multi-domain support.
 *     tags: [Tags]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TagLeaseConfirmationRequest'
 *     responses:
 *       200:
 *         description: Lease confirmation completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TagLeaseResponse'
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
 * /api/tags/v2/preview:
 *   post:
 *     summary: Preview tag (v2) - Multi-domain support
 *     description: Enhanced preview functionality with multi-domain support.
 *     tags: [Tags]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TagPreviewRequest'
 *     responses:
 *       200:
 *         description: Preview completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TagPreviewResponse'
 *       403:
 *         description: Session not active or rate limit exceeded
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/SessionError'
 *                 - $ref: '#/components/schemas/LimitError'
 *       409:
 *         description: Validation error, captcha failed, or domain not supported
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/CaptchaError'
 *                 - $ref: '#/components/schemas/DomainError'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/tags/preview-zelfproof:
 *   post:
 *     summary: Preview zelf proof
 *     description: Preview a zelf proof to validate and get preview data without processing.
 *     tags: [Tags]
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
 *               $ref: '#/components/schemas/TagPreviewResponse'
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
 * /api/tags/v2/decrypt:
 *   post:
 *     summary: Decrypt tag (v2) - Multi-domain support
 *     description: Enhanced decryption functionality with multi-domain support.
 *     tags: [Tags]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TagDecryptRequest'
 *     responses:
 *       200:
 *         description: Decryption completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TagDecryptResponse'
 *       403:
 *         description: Session not active or rate limit exceeded
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/SessionError'
 *                 - $ref: '#/components/schemas/LimitError'
 *       409:
 *         description: Validation error, captcha failed, or domain not supported
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/CaptchaError'
 *                 - $ref: '#/components/schemas/DomainError'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/tags/revenue-cat:
 *   post:
 *     summary: RevenueCat webhook handler
 *     description: Handle RevenueCat subscription events and webhooks for payment processing.
 *     tags: [Tags]
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
 * /api/tags/purchase-rewards:
 *   post:
 *     summary: Release purchase rewards
 *     description: Release purchase rewards for the authenticated user. Requires super admin privileges.
 *     tags: [Tags]
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
 * /api/tags/referral-rewards:
 *   post:
 *     summary: Release referral rewards
 *     description: Release referral rewards for the authenticated user. Requires super admin privileges.
 *     tags: [Tags]
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
 * /api/tags/{tagName}:
 *   put:
 *     summary: Update tag lease duration - Multi-domain support
 *     description: Update the lease duration for a specific tag. Supports multiple domains.
 *     tags: [Tags]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tagName
 *         required: true
 *         schema:
 *           type: string
 *         description: The tag name to update (supports multiple domains)
 *         example: "username.avax"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TagUpdateRequest'
 *     responses:
 *       200:
 *         description: Tag updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   description: Updated tag data
 *       403:
 *         description: Access forbidden - user doesn't own the tag
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 validationError:
 *                   type: string
 *                   example: "Access forbidden"
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
 *                       example: "Invalid duration"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
