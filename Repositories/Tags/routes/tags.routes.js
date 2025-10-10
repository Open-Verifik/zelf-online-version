const config = require("../../../Core/config");

const Controller = require("../controllers/tags.controller");

const Middleware = require("../middlewares/tags.middleware");

const base = "/tags";

module.exports = (server) => {
	const PATH = config.basePath(base);

	// domain helper routes
	server.get(`${PATH}/domains`, Controller.getDomains);
	server.get(`${PATH}/domains/:domain`, Controller.getDomain);
	// server.get(`${PATH}/domains/:domain/pricing`, Controller.getDomainPricing);
	// server.get(`${PATH}/domains/:domain/payment-options`, Controller.getDomainPaymentOptions);

	/**
	 * @swagger
	 * tags:
	 *   - name: Tags Domains
	 *     description: Domain configuration and management endpoints for Zelf tags
	 */

	/**
	 * @swagger
	 * /api/tags/domains:
	 *   get:
	 *     summary: Get all available domains
	 *     description: Retrieves a comprehensive list of all supported domains with their complete configuration including limits, features, validation rules, storage settings, and payment options.
	 *     tags:
	 *       - Tags Domains
	 *     security:
	 *       - bearerAuth: []
	 *     responses:
	 *       200:
	 *         description: Successfully retrieved all domains
	 *         content:
	 *           application/json:
	 *             schema:
	 *               type: object
	 *               properties:
	 *                 data:
	 *                   type: object
	 *                   additionalProperties:
	 *                     type: object
	 *                     properties:
	 *                       name:
	 *                         type: string
	 *                         description: Domain name (e.g., "zelf", "avax", "bdag")
	 *                         example: "zelf"
	 *                       owner:
	 *                         type: string
	 *                         description: Domain owner
	 *                         example: "zelf-team"
	 *                       status:
	 *                         type: string
	 *                         enum: [active, inactive, maintenance]
	 *                         example: "active"
	 *                       type:
	 *                         type: string
	 *                         enum: [official, community, partner]
	 *                         example: "official"
	 *                       description:
	 *                         type: string
	 *                         description: Human-readable description of the domain
	 *                         example: "Official Zelf domain"
	 *                       limits:
	 *                         type: object
	 *                         properties:
	 *                           tags:
	 *                             type: integer
	 *                             description: Maximum number of tags allowed
	 *                             example: 10000
	 *                           zelfkeys:
	 *                             type: integer
	 *                             description: Maximum number of ZelfKeys allowed
	 *                             example: 10000
	 *                           maxTagsPerUser:
	 *                             type: integer
	 *                             example: 10000
	 *                           maxRenewalPerDay:
	 *                             type: integer
	 *                             example: 2
	 *                           maxTransferPerDay:
	 *                             type: integer
	 *                             example: 10000
	 *                       features:
	 *                         type: array
	 *                         items:
	 *                           type: object
	 *                           properties:
	 *                             name:
	 *                               type: string
	 *                               example: "Zelf Name Service"
	 *                             code:
	 *                               type: string
	 *                               example: "zns"
	 *                             description:
	 *                               type: string
	 *                               example: "Encryptions, Decryptions, previews of ZelfProofs"
	 *                             enabled:
	 *                               type: boolean
	 *                               example: true
	 *                       validation:
	 *                         type: object
	 *                         properties:
	 *                           minLength:
	 *                             type: integer
	 *                             description: Minimum tag name length
	 *                             example: 1
	 *                           maxLength:
	 *                             type: integer
	 *                             description: Maximum tag name length
	 *                             example: 27
	 *                           allowedChars:
	 *                             type: object
	 *                             description: Allowed character patterns
	 *                           reserved:
	 *                             type: array
	 *                             items:
	 *                               type: string
	 *                             description: Reserved names that cannot be used
	 *                             example: ["www", "api", "admin", "support", "help", "zelf"]
	 *                           customRules:
	 *                             type: array
	 *                             items:
	 *                               type: string
	 *                             description: Custom validation rules
	 *                       storage:
	 *                         type: object
	 *                         properties:
	 *                           keyPrefix:
	 *                             type: string
	 *                             description: Prefix for storage keys
	 *                             example: "zelfName"
	 *                           ipfsEnabled:
	 *                             type: boolean
	 *                             description: Whether IPFS storage is enabled
	 *                             example: true
	 *                           arweaveEnabled:
	 *                             type: boolean
	 *                             description: Whether Arweave storage is enabled
	 *                             example: true
	 *                           walrusEnabled:
	 *                             type: boolean
	 *                             description: Whether Walrus storage is enabled
	 *                             example: true
	 *                           backupEnabled:
	 *                             type: boolean
	 *                             description: Whether backup storage is enabled
	 *                             example: false
	 *                       payment:
	 *                         type: object
	 *                         properties:
	 *                           methods:
	 *                             type: array
	 *                             items:
	 *                               type: string
	 *                               enum: [coinbase, crypto, stripe, paypal]
	 *                             description: Supported payment methods
	 *                             example: ["coinbase", "crypto", "stripe"]
	 *                           currencies:
	 *                             type: array
	 *                             items:
	 *                               type: string
	 *                             description: Supported currencies
	 *                             example: ["USD", "BTC", "ETH", "SOL"]
	 *                           discounts:
	 *                             type: object
	 *                             properties:
	 *                               yearly:
	 *                                 type: number
	 *                                 description: Yearly discount percentage
	 *                                 example: 0.1
	 *                               lifetime:
	 *                                 type: number
	 *                                 description: Lifetime discount percentage
	 *                                 example: 0.2
	 *                           pricingTable:
	 *                             type: object
	 *                             description: Dynamic pricing based on name length
	 *                             additionalProperties:
	 *                               type: object
	 *                               properties:
	 *                                 "1":
	 *                                   type: object
	 *                                   properties:
	 *                                     "1": { type: "integer", example: 240 }
	 *                                     "2": { type: "integer", example: 432 }
	 *                                     "3": { type: "integer", example: 612 }
	 *                                     "4": { type: "integer", example: 768 }
	 *                                     "5": { type: "integer", example: 900 }
	 *                                     lifetime: { type: "integer", example: 3600 }
	 *                           rewardPrice:
	 *                             type: integer
	 *                             description: Reward price in cents
	 *                             example: 10
	 *                           whitelist:
	 *                             type: object
	 *                             description: Whitelisted addresses with special pricing
	 *                             additionalProperties:
	 *                               type: string
	 *                             example: { "migueltrevino.zelf": "24$", "migueltrevinom.zelf": "50%" }
	 *                       metadata:
	 *                         type: object
	 *                         properties:
	 *                           version:
	 *                             type: string
	 *                             description: Domain configuration version
	 *                             example: "1.0.0"
	 *                           documentation:
	 *                             type: string
	 *                             description: Documentation URL
	 *                             example: "https://docs.zelf.world"
	 *                           launchDate:
	 *                             type: string
	 *                             format: date
	 *                             description: Domain launch date
	 *                             example: "2023-01-01"
	 *             examples:
	 *               success:
	 *                 summary: Successful response
	 *                 value:
	 *                   data:
	 *                     zelf:
	 *                       name: "zelf"
	 *                       owner: "zelf-team"
	 *                       status: "active"
	 *                       type: "official"
	 *                       description: "Official Zelf domain"
	 *                       limits:
	 *                         tags: 10000
	 *                         zelfkeys: 10000
	 *                       features:
	 *                         - name: "Zelf Name Service"
	 *                           code: "zns"
	 *                           description: "Encryptions, Decryptions, previews of ZelfProofs"
	 *                           enabled: true
	 *                       validation:
	 *                         minLength: 1
	 *                         maxLength: 27
	 *                         reserved: ["www", "api", "admin", "support", "help", "zelf"]
	 *                       storage:
	 *                         keyPrefix: "zelfName"
	 *                         ipfsEnabled: true
	 *                         arweaveEnabled: true
	 *                       payment:
	 *                         methods: ["coinbase", "crypto", "stripe"]
	 *                         currencies: ["USD", "BTC", "ETH", "SOL"]
	 *                       metadata:
	 *                         version: "1.0.0"
	 *                         documentation: "https://docs.zelf.world"
	 *       401:
	 *         description: Unauthorized - Invalid or missing authentication token
	 *         content:
	 *           application/json:
	 *             schema:
	 *               type: object
	 *               properties:
	 *                 error:
	 *                   type: string
	 *                   example: "Protected resource, use Authorization header to get access"
	 *       500:
	 *         description: Internal server error
	 *         content:
	 *           application/json:
	 *             schema:
	 *               type: object
	 *               properties:
	 *                 error:
	 *                   type: string
	 *                   example: "Internal server error"
	 */

	/**
	 * @swagger
	 * /api/tags/domains/{domain}:
	 *   get:
	 *     summary: Get specific domain configuration
	 *     description: Retrieves the complete configuration for a specific domain including all settings, limits, features, validation rules, storage options, and payment methods.
	 *     tags:
	 *       - Tags Domains
	 *     security:
	 *       - bearerAuth: []
	 *     parameters:
	 *       - in: path
	 *         name: domain
	 *         required: true
	 *         description: Domain name to retrieve configuration for
	 *         schema:
	 *           type: string
	 *           enum: [zelf, avax, bdag, polygon, ethereum, solana]
	 *           example: "zelf"
	 *     responses:
	 *       200:
	 *         description: Successfully retrieved domain configuration
	 *         content:
	 *           application/json:
	 *             schema:
	 *               type: object
	 *               properties:
	 *                 data:
	 *                   type: object
	 *                   properties:
	 *                     name:
	 *                       type: string
	 *                       description: Domain name
	 *                       example: "zelf"
	 *                     owner:
	 *                       type: string
	 *                       description: Domain owner
	 *                       example: "zelf-team"
	 *                     status:
	 *                       type: string
	 *                       enum: [active, inactive, maintenance]
	 *                       example: "active"
	 *                     type:
	 *                       type: string
	 *                       enum: [official, community, partner]
	 *                       example: "official"
	 *                     description:
	 *                       type: string
	 *                       description: Human-readable description
	 *                       example: "Official Zelf domain"
	 *                     limits:
	 *                       type: object
	 *                       properties:
	 *                         tags:
	 *                           type: integer
	 *                           description: Maximum tags allowed
	 *                           example: 10000
	 *                         zelfkeys:
	 *                           type: integer
	 *                           description: Maximum ZelfKeys allowed
	 *                           example: 10000
	 *                         maxTagsPerUser:
	 *                           type: integer
	 *                           example: 10000
	 *                         maxRenewalPerDay:
	 *                           type: integer
	 *                           example: 2
	 *                         maxTransferPerDay:
	 *                           type: integer
	 *                           example: 10000
	 *                     features:
	 *                       type: array
	 *                       items:
	 *                         type: object
	 *                         properties:
	 *                           name:
	 *                             type: string
	 *                             example: "Zelf Name Service"
	 *                           code:
	 *                             type: string
	 *                             example: "zns"
	 *                           description:
	 *                             type: string
	 *                             example: "Encryptions, Decryptions, previews of ZelfProofs"
	 *                           enabled:
	 *                             type: boolean
	 *                             example: true
	 *                     validation:
	 *                       type: object
	 *                       properties:
	 *                         minLength:
	 *                           type: integer
	 *                           example: 1
	 *                         maxLength:
	 *                           type: integer
	 *                           example: 27
	 *                         allowedChars:
	 *                           type: object
	 *                         reserved:
	 *                           type: array
	 *                           items:
	 *                             type: string
	 *                           example: ["www", "api", "admin", "support", "help", "zelf"]
	 *                         customRules:
	 *                           type: array
	 *                           items:
	 *                             type: string
	 *                     storage:
	 *                       type: object
	 *                       properties:
	 *                         keyPrefix:
	 *                           type: string
	 *                           example: "zelfName"
	 *                         ipfsEnabled:
	 *                           type: boolean
	 *                           example: true
	 *                         arweaveEnabled:
	 *                           type: boolean
	 *                           example: true
	 *                         walrusEnabled:
	 *                           type: boolean
	 *                           example: true
	 *                         backupEnabled:
	 *                           type: boolean
	 *                           example: false
	 *                     payment:
	 *                       type: object
	 *                       properties:
	 *                         methods:
	 *                           type: array
	 *                           items:
	 *                             type: string
	 *                             enum: [coinbase, crypto, stripe, paypal]
	 *                           example: ["coinbase", "crypto", "stripe"]
	 *                         currencies:
	 *                           type: array
	 *                           items:
	 *                             type: string
	 *                           example: ["USD", "BTC", "ETH", "SOL"]
	 *                         discounts:
	 *                           type: object
	 *                           properties:
	 *                             yearly:
	 *                               type: number
	 *                               example: 0.1
	 *                             lifetime:
	 *                               type: number
	 *                               example: 0.2
	 *                         pricingTable:
	 *                           type: object
	 *                           description: Dynamic pricing based on name length
	 *                           additionalProperties:
	 *                             type: object
	 *                         rewardPrice:
	 *                           type: integer
	 *                           example: 10
	 *                         whitelist:
	 *                           type: object
	 *                           additionalProperties:
	 *                             type: string
	 *                     metadata:
	 *                       type: object
	 *                       properties:
	 *                         version:
	 *                           type: string
	 *                           example: "1.0.0"
	 *                         documentation:
	 *                           type: string
	 *                           example: "https://docs.zelf.world"
	 *                         launchDate:
	 *                           type: string
	 *                           format: date
	 *                           example: "2023-01-01"
	 *             examples:
	 *               success:
	 *                 summary: Successful response for zelf domain
	 *                 value:
	 *                   data:
	 *                     name: "zelf"
	 *                     owner: "zelf-team"
	 *                     status: "active"
	 *                     type: "official"
	 *                     description: "Official Zelf domain"
	 *                     limits:
	 *                       tags: 10000
	 *                       zelfkeys: 10000
	 *                       maxTagsPerUser: 10000
	 *                       maxRenewalPerDay: 2
	 *                       maxTransferPerDay: 10000
	 *                     features:
	 *                       - name: "Zelf Name Service"
	 *                         code: "zns"
	 *                         description: "Encryptions, Decryptions, previews of ZelfProofs"
	 *                         enabled: true
	 *                       - name: "Zelf Keys"
	 *                         code: "zelfkeys"
	 *                         description: "Zelf Keys: Passwords, Notes, Credit Cards, etc."
	 *                         enabled: true
	 *                     validation:
	 *                       minLength: 1
	 *                       maxLength: 27
	 *                       allowedChars: {}
	 *                       reserved: ["www", "api", "admin", "support", "help", "zelf"]
	 *                       customRules: []
	 *                     storage:
	 *                       keyPrefix: "zelfName"
	 *                       ipfsEnabled: true
	 *                       arweaveEnabled: true
	 *                       walrusEnabled: true
	 *                       backupEnabled: false
	 *                     payment:
	 *                       methods: ["coinbase", "crypto", "stripe"]
	 *                       currencies: ["USD", "BTC", "ETH", "SOL"]
	 *                       discounts:
	 *                         yearly: 0.1
	 *                         lifetime: 0.2
	 *                       pricingTable:
	 *                         "1":
	 *                           "1": 240
	 *                           "2": 432
	 *                           "3": 612
	 *                           "4": 768
	 *                           "5": 900
	 *                           lifetime: 3600
	 *                       rewardPrice: 10
	 *                       whitelist:
	 *                         "migueltrevino.zelf": "24$"
	 *                         "migueltrevinom.zelf": "50%"
	 *                     metadata:
	 *                       version: "1.0.0"
	 *                       documentation: "https://docs.zelf.world"
	 *                       launchDate: "2023-01-01"
	 *       401:
	 *         description: Unauthorized - Invalid or missing authentication token
	 *         content:
	 *           application/json:
	 *             schema:
	 *               type: object
	 *               properties:
	 *                 error:
	 *                   type: string
	 *                   example: "Protected resource, use Authorization header to get access"
	 *       404:
	 *         description: Domain not found
	 *         content:
	 *           application/json:
	 *             schema:
	 *               type: object
	 *               properties:
	 *                 code:
	 *                   type: string
	 *                   example: "NotFound"
	 *                 message:
	 *                   type: string
	 *                   example: "domain_not_found"
	 *       409:
	 *         description: Validation error - Invalid domain format
	 *         content:
	 *           application/json:
	 *             schema:
	 *               type: object
	 *               properties:
	 *                 validationError:
	 *                   type: string
	 *                   example: "Invalid domain format"
	 *       500:
	 *         description: Internal server error
	 *         content:
	 *           application/json:
	 *             schema:
	 *               type: object
	 *               properties:
	 *                 error:
	 *                   type: string
	 *                   example: "Internal server error"
	 */

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
 *   - name: Tags - Search
 *     description: Tag search and availability checking endpoints with multi-domain support
 *   - name: Tags - Leasing
 *     description: Tag leasing, recovery, and management endpoints with multi-domain support
 *   - name: Tags - Management
 *     description: Tag management, deletion, and update endpoints with multi-domain support
 *   - name: Tags - Preview & Decryption
 *     description: Tag preview, decryption, and zelf proof endpoints with multi-domain support
 *   - name: Tags - Rewards & Webhooks
 *     description: Tag rewards, webhooks, and payment processing endpoints
 */

/**
 * @swagger
 * /api/tags/search:
 *   get:
 *     summary: Search for a tag - Multi-domain support
 *     description: Enhanced search functionality with multi-domain support. Supports .zelf, .avax, .btc, .tech, .bdag domains and more.
 *     tags: [Tags - Search]
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
 * /api/tags/search:
 *   post:
 *     summary: Search for a tag - POST - Multi-domain support
 *     description: Enhanced search functionality using POST method with multi-domain support. Same functionality as GET but with request body.
 *     tags: [Tags - Search]
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
 * /api/tags/search-by-domain:
 *   get:
 *     summary: Search tags by domain
 *     description: Search for tags within a specific domain and storage system
 *     tags: [Tags - Search]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: domain
 *         required: true
 *         schema:
 *           type: string
 *         description: Domain to search in
 *         example: "avax"
 *       - in: query
 *         name: storage
 *         required: true
 *         schema:
 *           type: string
 *           enum: ["IPFS", "Arweave", "Walrus"]
 *         description: Storage system to search
 *         example: "IPFS"
 *     responses:
 *       200:
 *         description: Search completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TagSearchResponse'
 *       409:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 validationError:
 *                   type: string
 *                   example: "Domain and storage are required"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/tags/lease:
 *   post:
 *     summary: Lease a tag - Multi-domain support
 *     description: Enhanced lease functionality with multi-domain support. Supports creating and importing wallets for different domains.
 *     tags: [Tags - Leasing]
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
 * /api/tags/lease-recovery:
 *   post:
 *     summary: Recover and lease a new tag - Multi-domain support
 *     description: Recover access using an existing zelf proof and lease a new tag with multi-domain support.
 *     tags: [Tags - Leasing]
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
 * /api/tags/lease-offline:
 *   post:
 *     summary: Lease a tag offline - Multi-domain support
 *     description: Enhanced offline lease functionality with multi-domain support.
 *     tags: [Tags - Leasing]
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
 * /api/tags/preview:
 *   post:
 *     summary: Preview tag - Multi-domain support
 *     description: Enhanced preview functionality with multi-domain support.
 *     tags: [Tags - Preview & Decryption]
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
 * /api/tags/delete:
 *   delete:
 *     summary: Delete a tag
 *     description: Delete a tag with biometric verification
 *     tags: [Tags - Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - domain
 *               - tagName
 *               - faceBase64
 *             properties:
 *               domain:
 *                 type: string
 *                 description: Domain of the tag to delete
 *                 example: "avax"
 *               tagName:
 *                 type: string
 *                 description: Name of the tag to delete
 *                 example: "username.avax"
 *               faceBase64:
 *                 type: string
 *                 format: base64
 *                 description: Base64 encoded face image for biometric verification
 *                 example: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ..."
 *               password:
 *                 type: string
 *                 description: Optional password for additional security
 *                 example: "secure_password"
 *     responses:
 *       200:
 *         description: Tag deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Tag deleted successfully"
 *       400:
 *         description: Bad request - Invalid biometric verification
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "No face detected in the provided image"
 *       401:
 *         description: Unauthorized - User not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Tag not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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
 *     tags: [Tags - Preview & Decryption]
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
 * /api/tags/decrypt:
 *   post:
 *     summary: Decrypt tag - Multi-domain support
 *     description: Enhanced decryption functionality with multi-domain support.
 *     tags: [Tags - Preview & Decryption]
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
 *     tags: [Tags - Rewards & Webhooks]
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
 *     tags: [Tags - Rewards & Webhooks]
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
 *     tags: [Tags - Rewards & Webhooks]
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
