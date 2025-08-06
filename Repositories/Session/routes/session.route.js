const config = require("../../../Core/config");

const Controller = require("../controllers/session.controller");
const Middleware = require("../middlewares/session.middleware");

const base = "/sessions";

/**
 * @swagger
 * components:
 *   schemas:
 *     Session:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: Session unique identifier
 *         identifier:
 *           type: string
 *           description: Session identifier (unique)
 *           example: "session_123456789"
 *         clientIP:
 *           type: string
 *           description: Client IP address
 *           example: "192.168.1.1"
 *         isWebExtension:
 *           type: boolean
 *           description: Whether the session is from a web extension
 *           example: false
 *         status:
 *           type: string
 *           enum: [active, used]
 *           description: Session status
 *           example: "active"
 *         type:
 *           type: string
 *           enum: [createWallet, decryptWallet, importWallet, general]
 *           description: Session type
 *           example: "createWallet"
 *         activatedAt:
 *           type: string
 *           format: date-time
 *           description: When the session was activated
 *           example: "2024-01-01T00:00:00.000Z"
 *         globalCount:
 *           type: number
 *           description: Global usage count
 *           example: 0
 *         searchCount:
 *           type: number
 *           description: Search operation count
 *           example: 0
 *         leaseCount:
 *           type: number
 *           description: Lease operation count
 *           example: 0
 *         decryptCount:
 *           type: number
 *           description: Decrypt operation count
 *           example: 0
 *         previewCount:
 *           type: number
 *           description: Preview operation count
 *           example: 0
 *         completedAt:
 *           type: string
 *           format: date-time
 *           description: When the session was completed
 *           example: "2024-01-01T00:00:00.000Z"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Session creation timestamp
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Session last update timestamp
 *     CreateSessionRequest:
 *       type: object
 *       required: [identifier]
 *       properties:
 *         identifier:
 *           type: string
 *           description: Unique session identifier
 *           example: "session_123456789"
 *         isWebExtension:
 *           type: boolean
 *           description: Whether this is a web extension session
 *           example: false
 *         type:
 *           type: string
 *           enum: [createWallet, decryptWallet, importWallet, general]
 *           description: Type of session
 *           example: "createWallet"
 *     CreateSessionResponse:
 *       type: object
 *       properties:
 *         data:
 *           $ref: '#/components/schemas/Session'
 *     GetPublicKeyRequest:
 *       type: object
 *       required: [identifier]
 *       properties:
 *         identifier:
 *           type: string
 *           description: Session identifier
 *           example: "session_123456789"
 *         name:
 *           type: string
 *           description: User name (optional)
 *           example: "John Doe"
 *         email:
 *           type: string
 *           format: email
 *           description: User email (optional)
 *           example: "john@example.com"
 *     GetPublicKeyResponse:
 *       type: object
 *       properties:
 *         data:
 *           type: object
 *           properties:
 *             publicKey:
 *               type: string
 *               description: Extracted public key
 *               example: "04a1b2c3d4e5f6..."
 *             sessionId:
 *               type: string
 *               description: Session ID
 *               example: "session_123456789"
 *     DecryptContentRequest:
 *       type: object
 *       required: [message]
 *       properties:
 *         message:
 *           type: string
 *           description: Encrypted message to decrypt
 *           example: "encrypted_message_data_here"
 *         sessionId:
 *           type: string
 *           description: Session identifier for decryption
 *           example: "session_123456789"
 *     DecryptContentResponse:
 *       type: object
 *       properties:
 *         data:
 *           type: object
 *           properties:
 *             decryptedContent:
 *               type: string
 *               description: Decrypted content
 *               example: "decrypted_wallet_data"
 *             sessionId:
 *               type: string
 *               description: Session ID used for decryption
 *               example: "session_123456789"
 *     ValidationError:
 *       type: object
 *       properties:
 *         validationError:
 *           type: string
 *           description: Validation error message
 *           example: "identifier is required"
 *     SessionError:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 *           description: Error message
 *           example: "Invalid session"
 */

module.exports = (server) => {
	const PATH = config.basePath(base);

	/**
	 * @swagger
	 * /api/sessions/yek-cilbup:
	 *   get:
	 *     summary: Get public key for session
	 *     description: Extract public key for a given session identifier. This endpoint is used for wallet operations that require public key extraction.
	 *     tags: [Session]
	 *     parameters:
	 *       - in: query
	 *         name: identifier
	 *         required: true
	 *         schema:
	 *           type: string
	 *         description: Session identifier
	 *         example: "session_123456789"
	 *       - in: query
	 *         name: name
	 *         schema:
	 *           type: string
	 *         description: User name (optional)
	 *         example: "John Doe"
	 *       - in: query
	 *         name: email
	 *         schema:
	 *           type: string
	 *           format: email
	 *         description: User email (optional)
	 *         example: "john@example.com"
	 *     responses:
	 *       200:
	 *         description: Public key extracted successfully
	 *         content:
	 *           application/json:
	 *             schema:
	 *               $ref: '#/components/schemas/GetPublicKeyResponse'
	 *       409:
	 *         description: Validation error
	 *         content:
	 *           application/json:
	 *             schema:
	 *               $ref: '#/components/schemas/ValidationError'
	 *       500:
	 *         description: Internal server error
	 *         content:
	 *           application/json:
	 *             schema:
	 *               $ref: '#/components/schemas/Error'
	 */
	server.get(`${PATH}/yek-cilbup`, Middleware.getPublicKeyValidation, Controller.getPublicKey);

	/**
	 * @swagger
	 * /api/sessions:
	 *   post:
	 *     summary: Create new session
	 *     description: Create a new session for wallet operations. Sessions are used to track and manage wallet creation, decryption, and import operations.
	 *     tags: [Session]
	 *     requestBody:
	 *       required: true
	 *       content:
	 *         application/json:
	 *           schema:
	 *             $ref: '#/components/schemas/CreateSessionRequest'
	 *     responses:
	 *       200:
	 *         description: Session created successfully
	 *         content:
	 *           application/json:
	 *             schema:
	 *               $ref: '#/components/schemas/CreateSessionResponse'
	 *       403:
	 *         description: Request rejected (production environment validation failed)
	 *         content:
	 *           application/json:
	 *             schema:
	 *               type: object
	 *               properties:
	 *                 error:
	 *                   type: string
	 *                   example: "rejected"
	 *       500:
	 *         description: Internal server error
	 *         content:
	 *           application/json:
	 *             schema:
	 *               $ref: '#/components/schemas/Error'
	 */
	server.post(`${PATH}`, Controller.create);

	/**
	 * @swagger
	 * /api/sessions/decrypt-content:
	 *   post:
	 *     summary: Decrypt content using session
	 *     description: Decrypt encrypted content using session-based encryption. This endpoint is used for wallet decryption operations.
	 *     tags: [Session]
	 *     requestBody:
	 *       required: true
	 *       content:
	 *         application/json:
	 *           schema:
	 *             $ref: '#/components/schemas/DecryptContentRequest'
	 *     responses:
	 *       200:
	 *         description: Content decrypted successfully
	 *         content:
	 *           application/json:
	 *             schema:
	 *               $ref: '#/components/schemas/DecryptContentResponse'
	 *       409:
	 *         description: Validation error
	 *         content:
	 *           application/json:
	 *             schema:
	 *               $ref: '#/components/schemas/ValidationError'
	 *       500:
	 *         description: Internal server error
	 *         content:
	 *           application/json:
	 *             schema:
	 *               $ref: '#/components/schemas/Error'
	 */
	server.post(`${PATH}/decrypt-content`, Middleware.decryptValidation, Controller.decryptContent);
};
