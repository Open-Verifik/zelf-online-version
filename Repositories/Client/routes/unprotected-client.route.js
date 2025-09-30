const config = require("../../../Core/config");

const Controller = require("../controllers/unprotected-client.controller");
const Middleware = require("../middlewares/client.middleware");

const base = "/clients";

module.exports = (server) => {
	const PATH = config.basePath(base);

	// Routes
	server.get(`${PATH}`, Controller.verifyClient);
	server.post(`${PATH}`, Middleware.createValidation, Controller.create);
	server.post(`${PATH}/auth`, Middleware.authValidation, Controller.auth);
};

/**
 * @swagger
 * components:
 *   schemas:
 *     CreateClientRequest:
 *       type: object
 *       required:
 *         - name
 *         - countryCode
 *         - phone
 *         - email
 *         - company
 *         - faceBase64
 *       properties:
 *         name:
 *           type: string
 *           description: Client full name
 *           example: "John Doe"
 *         countryCode:
 *           type: string
 *           description: Country code with + prefix
 *           example: "+1"
 *         phone:
 *           type: string
 *           description: Phone number without country code
 *           example: "5551234567"
 *         email:
 *           type: string
 *           format: email
 *           description: Client email address
 *           example: "john.doe@example.com"
 *         language:
 *           type: string
 *           enum: ["en", "es"]
 *           description: Preferred language
 *           example: "en"
 *         company:
 *           type: string
 *           description: Company name
 *           example: "Acme Corp"
 *         faceBase64:
 *           type: string
 *           format: base64
 *           description: Base64 encoded face image for biometric verification
 *           example: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ..."
 *     VerifyClientRequest:
 *       type: object
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: Client email for verification (required if phone not provided)
 *           example: "john.doe@example.com"
 *         countryCode:
 *           type: string
 *           description: Country code (required if email not provided)
 *           example: "+1"
 *         phone:
 *           type: string
 *           description: Phone number (required if email not provided)
 *           example: "5551234567"
 *         identificationMethod:
 *           type: string
 *           enum: ["email", "phone"]
 *           description: Identification method used
 *           example: "email"
 *     AuthClientRequest:
 *       type: object
 *       required:
 *         - faceBase64
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: Client email for authentication
 *           example: "john.doe@example.com"
 *         countryCode:
 *           type: string
 *           description: Country code
 *           example: "+1"
 *         phone:
 *           type: string
 *           description: Phone number
 *           example: "5551234567"
 *         faceBase64:
 *           type: string
 *           format: base64
 *           description: Base64 encoded face image for biometric authentication
 *           example: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ..."
 *         identificationMethod:
 *           type: string
 *           enum: ["email", "phone"]
 *           description: Identification method used
 *           example: "email"
 *     ClientResponse:
 *       type: object
 *       properties:
 *         data:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *               description: Client ID
 *             name:
 *               type: string
 *               description: Client name
 *             email:
 *               type: string
 *               description: Client email
 *             phone:
 *               type: string
 *               description: Client phone
 *             company:
 *               type: string
 *               description: Company name
 *             zelfProof:
 *               type: string
 *               description: Client's biometric proof
 *             createdAt:
 *               type: string
 *               format: date-time
 *               description: Creation timestamp
 *     AuthResponse:
 *       type: object
 *       properties:
 *         data:
 *           type: object
 *           properties:
 *             token:
 *               type: string
 *               description: JWT authentication token
 *             client:
 *               $ref: '#/components/schemas/ClientResponse'
 *     VerifyResponse:
 *       type: object
 *       properties:
 *         data:
 *           type: object
 *           properties:
 *             exists:
 *               type: boolean
 *               description: Whether the client exists
 *             client:
 *               $ref: '#/components/schemas/ClientResponse'
 *               nullable: true
 *               description: Client data if exists
 *     UpdateClientRequest:
 *       type: object
 *       required:
 *         - faceBase64
 *       properties:
 *         name:
 *           type: string
 *           description: Client name
 *           example: "John Doe Updated"
 *         email:
 *           type: string
 *           format: email
 *           description: Client email address
 *           example: "john.updated@example.com"
 *         countryCode:
 *           type: string
 *           description: Country code
 *           example: "+1"
 *         phone:
 *           type: string
 *           description: Phone number
 *           example: "5551234567"
 *         language:
 *           type: string
 *           enum: ["en", "es"]
 *           description: Language preference
 *           example: "en"
 *         company:
 *           type: string
 *           description: Company name
 *           example: "Acme Corp Updated"
 *         faceBase64:
 *           type: string
 *           format: base64
 *           description: Base64 encoded face image for biometric verification
 *           example: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ..."
 *         masterPassword:
 *           type: string
 *           description: Master password for biometric verification
 *           example: "mySecurePassword123"
 * tags:
 *   - name: Client
 *     description: Client management operations (unprotected and protected endpoints)
 */

/**
 * @swagger
 * /api/clients/sync:
 *   put:
 *     summary: Update client information
 *     description: Update an existing client's information with biometric verification
 *     tags: [Client]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateClientRequest'
 *     responses:
 *       200:
 *         description: Client updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ClientResponse'
 *       403:
 *         description: API key not valid
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 validationError:
 *                   type: string
 *                   example: "ApiKey not valid"
 *       409:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 validationError:
 *                   type: string
 *                   example: "Validation error message"
 */

/**
 * @swagger
 * /api/clients/sync/password:
 *   put:
 *     summary: Update client password
 *     description: Update an existing client's password with biometric verification
 *     tags: [Client]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - newPassword
 *             properties:
 *               newPassword:
 *                 type: string
 *                 description: New password for the client
 *                 example: "newSecurePassword123"
 *               currentPassword:
 *                 type: string
 *                 description: Current password for verification (optional)
 *                 example: "currentPassword123"
 *     responses:
 *       200:
 *         description: Password updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   description: Update result
 *       403:
 *         description: API key not valid
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 validationError:
 *                   type: string
 *                   example: "ApiKey not valid"
 *       409:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 validationError:
 *                   type: string
 *                   example: "Validation error message"
 */

/**
 * @swagger
 * /api/clients:
 *   delete:
 *     summary: Delete client
 *     description: Delete the authenticated client's account
 *     tags: [Client]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Client deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   description: Delete result
 *       403:
 *         description: API key not valid
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 validationError:
 *                   type: string
 *                   example: "ApiKey not valid"
 *       409:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 validationError:
 *                   type: string
 *                   example: "Validation error message"
 *   get:
 *     summary: Verify client exists
 *     description: Check if a client exists based on email or phone number (no authentication required)
 *     tags: [Client]
 *     parameters:
 *       - in: query
 *         name: email
 *         schema:
 *           type: string
 *           format: email
 *         description: Client email for verification (required if phone not provided)
 *         example: "john.doe@example.com"
 *       - in: query
 *         name: countryCode
 *         schema:
 *           type: string
 *         description: Country code (required if email not provided)
 *         example: "+1"
 *       - in: query
 *         name: phone
 *         schema:
 *           type: string
 *         description: Phone number (required if email not provided)
 *         example: "5551234567"
 *       - in: query
 *         name: identificationMethod
 *         schema:
 *           type: string
 *           enum: ["email", "phone"]
 *         description: Identification method used
 *         example: "email"
 *     responses:
 *       200:
 *         description: Client verification result
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/VerifyResponse'
 *       400:
 *         description: Validation error - missing required fields
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 validationError:
 *                   type: string
 *                   example: "Either email or countryCode + phone must be provided"
 *       404:
 *         description: Client not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 validationError:
 *                   type: string
 *                   example: "Client not found"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 validationError:
 *                   type: string
 *                   example: "Internal server error"
 *   post:
 *     summary: Create new client
 *     description: Create a new client with the provided information (no authentication required)
 *     tags: [Client]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateClientRequest'
 *     responses:
 *       201:
 *         description: Client created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ClientResponse'
 *       400:
 *         description: Bad request - Invalid input or biometric verification failed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 validationError:
 *                   type: string
 *                   example: "Invalid email format"
 *             examples:
 *               invalid_email:
 *                 summary: Invalid email format
 *                 value:
 *                   validationError: "Invalid email format"
 *               multiple_faces:
 *                 summary: Multiple faces detected
 *                 value:
 *                   validationError: "Multiple faces detected in the provided image"
 *               no_face:
 *                 summary: No face detected
 *                 value:
 *                   validationError: "No face detected in the provided image"
 *       409:
 *         description: Conflict - Client already exists
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 validationError:
 *                   type: string
 *                   example: "Client with this email already exists"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 validationError:
 *                   type: string
 *                   example: "Internal server error"
 */

/**
 * @swagger
 * /api/clients/auth:
 *   post:
 *     summary: Authenticate client
 *     description: Authenticate an existing client using biometric verification (no authentication required)
 *     tags: [Client]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AuthClientRequest'
 *     responses:
 *       200:
 *         description: Client authenticated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Bad request - Invalid input or biometric verification failed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 validationError:
 *                   type: string
 *                   example: "Invalid biometric verification"
 *             examples:
 *               invalid_face:
 *                 summary: Invalid face image
 *                 value:
 *                   validationError: "No face detected in the provided image"
 *               multiple_faces:
 *                 summary: Multiple faces detected
 *                 value:
 *                   validationError: "Multiple faces detected in the provided image"
 *               biometric_mismatch:
 *                 summary: Biometric verification failed
 *                 value:
 *                   validationError: "Biometric verification failed"
 *       401:
 *         description: Unauthorized - Authentication failed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 validationError:
 *                   type: string
 *                   example: "Authentication failed"
 *       404:
 *         description: Client not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 validationError:
 *                   type: string
 *                   example: "Client not found"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 validationError:
 *                   type: string
 *                   example: "Internal server error"
 */
