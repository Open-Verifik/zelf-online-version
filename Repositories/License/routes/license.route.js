const Controller = require("../controllers/license.controller");
const Middleware = require("../middlewares/license.middleware");
const config = require("../../../Core/config");
const base = "/license";

module.exports = (server) => {
	const PATH = config.basePath(base);
	// Route definitions
	server.get(`${PATH}`, Middleware.searchValidation, Controller.searchLicense);
	server.get(`${PATH}/my-license`, Middleware.getMyLicenseValidation, Controller.getMyLicense);
	server.post(`${PATH}`, Middleware.createValidation, Controller.createOrUpdateLicense);
	server.delete(`${PATH}`, Middleware.deleteValidation, Controller.deleteLicense);
};

/**
 * @swagger
 * components:
 *   schemas:
 *     License:
 *       type: object
 *       properties:
 *         domain:
 *           type: string
 *           description: Domain name for the license
 *         ipfsHash:
 *           type: string
 *           description: IPFS hash of the license record
 *         owner:
 *           type: string
 *           description: Email of the license owner
 *         zelfProof:
 *           type: string
 *           description: User's biometric proof for ownership verification
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: License creation timestamp
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: License last update timestamp
 *     LicenseResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         data:
 *           $ref: '#/components/schemas/License'
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         message:
 *           type: string
 *           description: Error message
 * tags:
 *   - name: License
 *     description: License management operations
 */

/**
 * @swagger
 * /api/license:
 *   get:
 *     summary: Search for license by domain
 *     description: Search for an existing license by domain name
 *     tags: [License]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: domain
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]$'
 *         description: Domain name to search for (alphanumeric with hyphens)
 *         example: "mycompany"
 *     responses:
 *       200:
 *         description: License found successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LicenseResponse'
 *       400:
 *         description: Bad request - Invalid domain format
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
 *         description: License not found
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
 * /api/license/my-license:
 *   get:
 *     summary: Get user's own licenses
 *     description: Get all licenses linked to the current user's account via their zelfProof
 *     tags: [License]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User's licenses retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     myLicense:
 *                       $ref: '#/components/schemas/License'
 *                       nullable: true
 *                     zelfAccount:
 *                       type: object
 *                       description: User's zelf account information
 *       401:
 *         description: Unauthorized - User not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Client not found or no zelfProof available
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
 * /api/license:
 *   post:
 *     summary: Create or update license
 *     description: Create a new license or update an existing one with biometric verification
 *     tags: [License]
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
 *               - faceBase64
 *               - domainConfig
 *             properties:
 *               domain:
 *                 type: string
 *                 pattern: '^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]$'
 *                 description: Domain name for the license
 *                 example: "mycompany"
 *               faceBase64:
 *                 type: string
 *                 format: base64
 *                 description: Base64 encoded face image for biometric verification
 *                 example: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
 *               masterPassword:
 *                 type: string
 *                 description: Optional master password for additional security
 *                 example: "mySecurePassword123"
 *               os:
 *                 type: string
 *                 enum: ["DESKTOP", "ANDROID", "IOS"]
 *                 description: Operating system platform (optional)
 *                 example: "DESKTOP"
 *               domainConfig:
 *                 type: object
 *                 description: Complete domain configuration object
 *                 required:
 *                   - name
 *                   - limits
 *                   - features
 *                   - validation
 *                   - storage
 *                   - tagPaymentSettings
 *                 properties:
 *                   name:
 *                     type: string
 *                     description: Domain display name
 *                     example: "My Company"
 *                   type:
 *                     type: string
 *                     description: Domain type
 *                   holdSuffix:
 *                     type: string
 *                     default: ".hold"
 *                     description: Suffix for hold domains
 *                   status:
 *                     type: string
 *                     enum: ["active", "inactive", "suspended"]
 *                     default: "active"
 *                     description: Domain status
 *                   owner:
 *                     type: string
 *                     description: Domain owner information
 *                   description:
 *                     type: string
 *                     description: Domain description
 *                   limits:
 *                     type: object
 *                     required:
 *                       - tags
 *                       - zelfkeys
 *                     properties:
 *                       tags:
 *                         type: integer
 *                         minimum: 0
 *                         description: Maximum number of tags allowed
 *                         example: 1000
 *                       zelfkeys:
 *                         type: integer
 *                         minimum: 0
 *                         description: Maximum number of zelfkeys allowed
 *                         example: 100
 *                   features:
 *                     type: array
 *                     items:
 *                       type: object
 *                       required:
 *                         - name
 *                         - code
 *                         - description
 *                         - enabled
 *                       properties:
 *                         name:
 *                           type: string
 *                           description: Feature name
 *                         code:
 *                           type: string
 *                           description: Feature code
 *                         description:
 *                           type: string
 *                           description: Feature description
 *                         enabled:
 *                           type: boolean
 *                           description: Whether feature is enabled
 *                   validation:
 *                     type: object
 *                     required:
 *                       - minLength
 *                       - maxLength
 *                     properties:
 *                       minLength:
 *                         type: integer
 *                         minimum: 1
 *                         description: Minimum tag length
 *                       maxLength:
 *                         type: integer
 *                         minimum: 1
 *                         description: Maximum tag length
 *                       allowedChars:
 *                         type: object
 *                         default: {}
 *                         description: Allowed character patterns
 *                       reserved:
 *                         type: array
 *                         items:
 *                           type: string
 *                         default: []
 *                         description: Reserved tag names
 *                       customRules:
 *                         type: array
 *                         items:
 *                           type: string
 *                         default: []
 *                         description: Custom validation rules
 *                   storage:
 *                     type: object
 *                     required:
 *                       - keyPrefix
 *                     properties:
 *                       keyPrefix:
 *                         type: string
 *                         description: Storage key prefix
 *                       ipfsEnabled:
 *                         type: boolean
 *                         default: true
 *                         description: Enable IPFS storage
 *                       arweaveEnabled:
 *                         type: boolean
 *                         default: false
 *                         description: Enable Arweave storage
 *                       walrusEnabled:
 *                         type: boolean
 *                         default: false
 *                         description: Enable Walrus storage
 *                   tagPaymentSettings:
 *                     type: object
 *                     required:
 *                       - methods
 *                       - currencies
 *                       - pricingTable
 *                     properties:
 *                       methods:
 *                         type: array
 *                         items:
 *                           type: string
 *                           enum: ["coinbase", "crypto", "stripe", "paypal"]
 *                         description: Accepted payment methods
 *                       currencies:
 *                         type: array
 *                         items:
 *                           type: string
 *                           enum: ["BTC", "ETH", "SOL", "USDC", "USDT", "BDAG", "AVAX", "ZNS"]
 *                         description: Accepted currencies
 *                       whitelist:
 *                         type: object
 *                         default: {}
 *                         description: Payment whitelist settings
 *                       pricingTable:
 *                         type: object
 *                         description: Pricing configuration for different tag counts
 *                         patternProperties:
 *                           "^(\\d+|\\d+-\\d+)$":
 *                             type: object
 *                             properties:
 *                               "1": { type: number, minimum: 0 }
 *                               "2": { type: number, minimum: 0 }
 *                               "3": { type: number, minimum: 0 }
 *                               "4": { type: number, minimum: 0 }
 *                               "5": { type: number, minimum: 0 }
 *                               lifetime: { type: number, minimum: 0 }
 *                   metadata:
 *                     type: object
 *                     properties:
 *                       launchDate:
 *                         type: string
 *                         format: date
 *                         description: Domain launch date
 *                       version:
 *                         type: string
 *                         description: Domain version
 *                       documentation:
 *                         type: string
 *                         format: uri
 *                         description: Documentation URL
 *                       support:
 *                         type: string
 *                         enum: ["standard", "premium", "enterprise"]
 *                         default: "standard"
 *                         description: Support level
 *     responses:
 *       201:
 *         description: License created/updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LicenseResponse'
 *       400:
 *         description: Bad request - Invalid input or biometric verification failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               invalid_domain:
 *                 summary: Invalid domain format
 *                 value:
 *                   success: false
 *                   message: "Domain must contain only letters, numbers, and hyphens"
 *               multiple_faces:
 *                 summary: Multiple faces detected
 *                 value:
 *                   success: false
 *                   message: "Multiple face were detected in the provided image"
 *               no_face:
 *                 summary: No face detected
 *                 value:
 *                   success: false
 *                   message: "No face detected in the provided image"
 *       401:
 *         description: Unauthorized - User not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Conflict - Domain already exists
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
 * /api/license:
 *   delete:
 *     summary: Delete user's license
 *     description: Delete the current user's license with biometric verification. The system automatically identifies the user's license via their zelfProof.
 *     tags: [License]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - faceBase64
 *             properties:
 *               faceBase64:
 *                 type: string
 *                 format: base64
 *                 description: Base64 encoded face image for biometric verification
 *                 example: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
 *               masterPassword:
 *                 type: string
 *                 description: Optional master password for additional security
 *                 example: "mySecurePassword123"
 *     responses:
 *       200:
 *         description: License deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     success:
 *                       type: boolean
 *                       example: true
 *                     message:
 *                       type: string
 *                       example: "License deleted successfully"
 *                     deletedFiles:
 *                       type: array
 *                       items:
 *                         type: string
 *                       description: Array of IPFS file hashes that were unpinned
 *       400:
 *         description: Bad request - Invalid biometric verification or missing face image
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               invalid_face:
 *                 summary: Invalid face image
 *                 value:
 *                   success: false
 *                   message: "No face detected in the provided image"
 *               multiple_faces:
 *                 summary: Multiple faces detected
 *                 value:
 *                   success: false
 *                   message: "Multiple face were detected in the provided image"
 *       401:
 *         description: Unauthorized - User not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: License not found or user has no license
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
