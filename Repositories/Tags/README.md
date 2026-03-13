# Tags Repository

This repository contains the multi-domain Tags system that extends the ZNS (Zelf Name Service) functionality to support custom domains like `.avax`, `.btc`, `.tech`, etc., while maintaining full compatibility with existing `.zelf` domains.

## 🏗️ Repository Structure

```
Repositories/Tags/
├── config/
│   └── supported-domains.js      # Domain configuration definitions
├── controllers/
│   ├── tags.controller.js         # Main Tags API controller
│   └── my-tags.controller.js      # User-specific Tags controller
├── middlewares/
│   ├── tags.middleware.js         # Tags validation and auth middleware
│   └── my-tags.middleware.js      # User-specific middleware
├── models/
│   ├── domain.model.js            # Domain configuration model
│   ├── purchase-rewards.model.js  # Purchase rewards model
│   └── referral-rewards.model.js # Referral rewards model
├── modules/
│   ├── tags.v2.module.js          # Main Tags business logic
│   ├── tags-search.module.js       # Tags search functionality
│   ├── tags-parts.module.js        # Tags data processing
│   ├── tags-recovery.module.js     # Tags recovery logic
│   ├── tags-token.module.js        # Tags token/rewards
│   ├── domain-registry.module.js   # Domain management
│   ├── revenue-cat.module.js       # Payment processing
│   ├── sync-tags-records.module.js # Sync logic
│   └── undernames.module.js        # Subdomain logic
├── routes/
│   ├── tags.routes.js             # Main Tags API routes
│   └── my-tags.routes.js          # User-specific routes
└── README.md                      # This file
```

## 🎯 Supported Domains

### Official Domains
- **`.zelf`** - Official Zelf domain (free, existing functionality)

### Custom Domains
- **`.avax`** - Avalanche community domain ($1.00)
- **`.btc`** - Bitcoin community domain ($0.50)
- **`.tech`** - Technology community domain ($0.75)

### Enterprise Domains
- **`.microsoft`** - Microsoft enterprise domain ($5.00)

## 🔧 Domain Configuration

Each domain has the following configuration:

```javascript
{
  type: 'custom',           // 'official', 'custom', 'enterprise'
  price: 100,               // Price in cents
  holdSuffix: '.hold',      // Hold domain suffix
  status: 'active',         // 'active', 'inactive', 'suspended', 'pending'
  owner: 'community-name',  // Domain owner
  description: 'Description',
  features: ['biometric', 'wallet', 'payment'],
  validation: {
    minLength: 3,
    maxLength: 30,
    allowedChars: /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]$/,
    reserved: ['www', 'api', 'admin']
  },
  storage: {
    keyPrefix: 'avaxName',
    ipfsEnabled: true,
    arweaveEnabled: true
  }
}
```

## 🚀 API Endpoints

### Main Tags API (`/api/tags`)
- `GET /v2/search` - Search for tags
- `POST /v2/search` - Search for tags (POST)
- `POST /v2/lease` - Lease a tag
- `POST /v2/lease-recovery` - Recover and lease a new tag
- `GET /zelfpay` - Get ZelfPay information
- `POST /v2/lease-offline` - Lease a tag offline
- `POST /v2/lease-confirmation` - Confirm lease payment
- `POST /v2/preview` - Preview tag
- `POST /preview-zelfproof` - Preview zelf proof
- `POST /v2/decrypt` - Decrypt tag
- `POST /revenue-cat` - RevenueCat webhook
- `POST /purchase-rewards` - Release purchase rewards
- `POST /referral-rewards` - Release referral rewards
- `PUT /:tagName` - Update tag lease duration

### User Tags API (`/api/my-tags`)
- User-specific tag management endpoints

## 🔐 Domain States

### Active Domains
- `username.avax` - Active tag
- `username.btc` - Active tag

### Hold Domains
- `username.avax.hold` - Hold state (payment pending)
- `username.btc.hold` - Hold state (payment pending)

## 📊 Storage Structure

### IPFS Keys
- **Zelf**: `zelfName:username.zelf`
- **Avax**: `avaxName:username.avax`
- **BTC**: `btcName:username.btc`

### Arweave Integration
- Primary storage for all domains
- IPFS as backup storage
- Domain-specific metadata

## 🛡️ Security Features

- **Biometric Authentication**: Face verification for all domains
- **Domain Ownership**: Verified domain ownership
- **Access Control**: Domain-specific access rules
- **Payment Security**: Secure payment processing per domain

## 🔄 Migration Strategy

- **Zero Downtime**: Existing `.zelf` domains continue to work
- **Parallel System**: Tags system runs alongside ZNS
- **Backward Compatibility**: All existing functionality preserved
- **Gradual Migration**: Optional migration path for existing users

## 📈 Performance Considerations

- **Domain-Specific Caching**: Optimized caching per domain
- **Database Indexing**: Optimized queries for multi-domain
- **CDN Integration**: Fast global access
- **Load Balancing**: Distributed processing

## 🧪 Testing

- **Unit Tests**: Individual component testing
- **Integration Tests**: Multi-domain functionality
- **Performance Tests**: Load and stress testing
- **Security Tests**: Authentication and authorization

## 📚 Documentation

- **API Documentation**: Complete Swagger documentation
- **Domain Management**: Admin interface documentation
- **Developer Guide**: Integration and usage guide
- **Migration Guide**: Step-by-step migration instructions

## 🚀 Getting Started

1. **Domain Configuration**: Configure supported domains
2. **Database Setup**: Initialize domain models
3. **API Integration**: Add Tags routes to server
4. **Testing**: Run comprehensive test suite
5. **Deployment**: Deploy with zero downtime

## 🔧 Development

- **Cloned Architecture**: Based on ZNS structure
- **Modular Design**: Independent components
- **Extensible**: Easy to add new domains
- **Maintainable**: Clear separation of concerns

## 📞 Support

For questions or issues:
- **Documentation**: Check API documentation
- **Issues**: Report bugs and feature requests
- **Community**: Join the developer community
- **Enterprise**: Contact for enterprise support
