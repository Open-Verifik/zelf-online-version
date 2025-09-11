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

/*
 * =============================================================================
 * SWAGGER DOCUMENTATION
 * =============================================================================
 *
 * @swagger
 * /api/clients:
 *   post:
 *     summary: Create new client (unprotected)
 *     description: Create a new client with the provided information (no authentication required)
 *     tags: [Client]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - countryCode
 *               - phone
 *               - email
 *               - company
 *               - faceBase64
 *             properties:
 *               name:
 *                 type: string
 *                 description: Client name
 *               countryCode:
 *                 type: string
 *                 description: Country code
 *               phone:
 *                 type: string
 *                 description: Phone number
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Client email address
 *               language:
 *                 type: string
 *                 enum: [en, es]
 *                 description: Preferred language
 *               company:
 *                 type: string
 *                 description: Company name
 *               faceBase64:
 *                 type: string
 *                 description: Base64 encoded face image
 *     responses:
 *       200:
 *         description: Client created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   description: Created client data
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
 * /api/clients/verify:
 *   post:
 *     summary: Verify client exists (unprotected)
 *     description: Check if a client exists based on email or phone number (no authentication required)
 *     tags: [Client]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Client email for verification (required if phone not provided)
 *                 example: "john.doe@example.com"
 *               countryCode:
 *                 type: string
 *                 description: Country code (required if email not provided)
 *                 example: "+1"
 *               phone:
 *                 type: string
 *                 description: Phone number (required if email not provided)
 *                 example: "5551234567"
 *               identificationMethod:
 *                 type: string
 *                 enum: [email, phone]
 *                 description: Identification method used
 *                 example: "email"
 *     responses:
 *       200:
 *         description: Client verification result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     exists:
 *                       type: boolean
 *                       description: Whether the client exists
 *                     client:
 *                       type: object
 *                       description: Client data if exists
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
 */
