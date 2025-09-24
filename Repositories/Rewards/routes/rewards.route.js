const config = require("../../../Core/config");

const Controller = require("../controllers/rewards.controller");
const Middleware = require("../middlewares/rewards.middleware");

const base = "/rewards";

module.exports = (server) => {
	const PATH = config.basePath(base);

	server.post(`${PATH}/daily`, Middleware.dailyRewardsValidation, Controller.dailyRewards);
	server.post(`${PATH}/first-transaction`, Middleware.firstTransactionRewardValidation, Controller.firstTransactionReward);
	server.get(`${PATH}/history/:tagName`, Middleware.rewardHistoryValidation, Controller.rewardHistory);
	server.get(`${PATH}/stats/:tagName`, Middleware.rewardStatsValidation, Controller.rewardStats);
};

/**
 * @swagger
 * components:
 *   schemas:
 *     Reward:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: Reward unique identifier
 *         rewardPrimaryKey:
 *           type: string
 *           description: Unique primary key for the reward
 *           example: "username.zelf2024-01-15"
 *         name:
 *           type: string
 *           description: Reward name
 *           example: "Daily Reward"
 *         amount:
 *           type: number
 *           description: Reward amount
 *           example: 100
 *         type:
 *           type: string
 *           enum: [daily, referral, bonus, achievement]
 *           description: Type of reward
 *           example: "daily"
 *         status:
 *           type: string
 *           enum: [pending, claimed, expired, failed]
 *           description: Reward status
 *           example: "claimed"
 *         failReason:
 *           type: string
 *           description: Reason for failure (if applicable)
 *           example: "Insufficient balance"
 *         description:
 *           type: string
 *           description: Reward description
 *           example: "Daily login reward"
 *         rewardDate:
 *           type: string
 *           format: date-time
 *           description: Date when reward was created
 *           example: "2024-01-15T00:00:00.000Z"
 *         redeemedAt:
 *           type: string
 *           format: date-time
 *           description: Date when reward was redeemed
 *           example: "2024-01-15T00:05:00.000Z"
 *         zelfNameType:
 *           type: string
 *           enum: [hold, mainnet]
 *           description: Type of zelf name
 *           example: "mainnet"
 *         ipfsCid:
 *           type: string
 *           description: IPFS CID for reward metadata
 *           example: "QmX..."
 *         metadata:
 *           type: object
 *           description: Additional reward metadata
 *         expiresAt:
 *           type: string
 *           format: date-time
 *           description: When the reward expires
 *           example: "2024-01-15T00:05:00.000Z"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Creation timestamp
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Last update timestamp
 *     DailyRewardRequest:
 *       type: object
 *       required: [tagName]
 *       properties:
 *         tagName:
 *           type: string
 *           description: Tag name (supports multiple domains)
 *           example: "username.avax"
 *         domain:
 *           type: string
 *           description: Specific domain for the tag (optional if included in tagName)
 *           example: "avax"
 *     FirstTransactionRewardRequest:
 *       type: object
 *       required: [tagName]
 *       properties:
 *         tagName:
 *           type: string
 *           description: Tag name (supports multiple domains)
 *           example: "username.avax"
 *         domain:
 *           type: string
 *           description: Specific domain for the tag (optional if included in tagName)
 *           example: "avax"
 *     RewardHistoryResponse:
 *       type: object
 *       properties:
 *         rewards:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Reward'
 *         total:
 *           type: number
 *           description: Total number of rewards
 *           example: 25
 *         limit:
 *           type: number
 *           description: Number of rewards returned
 *           example: 10
 *     RewardStatsResponse:
 *       type: object
 *       properties:
 *         totalRewards:
 *           type: number
 *           description: Total number of rewards earned
 *           example: 150
 *         totalAmount:
 *           type: number
 *           description: Total amount of rewards earned
 *           example: 15000
 *         dailyRewards:
 *           type: number
 *           description: Number of daily rewards claimed
 *           example: 30
 *         referralRewards:
 *           type: number
 *           description: Number of referral rewards earned
 *           example: 5
 *         bonusRewards:
 *           type: number
 *           description: Number of bonus rewards earned
 *           example: 10
 *         achievementRewards:
 *           type: number
 *           description: Number of achievement rewards earned
 *           example: 2
 *         pendingRewards:
 *           type: number
 *           description: Number of pending rewards
 *           example: 1
 *         claimedRewards:
 *           type: number
 *           description: Number of claimed rewards
 *           example: 149
 *         expiredRewards:
 *           type: number
 *           description: Number of expired rewards
 *           example: 0
 *         failedRewards:
 *           type: number
 *           description: Number of failed rewards
 *           example: 0
 *     RewardResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           description: Whether the reward operation was successful
 *           example: true
 *         reward:
 *           $ref: '#/components/schemas/Reward'
 *         message:
 *           type: string
 *           description: Success or error message
 *           example: "Daily reward claimed successfully"
 */

/**
 * @swagger
 * /api/rewards/daily:
 *   post:
 *     summary: Claim daily reward
 *     description: Claim a daily reward for the specified zelf name. Users can claim one daily reward per day.
 *     tags: [Rewards]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DailyRewardRequest'
 *     responses:
 *       200:
 *         description: Daily reward claimed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RewardResponse'
 *       400:
 *         description: Invalid request data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "tagName is required"
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Daily reward already claimed today
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Daily reward already claimed for today"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/rewards/first-transaction:
 *   post:
 *     summary: Claim first transaction reward
 *     description: Claim a reward for completing the first transaction. This reward can only be claimed once per user.
 *     tags: [Rewards]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/FirstTransactionRewardRequest'
 *     responses:
 *       200:
 *         description: First transaction reward claimed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RewardResponse'
 *       400:
 *         description: Invalid request data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "tagName is required"
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: First transaction reward already claimed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "First transaction reward already claimed"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/rewards/history/{tagName}:
 *   get:
 *     summary: Get user reward history
 *     description: Retrieve the reward history for a specific tag name. Returns a paginated list of rewards.
 *     tags: [Rewards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tagName
 *         required: true
 *         schema:
 *           type: string
 *         description: Tag name (supports multiple domains)
 *         example: "username.avax"
 *       - in: query
 *         name: domain
 *         schema:
 *           type: string
 *         description: Specific domain for the tag (optional if included in tagName)
 *         example: "avax"
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of rewards to return (max 100)
 *         example: 20
 *     responses:
 *       200:
 *         description: Reward history retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RewardHistoryResponse'
 *       400:
 *         description: Invalid request data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "tagName is required"
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: No rewards found for this user
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 rewards:
 *                   type: array
 *                   items: []
 *                 total:
 *                   type: number
 *                   example: 0
 *                 limit:
 *                   type: number
 *                   example: 10
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/rewards/stats/{tagName}:
 *   get:
 *     summary: Get user reward statistics
 *     description: Retrieve comprehensive reward statistics for a specific tag name, including totals and breakdowns by type and status.
 *     tags: [Rewards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tagName
 *         required: true
 *         schema:
 *           type: string
 *         description: Tag name (supports multiple domains)
 *         example: "username.avax"
 *       - in: query
 *         name: domain
 *         schema:
 *           type: string
 *         description: Specific domain for the tag (optional if included in tagName)
 *         example: "avax"
 *     responses:
 *       200:
 *         description: Reward statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RewardStatsResponse'
 *       400:
 *         description: Invalid request data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "tagName is required"
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: No reward statistics found for this user
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalRewards:
 *                   type: number
 *                   example: 0
 *                 totalAmount:
 *                   type: number
 *                   example: 0
 *                 dailyRewards:
 *                   type: number
 *                   example: 0
 *                 referralRewards:
 *                   type: number
 *                   example: 0
 *                 bonusRewards:
 *                   type: number
 *                   example: 0
 *                 achievementRewards:
 *                   type: number
 *                   example: 0
 *                 pendingRewards:
 *                   type: number
 *                   example: 0
 *                 claimedRewards:
 *                   type: number
 *                   example: 0
 *                 expiredRewards:
 *                   type: number
 *                   example: 0
 *                 failedRewards:
 *                   type: number
 *                   example: 0
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
