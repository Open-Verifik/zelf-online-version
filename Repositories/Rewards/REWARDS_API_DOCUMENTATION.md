# Rewards API Documentation

## Overview

The Rewards API is a comprehensive system that manages user rewards for the ZelfName ecosystem. It provides daily rewards, first transaction rewards, and reward history tracking with dual storage (MongoDB + IPFS) for optimal performance and reliability.

## Architecture

### Storage Strategy
- **MongoDB**: Immediate storage with 5-minute TTL for fast queries
- **IPFS**: Permanent storage for long-term data persistence
- **Composite Keys**: Optimized for efficient data retrieval

### Key Components
- **Routes**: API endpoint definitions
- **Controllers**: Request handling and response formatting
- **Middlewares**: Input validation and data normalization
- **Modules**: Business logic and data processing
- **Models**: MongoDB schema definitions

## API Endpoints

### Base URL
```
/api/rewards
```

### 1. Daily Rewards Endpoint

**POST** `/api/rewards/daily`

Claim daily wheel rewards based on ZelfName type.

#### Request Body
```json
{
  "zelfName": "username" // or "username.zelf"
}
```

#### Validation Rules
- `zelfName`: Required, 3-27 characters
- Automatically appends `.zelf` suffix if missing

#### Response Examples

**Success Response:**
```json
{
  "success": true,
  "message": "Congratulations! You've spun the wheel and won your daily reward!",
  "reward": {
    "rewardPrimaryKey": "username.zelf2024-01-15",
    "amount": 0.75,
    "currency": "ZNS",
    "type": "daily",
    "zelfNameType": "hold",
    "claimedAt": "2024-01-15T10:30:00.000Z",
    "nextClaimAvailable": "2024-01-16T00:00:00.000Z",
    "ipfsCid": "QmX...",
    "mongoId": "507f1f77bcf86cd799439011",
    "tokenTransfer": {
      "success": true,
      "signature": "5J7...",
      "amount": 0.75,
      "recipientAddress": "ABC123..."
    },
    "storage": {
      "mongodb": "immediate (5min TTL)",
      "ipfs": "stored"
    }
  },
  "tokenTransferStatus": "success",
  "tokenTransferMessage": "0.75 ZNS tokens have been sent to your Solana address!"
}
```

**Already Claimed Response:**
```json
{
  "success": false,
  "reward": {
    "rewardPrimaryKey": "username.zelf2024-01-15",
    "amount": 0.75,
    "type": "daily",
    "claimedAt": "2024-01-15T10:30:00.000Z"
  },
  "message": "You have already claimed your daily reward today. Come back tomorrow!",
  "nextClaimAvailable": "2024-01-16T00:00:00.000Z"
}
```

**Error Response:**
```json
{
  "error": "No Solana address found for this ZelfName. Please update your ZelfName with a Solana address to receive rewards."
}
```

#### Reward Amounts by ZelfName Type
- **Hold ZelfNames**: 0.1 - 1.0 ZNS
- **Mainnet ZelfNames**: 0.2 - 2.0 ZNS

### 2. First Transaction Reward Endpoint

**POST** `/api/rewards/first-transaction`

Reward users for their first ZNS token transaction.

#### Request Body
```json
{
  "zelfName": "username" // or "username.zelf"
}
```

#### Response Examples

**Success Response:**
```json
{
  "success": true,
  "message": "First transaction reward claimed successfully!",
  "reward": {
    "amount": 1.0,
    "rewardType": "first_transaction",
    "zelfName": "username.zelf",
    "description": "First ZNS Transaction Reward",
    "requirements": {
      "action": "Sent ZNS tokens",
      "transactionCount": 3,
      "totalAmountSent": 5.5,
      "lastTransaction": "5J7..."
    }
  },
  "tokenTransfer": {
    "success": true,
    "signature": "5J7...",
    "amount": 1.0,
    "recipientAddress": "ABC123..."
  },
  "tokenTransferStatus": "success",
  "ipfsHash": "QmX...",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Already Claimed Response:**
```json
{
  "success": false,
  "message": "First transaction reward already claimed",
  "rewardType": "first_transaction",
  "alreadyClaimed": true
}
```

**Not Eligible Response:**
```json
{
  "success": false,
  "message": "No ZNS token transactions found. Make your first ZNS transaction to earn this reward!",
  "rewardType": "first_transaction",
  "eligible": false,
  "requirements": {
    "action": "Send ZNS tokens",
    "description": "Make your first ZNS token transaction to unlock this reward"
  }
}
```

### 3. Reward History Endpoint

**GET** `/api/rewards/history/:zelfName`

Get user's reward history with pagination.

#### URL Parameters
- `zelfName`: User's ZelfName (3-27 characters)

#### Query Parameters
- `limit`: Number of rewards to return (1-100, default: 10)

#### Example Request
```
GET /api/rewards/history/username?limit=20
```

#### Response Example
```json
{
  "rewards": [
    {
      "ipfsCid": "QmX...",
      "metadata": {
        "name": "username.zelf",
        "rewardType": "daily",
        "amount": "0.75",
        "rewardDate": "2024-01-15",
        "redeemedAt": "2024-01-15 10:30:00"
      },
      "amount": 0.75,
      "rewardType": "daily",
      "rewardDate": "2024-01-15",
      "claimedAt": "2024-01-15 10:30:00",
      "status": "claimed"
    }
  ],
  "totalEarned": 15.25,
  "rewardsCount": 25
}
```

### 4. Reward Statistics Endpoint

**GET** `/api/rewards/stats/:zelfName`

Get user's reward statistics including streaks and totals.

#### URL Parameters
- `zelfName`: User's ZelfName (3-27 characters)

#### Example Request
```
GET /api/rewards/stats/username
```

#### Response Example
```json
{
  "dailyStreak": 7,
  "weeklyTotal": 5.25,
  "monthlyTotal": 18.50,
  "canClaimToday": false,
  "nextClaimAvailable": "2024-01-16T00:00:00.000Z"
}
```

## Testing Guide

### Prerequisites
1. Ensure MongoDB is running
2. Configure IPFS connection
3. Set up Solana wallet integration
4. Have test ZelfNames with Solana addresses

### Environment Variables
```bash
# Required
MONGODB_URI=your_mongodb_connection_string
NODE_ENV=development

# Optional
DEBUG_MONGO=true
```

### Test Scenarios

#### 1. Daily Rewards Testing

**Test Case 1: Successful Daily Claim**
```bash
curl -X POST http://localhost:3000/api/rewards/daily \
  -H "Content-Type: application/json" \
  -d '{"zelfName": "testuser"}'
```

**Test Case 2: Duplicate Daily Claim**
```bash
# Run the same request twice within 24 hours
curl -X POST http://localhost:3000/api/rewards/daily \
  -H "Content-Type: application/json" \
  -d '{"zelfName": "testuser"}'
```

**Test Case 3: Invalid ZelfName**
```bash
curl -X POST http://localhost:3000/api/rewards/daily \
  -H "Content-Type: application/json" \
  -d '{"zelfName": "ab"}'
```

#### 2. First Transaction Reward Testing

**Test Case 1: Eligible User**
```bash
curl -X POST http://localhost:3000/api/rewards/first-transaction \
  -H "Content-Type: application/json" \
  -d '{"zelfName": "testuser"}'
```

**Test Case 2: Already Claimed**
```bash
# Run the same request twice
curl -X POST http://localhost:3000/api/rewards/first-transaction \
  -H "Content-Type: application/json" \
  -d '{"zelfName": "testuser"}'
```

#### 3. Reward History Testing

**Test Case 1: Get History with Limit**
```bash
curl "http://localhost:3000/api/rewards/history/testuser?limit=5"
```

**Test Case 2: Get History without Limit**
```bash
curl "http://localhost:3000/api/rewards/history/testuser"
```

#### 4. Reward Statistics Testing

**Test Case 1: Get User Stats**
```bash
curl "http://localhost:3000/api/rewards/stats/testuser"
```

### Automated Testing

Create a test file `test-rewards-api.js`:

```javascript
const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api/rewards';

async function testRewardsAPI() {
  const testZelfName = 'testuser';
  
  try {
    // Test daily rewards
    
    const dailyResponse = await axios.post(`${BASE_URL}/daily`, {
      zelfName: testZelfName
    });
   
    // Test first transaction reward
    const firstTxResponse = await axios.post(`${BASE_URL}/first-transaction`, {
      zelfName: testZelfName
    });
    
    // Test reward history
    const historyResponse = await axios.get(`${BASE_URL}/history/${testZelfName}?limit=10`);
    
    // Test reward stats
    const statsResponse = await axios.get(`${BASE_URL}/stats/${testZelfName}`);
    
  } catch (error) {
    console.error('Test failed:', error.response?.data || error.message);
  }
}

testRewardsAPI();
```

## Technical Implementation Details

### Data Flow
1. **Request Validation**: Middleware validates input and normalizes ZelfName
2. **Business Logic**: Module processes the request and handles rewards
3. **Dual Storage**: MongoDB for immediate access, IPFS for permanence
4. **Token Transfer**: Automatic ZNS token distribution to user's Solana address
5. **Response**: Structured response with success/error status

### Key Features
- **Rate Limiting**: Prevents abuse through daily claim limits
- **Composite Keys**: Optimized for efficient data retrieval
- **TTL Caching**: MongoDB documents auto-expire after 5 minutes
- **Error Handling**: Comprehensive error messages and status codes
- **Token Integration**: Automatic Solana token transfers
- **Streak Tracking**: Calculates daily claim streaks
- **Statistics**: Weekly/monthly totals and eligibility status

### Security Considerations
- Input validation with Joi schemas
- ZelfName normalization and validation
- Solana address verification
- Rate limiting on endpoints
- Secure token transfer handling

### Performance Optimizations
- MongoDB TTL for fast queries
- IPFS for permanent storage
- Composite keys for efficient filtering
- Async token transfers (non-blocking)
- Optimized database indexes

## Error Codes and Messages

| Status Code | Error Type | Description |
|-------------|------------|-------------|
| 400 | Validation Error | Invalid input parameters |
| 400 | ZelfName Error | ZelfName not found or invalid |
| 400 | Solana Address Error | No Solana address configured |
| 409 | Already Claimed | Reward already claimed today |
| 500 | Server Error | Internal server error |

## Monitoring and Logging

The system includes comprehensive logging for:
- Reward claims and amounts
- Token transfer successes/failures
- IPFS storage operations
- MongoDB operations
- Error tracking and debugging

## Future Enhancements

- Notification system integration
- Weekly/monthly reward summaries
- Referral reward system
- Achievement-based rewards
- Advanced analytics dashboard
- Mobile push notifications 