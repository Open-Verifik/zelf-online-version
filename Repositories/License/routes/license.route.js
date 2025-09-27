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
 * /api/license/{ipfsHash}:
 *   delete:
 *     summary: Delete license by IPFS hash
 *     description: Delete a license record from IPFS by its hash
 *     tags: [License]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ipfsHash
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[a-zA-Z0-9]+$'
 *         description: IPFS hash of the license to delete
 *         example: "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG"
 *     responses:
 *       200:
 *         description: License deleted successfully
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
 *                   example: "License deleted successfully"
 *       400:
 *         description: Bad request - Invalid IPFS hash format
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
