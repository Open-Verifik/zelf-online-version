# Zelf Test Suite

This directory contains comprehensive tests for the Zelf Online Version API endpoints and functionality.

## Test Structure

### Files

- **`main.test.js`** - Main test suite with setup, utilities, and basic connectivity tests
- **`lease-tags.test.js`** - Comprehensive tests for tag leasing functionality
- **`test-runner.js`** - Test runner script with server validation and options
- **`config/0012589021.json`** - Test data configuration with face and password data

### Test Categories

#### 1. API Connectivity Tests
- Server connection validation
- JWT token generation and validation
- Basic endpoint accessibility

#### 2. Tag Leasing Tests
- **Tag Search and Availability**
  - Search for tag availability
  - Preview tag before leasing
  - Validate tag name formats

- **Normal Tag Leasing with New Wallet**
  - Create new wallet during lease
  - Generate 12-word mnemonic
  - Validate wallet address format
  - Face verification and biometric processing

- **Tag Decryption Tests**
  - Decrypt tag with face and password
  - Validate wallet data retrieval
  - Test authentication flow

- **Error Handling Tests**
  - Invalid tag name handling
  - Missing face data validation
  - Invalid face data handling
  - Authentication failures

- **Cleanup Tests**
  - Verify leased tags are no longer available
  - Test data cleanup

## Test Data

The test suite uses the configuration file `config/0012589021.json` which contains:

```json
{
  "faceBase64": "base64-encoded-face-image-data",
  "password": "909090"
}
```

This data is used for:
- Face verification in biometric tests
- Password-based authentication
- Wallet decryption tests

## Running Tests

### Prerequisites

1. **Start the Zelf server:**
   ```bash
   cd /Users/user/zelf-project/zelf-online-version
   npm start
   ```

2. **Install test dependencies:**
   ```bash
   npm install --save-dev jest supertest
   ```

### Running Tests

#### Using the Test Runner (Recommended)

```bash
# Run all tests once
node test-runner.js

# Run tests in watch mode
node test-runner.js --watch

# Run tests with coverage
node test-runner.js --coverage

# Verbose output
node test-runner.js --verbose

# Watch mode with verbose output
node test-runner.js --watch --verbose
```

#### Using Jest Directly

```bash
# Run all tests
npx jest

# Run specific test file
npx jest tests/lease-tags.test.js

# Run tests in watch mode
npx jest --watch

# Run with coverage
npx jest --coverage
```

## Test Configuration

### Environment Variables

- `TEST_BASE_URL` - Base URL for API tests (default: `http://localhost:${PORT}`)
- `PORT` - Server port (default: 3003, from .env file)
- `JWT_SECRET` or `CONNECTION_KEY` - JWT secret for token generation (from .env file)

### Test Timeouts

- **Test Suite Timeout:** 30 seconds
- **Session Timeout:** 5 minutes
- **Individual Test Timeout:** 30 seconds

## Test Utilities

The `TestUtils` class provides:

### Authentication
- `initializeSession()` - Create session and generate JWT token
- `getJWTToken()` - Get current JWT token
- `makeAuthenticatedRequest()` - Make authenticated API requests

### Test Data
- `getTestFaceData()` - Get base64 face image data
- `getTestPassword()` - Get test password
- `generateTestTagName()` - Generate unique test tag names

### Utilities
- `validateResponse()` - Validate API response structure
- `wait()` - Wait for specified milliseconds
- `logStep()` - Log test steps
- `logResult()` - Log test results

## Test Examples

### Basic Tag Search Test

```javascript
test('should search for tag availability', async () => {
    testUtils.logStep(`Searching for tag: ${testTagName}`);
    
    const response = await testUtils.makeAuthenticatedRequest('GET', 
        `${TEST_CONFIG.apiBasePath}/tags/search`, 
        {
            tagName: testTagName,
            os: 'DESKTOP'
        }
    );

    expect(response.status).toBe(200);
    expect(response.body.data.available).toBe(true);
});
```

### Tag Leasing Test

```javascript
test('should lease tag and create new wallet', async () => {
    const leaseData = {
        tagName: testTagName,
        faceBase64: testUtils.getTestFaceData(),
        type: 'create',
        os: 'DESKTOP',
        wordsCount: 12
    };

    const response = await testUtils.makeAuthenticatedRequest('POST', 
        `${TEST_CONFIG.apiBasePath}/tags/lease`, 
        leaseData
    );

    expect(response.status).toBe(200);
    expect(response.body.data.success).toBe(true);
    expect(response.body.data.walletAddress).toBeDefined();
    expect(response.body.data.mnemonic).toBeDefined();
});
```

## Troubleshooting

### Common Issues

1. **Server Not Running**
   ```
   ❌ Server is not running on port 3000
   💡 Please start the server first: npm start
   ```
   **Solution:** Start the Zelf server before running tests

2. **JWT Token Issues**
   ```
   ❌ Failed to initialize session: Invalid session response format
   ```
   **Solution:** Check that the session endpoint is working and JWT_SECRET is set

3. **Face Data Issues**
   ```
   ❌ Invalid face data handling
   ```
   **Solution:** Ensure the test configuration file has valid base64 face data

4. **Test Timeouts**
   ```
   Timeout - Async callback was not invoked within the 30000ms timeout
   ```
   **Solution:** Increase timeout in jest.config.js or check server performance

### Debug Mode

To run tests with detailed logging:

```bash
DEBUG=* node test-runner.js --verbose
```

## Contributing

When adding new tests:

1. Follow the existing test structure
2. Use descriptive test names
3. Include proper error handling
4. Add cleanup for test data
5. Update this README with new test categories

## Test Coverage

The test suite covers:

- ✅ Session management and JWT authentication
- ✅ Tag search and availability checking
- ✅ Tag leasing with new wallet creation
- ✅ Face verification and biometric processing
- ✅ Wallet generation and mnemonic creation
- ✅ Tag decryption with authentication
- ✅ Error handling and validation
- ✅ API response structure validation

## Future Enhancements

- [ ] Add tests for offline tag leasing
- [ ] Add tests for tag recovery functionality
- [ ] Add tests for multiple domain support
- [ ] Add performance benchmarking tests
- [ ] Add integration tests with external services
- [ ] Add tests for rate limiting and security
