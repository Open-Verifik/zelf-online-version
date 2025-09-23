# Testing Setup

This project uses Jest with Supertest for comprehensive testing of the Zelf wallet backend.

## Database Safety

**IMPORTANT**: Tests use a completely separate database (`zelf_testing`) and will NEVER interfere with your production or development databases. Multiple safety checks are in place to prevent accidental data loss.

## NO MOCKING POLICY

**CRITICAL**: This project follows a strict **NO MOCKING POLICY**. All tests work with real data, real API calls, and real service responses. No mocking of external services, databases, or APIs is allowed.

### Why No Mocking?
- **Real Data Validation**: Tests validate actual data processing
- **Integration Confidence**: Ensures real-world compatibility
- **Service Reliability**: Tests actual external service integration
- **Data Integrity**: Validates real database operations

## Test Structure

```
tests/
├── config/          # Test configuration files
│   └── test.config.js
├── unit/           # Unit tests for individual functions/modules
├── integration/    # Integration tests for API endpoints
├── e2e/           # End-to-end tests for complete user flows
├── fixtures/      # Test data and mock files
├── helpers/       # Test utilities and helper functions
├── setup.js       # Jest setup configuration
├── globalSetup.js # Global test setup
└── globalTeardown.js # Global test cleanup
```

## Available Test Commands

- `npm test` - Run all tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report
- `npm run test:unit` - Run only unit tests
- `npm run test:integration` - Run only integration tests
- `npm run test:e2e` - Run only end-to-end tests
- `npm run test:ci` - Run tests in CI mode (no watch, with coverage)

## Test Configuration

The Jest configuration is defined in `jest.config.js` and `jest.integration.config.js` with the following features:

- **Test Environment**: Node.js
- **Database**: Dedicated `zelf_testing` database (completely isolated)
- **Coverage**: Enabled with HTML, LCOV, and text reports
- **Timeout**: 30 seconds for async operations
- **Safety Checks**: Multiple safeguards to prevent production database access
- **NO MOCKING**: All tests work with real data and real services
- **Real Data Only**: Console methods preserved for debugging real operations

## Database Safety Features

### 1. Dedicated Test Database
- All tests use `mongodb://localhost:27017/zelf_testing`
- Never connects to production or development databases
- Automatic database cleanup after tests

### 2. Safety Checks
- Database name validation before cleanup operations
- Error throwing if non-test database is accessed
- Warning messages for safety violations

### 3. Environment Isolation
- Test-specific environment variables
- Separate JWT secrets for testing
- Different port configurations

## Writing Tests

### Unit Tests
Test individual functions and modules with real data:

```javascript
describe('MyFunction', () => {
  it('should process real data correctly', () => {
    const realData = testHelper.createRealTestData('user');
    const result = myFunction(realData);
    expect(result).toBeDefined();
    expect(result.isTestData).toBe(true);
  });
});
```

### Integration Tests
Test API endpoints with real data and real service calls:

```javascript
describe('API Endpoints', () => {
  it('should return real data for valid request', async () => {
    const realData = testHelper.createRealTestData('user');
    const response = await request(app)
      .post('/api/endpoint')
      .send(realData)
      .expect(200);
    
    expect(response.body).toHaveProperty('data');
    expect(response.body.data.isTestData).toBe(true);
  });
});
```

### E2E Tests
Test complete user workflows with real data:

```javascript
describe('User Flow', () => {
  it('should handle complete user registration with real data', async () => {
    const userData = testHelper.createRealTestData('user');
    
    // Step 1: Create user with real data
    const createResponse = await app.post('/api/users').send(userData);
    expect(createResponse.status).toBe(201);
    
    // Step 2: Verify user with real database query
    const verifyResponse = await app.get(`/api/users/${createResponse.body.user.id}`);
    expect(verifyResponse.status).toBe(200);
    
    // Step 3: Login user with real authentication
    const loginResponse = await app.post('/api/login').send({
      email: userData.email,
      password: userData.password
    });
    expect(loginResponse.status).toBe(200);
  });
});
```

## Test Helpers

The `testHelper.js` provides utilities for:

- Database cleanup (with safety checks)
- Real test data generation (not mocked)
- App initialization
- Database safety validation
- Real data creation helpers

### Real Data Methods
```javascript
// Create real test data (not mocked)
testHelper.createRealTestData('user') // Creates real user data
testHelper.createRealTestData('wallet') // Creates real wallet data
testHelper.createRealTestData('transaction') // Creates real transaction data

// Check if currently connected to test database
testHelper.isTestDatabase() // returns boolean

// Get current database name
testHelper.getCurrentDatabaseName() // returns string
```

## Environment Variables

Tests use the following environment variables (automatically set):

- `NODE_ENV=test`
- `JWT_SECRET=test-jwt-secret-key-for-testing-only`
- `MONGODB_URI=mongodb://localhost:27017/zelf_testing`
- `PORT=3001` (different from production)
- `LOG_LEVEL=info` (kept for debugging real data operations)
- `EXTERNAL_API_URL` (real external service URLs)
- `BLOCKCHAIN_RPC_URL` (real blockchain RPC endpoints)

## Coverage Reports

Coverage reports are generated in the `coverage/` directory:

- `coverage/lcov-report/index.html` - HTML coverage report
- `coverage/lcov.info` - LCOV format for CI integration

## Best Practices

1. **Real Data Only**: Always use real data, never mock
2. **Database Safety**: Always use `testHelper.cleanDatabase()` for cleanup
3. **Isolation**: Tests should not depend on each other
4. **Real Services**: Use actual external service calls
5. **Descriptive Names**: Use clear, descriptive test names
6. **Single Responsibility**: Each test should test one specific behavior
7. **Safety Checks**: Always verify you're using the test database
8. **Real Validation**: Test actual data processing and validation

## Running Tests

Make sure you have Node.js 24 installed and MongoDB running locally before running tests:

```bash
# Set up NVM and Node 24
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm use 24

# Run tests
npm test
```

## Safety Reminders

- ✅ Tests use `zelf_testing` database only
- ✅ Production database is never accessed
- ✅ Automatic cleanup after tests
- ✅ Safety checks prevent accidents
- ✅ Separate environment variables
- ✅ Isolated test configuration
- ✅ **NO MOCKING** - All tests use real data
- ✅ Real external service calls
- ✅ Real database operations
- ✅ Real API responses