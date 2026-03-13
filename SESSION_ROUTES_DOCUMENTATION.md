# 🔐 Session Routes Documentation

## 📋 Overview

The Session routes provide comprehensive session management functionality for the Zelf Wallet API. These endpoints handle wallet creation, decryption, and import operations through secure session-based workflows.

## 🎯 Session Management Features

### **Core Functionality**
- **Session Creation**: Initialize secure sessions for wallet operations
- **Public Key Extraction**: Extract public keys for wallet operations
- **Content Decryption**: Decrypt encrypted wallet content using sessions
- **Usage Tracking**: Monitor session usage with various counters
- **Security Validation**: IP-based and environment-based security checks

### **Session Types**
- `createWallet`: For new wallet creation operations
- `decryptWallet`: For wallet decryption operations
- `importWallet`: For wallet import operations
- `general`: For general session operations

### **Session Status**
- `active`: Session is currently active and usable
- `used`: Session has been completed and is no longer active

## 🔗 Available Endpoints

### **1. Create Session**
```
POST /api/sessions
```

**Purpose**: Create a new session for wallet operations

**Request Body**:
```json
{
  "identifier": "session_123456789",
  "isWebExtension": false,
  "type": "createWallet"
}
```

**Response**:
```json
{
  "data": {
    "_id": "session_id",
    "identifier": "session_123456789",
    "clientIP": "192.168.1.1",
    "isWebExtension": false,
    "status": "active",
    "type": "createWallet",
    "activatedAt": "2024-01-01T00:00:00.000Z",
    "globalCount": 0,
    "searchCount": 0,
    "leaseCount": 0,
    "decryptCount": 0,
    "previewCount": 0,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Security Features**:
- IP address tracking
- Origin validation in production
- User agent logging
- X-Forwarded-For header validation

### **2. Get Public Key**
```
GET /api/sessions/yek-cilbup
```

**Purpose**: Extract public key for wallet operations

**Query Parameters**:
- `identifier` (required): Session identifier
- `name` (optional): User name
- `email` (optional): User email

**Example Request**:
```
GET /api/sessions/yek-cilbup?identifier=session_123456789&name=John%20Doe&email=john@example.com
```

**Response**:
```json
{
  "data": {
    "publicKey": "04a1b2c3d4e5f6...",
    "sessionId": "session_123456789"
  }
}
```

**Validation**:
- Session identifier is required
- Client IP tracking for security

### **3. Decrypt Content**
```
POST /api/sessions/decrypt-content
```

**Purpose**: Decrypt encrypted content using session-based encryption

**Request Body**:
```json
{
  "message": "encrypted_message_data_here",
  "sessionId": "session_123456789"
}
```

**Response**:
```json
{
  "data": {
    "decryptedContent": "decrypted_wallet_data",
    "sessionId": "session_123456789"
  }
}
```

**Validation**:
- Encrypted message is required
- Session validation for security

## 📊 Session Data Model

### **Session Schema**
```javascript
{
  identifier: String,        // Unique session identifier
  clientIP: String,          // Client IP address
  isWebExtension: Boolean,   // Web extension flag
  status: String,            // "active" or "used"
  type: String,              // Session type enum
  activatedAt: Date,         // Activation timestamp
  globalCount: Number,       // Global usage counter
  searchCount: Number,       // Search operations counter
  leaseCount: Number,        // Lease operations counter
  decryptCount: Number,      // Decrypt operations counter
  previewCount: Number,      // Preview operations counter
  completedAt: Date,         // Completion timestamp
  createdAt: Date,           // Creation timestamp
  updatedAt: Date            // Last update timestamp
}
```

### **Session Types**
- `createWallet`: New wallet creation
- `decryptWallet`: Wallet decryption
- `importWallet`: Wallet import
- `general`: General operations

## 🔒 Security Features

### **IP-Based Security**
- Client IP tracking for all operations
- X-Forwarded-For header validation
- Production environment origin validation

### **Session Validation**
- Unique session identifiers
- Session status tracking
- Usage counters for monitoring
- Automatic session expiration (600 seconds)

### **Request Validation**
- Required field validation
- Data type validation
- Enum value validation
- Custom validation middleware

## 🚀 Usage Examples

### **Complete Wallet Creation Flow**

1. **Create Session**:
```bash
curl -X POST http://localhost:3002/api/sessions \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "wallet_creation_123",
    "type": "createWallet",
    "isWebExtension": false
  }'
```

2. **Get Public Key**:
```bash
curl -X GET "http://localhost:3002/api/sessions/yek-cilbup?identifier=wallet_creation_123&name=John%20Doe"
```

3. **Use Session for Operations**:
```bash
curl -X POST http://localhost:3002/api/sessions/decrypt-content \
  -H "Content-Type: application/json" \
  -d '{
    "message": "encrypted_wallet_data",
    "sessionId": "wallet_creation_123"
  }'
```

### **Wallet Decryption Flow**

1. **Create Decryption Session**:
```bash
curl -X POST http://localhost:3002/api/sessions \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "decrypt_wallet_456",
    "type": "decryptWallet"
  }'
```

2. **Decrypt Content**:
```bash
curl -X POST http://localhost:3002/api/sessions/decrypt-content \
  -H "Content-Type: application/json" \
  -d '{
    "message": "encrypted_wallet_content",
    "sessionId": "decrypt_wallet_456"
  }'
```

## 📈 Monitoring & Analytics

### **Usage Counters**
- `globalCount`: Total operations performed
- `searchCount`: Search operations
- `leaseCount`: Lease operations
- `decryptCount`: Decryption operations
- `previewCount`: Preview operations

### **Session Tracking**
- Session creation timestamps
- Activation timestamps
- Completion timestamps
- Status changes

### **Security Monitoring**
- Client IP tracking
- User agent logging
- Origin validation
- Request frequency monitoring

## ⚠️ Error Handling

### **Validation Errors (409)**
```json
{
  "validationError": "identifier is required"
}
```

### **Security Errors (403)**
```json
{
  "error": "rejected"
}
```

### **Server Errors (500)**
```json
{
  "error": "Internal server error message"
}
```

## 🔧 Integration Guidelines

### **Best Practices**
1. **Session Management**: Always create sessions for wallet operations
2. **Identifier Uniqueness**: Use unique identifiers for each session
3. **Error Handling**: Implement proper error handling for all responses
4. **Security**: Validate client information in production
5. **Monitoring**: Track session usage for analytics

### **Security Considerations**
- Sessions expire after 600 seconds
- IP validation in production environment
- Origin header validation
- Usage counter limits
- Session status tracking

### **Performance Optimization**
- Reuse sessions when possible
- Monitor usage counters
- Implement proper error handling
- Use appropriate session types

## 🎯 Business Value

### **Security Benefits**
- **Session Isolation**: Each operation uses isolated sessions
- **IP Tracking**: Monitor and validate client origins
- **Usage Limits**: Prevent abuse through counters
- **Expiration**: Automatic session cleanup

### **Operational Benefits**
- **Audit Trail**: Complete session tracking
- **Analytics**: Usage pattern analysis
- **Debugging**: Detailed error information
- **Monitoring**: Real-time session status

### **Developer Experience**
- **Clear APIs**: Well-documented endpoints
- **Validation**: Automatic request validation
- **Error Handling**: Comprehensive error responses
- **Examples**: Pre-filled request examples

## 🚀 Ready for Production

The Session routes are now fully documented and ready for:
- **Customer Integration**: Clear API documentation
- **Testing**: Interactive Swagger UI
- **Monitoring**: Comprehensive logging
- **Security**: Production-ready validation
- **Scalability**: Session-based architecture

**Access the interactive documentation at**: http://localhost:${PORT}/swagger (where PORT is from your environment or config)

---

*This documentation provides a complete guide for integrating with the Session management system of the Zelf Wallet API.* 