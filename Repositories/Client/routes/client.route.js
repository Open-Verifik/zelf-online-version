const config = require("../../../Core/config");

const Controller = require("../controllers/client.controller");
const Middleware = require("../middlewares/client.middleware");
const primaryKey = "id";
const base = "/clients";

module.exports = (server) => {
	const PATH = config.basePath(base);

	// Routes
	server.put(`${PATH}/sync`, Middleware.updateValidation, Controller.update);
	server.put(`${PATH}/sync/password`, Middleware.updatePasswordValidation, Controller.updatePassword);
	server.del(`${PATH}/:${primaryKey}`, Middleware.destroyValidation, Controller.destroy);
};

/*
 * =============================================================================
 * SWAGGER DOCUMENTATION
 * =============================================================================
 *
 * @swagger
 * components:
 *   schemas:
 *     Client:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Client unique identifier
 *         name:
 *           type: string
 *           description: Client name
 *         email:
 *           type: string
 *           format: email
 *           description: Client email address
 *         countryCode:
 *           type: string
 *           description: Country code
 *         phone:
 *           type: string
 *           description: Phone number
 *         language:
 *           type: string
 *           enum: [en, es]
 *           description: Language preference
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Client creation timestamp
 *     CreateClientRequest:
 *       type: object
 *       required: [name, countryCode, phone, email]
 *       properties:
 *         name:
 *           type: string
 *           description: Client name
 *           example: "John Doe"
 *         countryCode:
 *           type: string
 *           description: Country code
 *           example: "+1"
 *         phone:
 *           type: string
 *           description: Phone number
 *           example: "5551234567"
 *         email:
 *           type: string
 *           format: email
 *           description: Client email address
 *           example: "john.doe@example.com"
 *         language:
 *           type: string
 *           enum: [en, es]
 *           description: Language preference
 *           example: "en"
 *     UpdateClientRequest:
 *       type: object
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
 *           enum: [en, es]
 *           description: Language preference
 *           example: "en"
 *     AuthClientRequest:
 *       type: object
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: Client email for authentication (required if phone not provided)
 *           example: "john.doe@example.com"
 *         countryCode:
 *           type: string
 *           description: Country code (required if email not provided)
 *           example: "+1"
 *         phone:
 *           type: string
 *           description: Phone number (required if email not provided)
 *           example: "5551234567"
 *         faceBase64:
 *           type: string
 *           description: Base64 encoded face image for biometric verification
 *           example: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ..."
 *         masterPassword:
 *           type: string
 *           description: Master password for biometric verification
 *           example: "mySecurePassword123"
 *
 * @swagger
 * /api/clients/{id}:
 *   get:
 *     summary: Get client by ID
 *     description: Retrieve a specific client by their ID (requires API key)
 *     tags: [Client]
 *     security:
 *       - apiKey: []
 *     parameters:
 *       - in: header
 *         name: x-api-key
 *         required: true
 *         schema:
 *           type: string
 *         description: API key for authentication
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Client ID
 *     responses:
 *       200:
 *         description: Client retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Client'
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
 *
 * @swagger
 * /api/clients/auth:
 *   post:
 *     summary: Authenticate client with biometric verification
 *     description: Authenticate a client using email OR phone number with optional biometric verification (requires API key)
 *     tags: [Client]
 *     security:
 *       - apiKey: []
 *     parameters:
 *       - in: header
 *         name: x-api-key
 *         required: true
 *         schema:
 *           type: string
 *         description: API key for authentication
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
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     token:
 *                       type: string
 *                       description: JWT authentication token
 *                     zelfProof:
 *                       type: string
 *                       description: Zelf proof for biometric verification
 *                     zelfAccount:
 *                       type: object
 *                       description: User account data from IPFS
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
 *       403:
 *         description: Missing or invalid API key, or biometric verification failed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 validationError:
 *                   type: string
 *                   example: "Missing key"
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
 *
 * @swagger
 * /api/clients/{id}:
 *   put:
 *     summary: Update client
 *     description: Update an existing client's information (requires API key)
 *     tags: [Client]
 *     security:
 *       - apiKey: []
 *     parameters:
 *       - in: header
 *         name: x-api-key
 *         required: true
 *         schema:
 *           type: string
 *         description: API key for authentication
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Client ID
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
 *
 * @swagger
 * /api/clients/{id}:
 *   delete:
 *     summary: Delete client
 *     description: Delete a client by their ID (requires API key)
 *     tags: [Client]
 *     security:
 *       - apiKey: []
 *     parameters:
 *       - in: header
 *         name: x-api-key
 *         required: true
 *         schema:
 *           type: string
 *         description: API key for authentication
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Client ID
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
 */
