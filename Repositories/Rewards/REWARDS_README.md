# Rewards System Documentation

## Overview
This directory contains comprehensive documentation and testing tools for the Rewards API system that manages user rewards for the ZelfName ecosystem.

## Files Created

### 📚 Documentation
- **`REWARDS_API_DOCUMENTATION.md`** - Complete API documentation with all endpoints, examples, and technical details
- **`REWARDS_SETUP_GUIDE.md`** - Quick setup guide for getting the rewards system running and tested

### 🧪 Testing
- **`test-rewards-api.js`** - Automated test suite for all rewards endpoints

## API Endpoints Implemented

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/rewards/daily` | POST | Claim daily wheel rewards |
| `/api/rewards/first-transaction` | POST | Claim first transaction rewards |
| `/api/rewards/history/:zelfName` | GET | Get user reward history |
| `/api/rewards/stats/:zelfName` | GET | Get user reward statistics |

## Quick Start

1. **Read the setup guide**: `REWARDS_SETUP_GUIDE.md`
2. **Review the full documentation**: `REWARDS_API_DOCUMENTATION.md`
3. **Run the tests**: `node test-rewards-api.js`

## Key Features

- ✅ Daily wheel rewards (0.1-2.0 ZNS based on ZelfName type)
- ✅ First transaction rewards (1.0 ZNS)
- ✅ Reward history and statistics
- ✅ Dual storage (MongoDB + IPFS)
- ✅ Automatic Solana token transfers
- ✅ Comprehensive validation and error handling

## Testing

The test suite covers:
- Daily reward claims and duplicates
- First transaction rewards
- Reward history retrieval
- Statistics calculation
- Validation errors
- Edge cases

Run with: `node test-rewards-api.js`

## Architecture

The rewards system uses:
- **MongoDB**: Fast queries with 5-minute TTL
- **IPFS**: Permanent storage
- **Composite keys**: Optimized data retrieval
- **Joi validation**: Input validation
- **Solana integration**: Token transfers

## Next Steps

1. Configure environment variables
2. Set up MongoDB and IPFS connections
3. Configure Solana wallet integration
4. Run the test suite
5. Deploy to production

For detailed information, see the full documentation in `REWARDS_API_DOCUMENTATION.md`. 