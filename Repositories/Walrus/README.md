# Walrus Image Storage & Retrieval

This module provides functionality to store and retrieve images using the Walrus decentralized storage network.

## 🚀 Quick Start

### 1. Upload an Image
```javascript
const { zelfNameRegistration } = require('./modules/walrus.module');

const result = await zelfNameRegistration(base64QRCode, zelfNameObject);
if (result.success) {
    console.log('Blob ID:', result.blobId);  // Store this in your database
    console.log('Public URL:', result.publicUrl);
}
```

### 2. Retrieve Image for Frontend
```javascript
const { walrusIDToBase64, prepareImageForFrontend } = require('./modules/walrus.module');

// Option 1: Get base64 data URL
const dataUrl = await walrusIDToBase64(blobId);
// Use directly: <img src="{dataUrl}" />

// Option 2: Get comprehensive image data
const imageData = await prepareImageForFrontend(blobId);
if (imageData.success) {
    console.log('Data URL:', imageData.dataUrl);
    console.log('Size:', imageData.sizeInKB + ' KB');
    console.log('Format:', imageData.format);
}
```

## 📁 Available Functions

### Core Functions

#### `zelfNameRegistration(zelfProofQRCode, zelfNameObject)`
Uploads a QR code image to Walrus and returns blob information.

**Parameters:**
- `zelfProofQRCode` (string): Base64 encoded QR code image
- `zelfNameObject` (object): Object containing zelf name details

**Returns:**
```javascript
{
    success: true,
    blobId: "abc123def456",
    publicUrl: "https://walrus-mainnet.mystenlabs.com/abc123def456",
    explorerUrl: "https://walruscan.com/mainnet/blob/abc123def456",
    metadata: { ... },
    storage: { epochs: 5, network: "mainnet" }
}
```

#### `walrusIDToBase64(blobId)`
Converts a Walrus blob ID to base64 data URL for frontend use.

**Parameters:**
- `blobId` (string): The Walrus blob ID

**Returns:**
```javascript
"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
```

#### `prepareImageForFrontend(blobId)`
Prepares comprehensive image data for frontend rendering.

**Parameters:**
- `blobId` (string): The Walrus blob ID

**Returns:**
```javascript
{
    success: true,
    blobId: "abc123def456",
    dataUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
    publicUrl: "https://walrus-mainnet.mystenlabs.com/abc123def456",
    explorerUrl: "https://walruscan.com/mainnet/blob/abc123def456",
    sizeInBytes: 12345,
    sizeInKB: 12,
    contentType: "image/png",
    format: "png",
    network: "mainnet",
    retrievedAt: "2024-01-01T12:00:00.000Z"
}
```

### Utility Functions

#### `getPublicBlobUrl(blobId)`
Returns the public URL for direct blob access.

#### `getExplorerBlobUrl(blobId)`
Returns the Walrus explorer URL for blob details.

#### `isWalrusAvailable()`
Checks if Walrus client is available and initialized.

## 🌐 Frontend Integration

### HTML Example
```html
<img id="qr-image" alt="Zelf Name QR Code" />

<script>
fetch('/api/walrus/image/your-blob-id/base64')
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            document.getElementById('qr-image').src = data.dataUrl;
        }
    });
</script>
```

### React Example
```jsx
import React, { useState, useEffect } from 'react';

const ZelfNameImage = ({ blobId }) => {
    const [imageData, setImageData] = useState(null);
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
        const fetchImage = async () => {
            try {
                const response = await fetch(`/api/walrus/image/${blobId}/metadata`);
                const data = await response.json();
                setImageData(data);
            } catch (error) {
                console.error('Failed to fetch image:', error);
            } finally {
                setLoading(false);
            }
        };
        
        fetchImage();
    }, [blobId]);
    
    if (loading) return <div>Loading...</div>;
    
    return (
        <div>
            <img src={imageData.dataUrl} alt="Zelf Name QR Code" />
            <p>Size: {imageData.sizeInKB} KB</p>
        </div>
    );
};
```

### Angular Example
```typescript
// Component
export class ZelfNameImageComponent {
    imageData: any = null;
    loading = true;
    
    constructor(private http: HttpClient) {}
    
    @Input() blobId!: string;
    
    ngOnInit() {
        this.fetchImage();
    }
    
    fetchImage() {
        this.http.get(`/api/walrus/image/${this.blobId}/metadata`)
            .subscribe(data => {
                this.imageData = data;
                this.loading = false;
            });
    }
}
```

## 🔧 API Endpoints

### Example Express Routes
```javascript
const express = require('express');
const { walrusIDToBase64, prepareImageForFrontend } = require('./modules/walrus.module');

const router = express.Router();

// Get base64 image
router.get('/walrus/image/:blobId/base64', async (req, res) => {
    try {
        const dataUrl = await walrusIDToBase64(req.params.blobId);
        res.json({ success: true, dataUrl });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get comprehensive image data
router.get('/walrus/image/:blobId/metadata', async (req, res) => {
    try {
        const imageData = await prepareImageForFrontend(req.params.blobId);
        res.json(imageData);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
```

## 🧪 Testing

### Test Single Image
```bash
# Test your blob ID retrieval
node test-image-retrieval.js your-blob-id-here
```

This will:
1. Generate public URL
2. Convert to base64
3. Prepare frontend data
4. Create HTML preview file

### Test Walrus Endpoints
```bash
# Test endpoint availability and connectivity
node test-walrus-endpoints.js

# Test with your specific blob ID
node test-walrus-endpoints.js hE4xX3k0_rrII4117jIHRl2lhQAaR_iQmedOSZXMJ7k
```

This will:
1. Test multiple Walrus endpoint URLs
2. Check DNS resolution and connectivity
3. Test blob retrieval with fallback mechanisms
4. Provide troubleshooting recommendations

### Test in Browser
After running the test, open the generated `preview-{blobId}.html` file in your browser to see the image.

## 🔧 Troubleshooting

### Common Issues

#### DNS Resolution Errors
If you get `ENOTFOUND` errors:
```bash
# Test endpoints first
node test-walrus-endpoints.js

# This will show which endpoints are available
```

**Possible causes:**
- Walrus mainnet public endpoints may not be fully available yet
- Network connectivity issues
- DNS server problems

#### Blob Not Found (404 errors)
```bash
# Verify your blob ID is correct
node test-walrus-endpoints.js your-blob-id-here

# Check if the blob exists on Walrus explorer
# https://walruscan.com/mainnet/blob/your-blob-id-here
```

#### Timeout Errors
```bash
# The system automatically tries multiple endpoints
# Check which ones are responding
node test-walrus-endpoints.js
```

### Endpoint Configuration

The system uses multiple fallback URLs:
```javascript
const walrusUrls = {
    primary: "https://aggregator.walrus.space",
    alternatives: [
        "https://aggregator.mainnet.walrus.space",
        "https://publisher.walrus.space",
        "https://publisher.mainnet.walrus.space"
    ],
    fallback: "https://walrus.space"
};
```

### Advanced Configuration

If you need to use custom endpoints:
```javascript
const { walrusUrls } = require('./modules/walrus.module');

// View current configuration
console.log('Current URLs:', walrusUrls);

// Or modify for testing (not recommended for production)
```

## 📊 Performance Considerations

### Speed Comparison
1. **Direct URL** (fastest): `<img src="{publicUrl}" />`
2. **Base64 conversion**: Good for data URLs and offline use
3. **Frontend preparation**: Best for comprehensive image info

### Best Practices
- Use **direct URLs** for simple image display
- Use **base64 conversion** when you need data URLs
- Use **frontend preparation** for rich image metadata
- Cache results to avoid repeated API calls
- Handle errors gracefully with fallback options

## 🔗 URLs

### Public Access
- **Direct blob**: `https://walrus-mainnet.mystenlabs.com/{blobId}`
- **Explorer**: `https://walruscan.com/mainnet/blob/{blobId}`

### Official Explorers

#### Walrus Blob Explorers
- **Walruscan**: `https://walruscan.com/mainnet/blob/{blobId}`
- **Purpose**: View blob data, storage info, download images
- **Use for**: Actual file content and storage details

#### Sui Object Explorers  
- **Suiscan**: `https://suiscan.xyz/mainnet/object/{objectId}`
- **SuiExplorer**: `https://suiexplorer.com/object/{objectId}`
- **Purpose**: View coordination objects, metadata, ownership
- **Use for**: Blockchain coordination data for Walrus operations

### Understanding the Relationship

When you upload to Walrus:
1. **Blob ID** = Your actual file stored on Walrus storage nodes
2. **Sui Object ID** = Coordination object created on Sui blockchain

Both are official and serve different purposes:

```javascript
// Example: Handle any ID type
const { getExplorerUrls } = require('./modules/walrus.module');

// Test with your IDs
const blobId = "your_blob_id_here";
const suiObjectId = "0x04f8f8cf84d65f0e10133bd668b0a56bb6269b74bde715acb68a8652748680c2";

// Get appropriate explorer URLs
const blobInfo = getExplorerUrls(blobId);
const objectInfo = getExplorerUrls(suiObjectId);

console.log('Blob explorer:', blobInfo.official.walrus.explorer);
console.log('Sui object explorer:', objectInfo.official.sui.suiscan);
```

### Network Configuration
- Currently using **mainnet**
- Blobs stored for **5 epochs** (configurable)
- Maximum file size: **100KB**

## ⚠️ Important Notes

1. **No Native Metadata**: Unlike Arweave, Walrus doesn't store metadata with blobs
2. **Temporary Storage**: Blobs are stored for 2 years maximum
3. **Public Access**: All blobs are publicly accessible
4. **Content Type Detection**: Done via HTTP headers during retrieval
5. **Error Handling**: Always wrap calls in try-catch blocks
6. **Mainnet Status**: Walrus mainnet launched March 2025, but public aggregator endpoints may still be rolling out

### Current Mainnet Status

**Walrus Mainnet** is live as of March 2025, but:
- Public aggregator/publisher endpoints may not be fully available yet
- Some DNS resolution issues may occur while infrastructure is being deployed
- The system includes fallback mechanisms to handle this transition period
- Check the [official Walrus documentation](https://docs.walrus.site) for the latest endpoint information

**If you encounter DNS errors:**
1. This is likely temporary while public endpoints are being deployed
2. The system will automatically try multiple endpoint URLs
3. Consider running your own Walrus aggregator/publisher for production use
4. Use the endpoint testing script to check current availability

## 🆚 Comparison with Arweave

| Feature | Walrus | Arweave |
|---------|---------|---------|
| **Metadata** | ❌ No native support | ✅ Rich tags system |
| **Content Type** | 🟡 HTTP headers only | ✅ Native support |
| **Storage Duration** | ⚠️ 2 years max | ✅ Permanent |
| **Cost** | 💰 Lower | 💰 Higher |
| **Search** | ❌ No native search | ✅ GraphQL queries |
| **Mainnet Status** | 🟡 Recently launched | ✅ Mature |

## 📝 Example Workflow

```javascript
// 1. Upload image
const uploadResult = await zelfNameRegistration(qrCodeBase64, zelfNameObject);

// 2. Store blob ID in database
await database.saveZelfName({
    name: zelfNameObject.zelfName,
    blobId: uploadResult.blobId,
    publicUrl: uploadResult.publicUrl
});

// 3. Later, retrieve for frontend
const imageData = await prepareImageForFrontend(uploadResult.blobId);

// 4. Send to frontend
res.json({
    zelfName: zelfNameObject.zelfName,
    imageData: imageData.dataUrl,
    publicUrl: imageData.publicUrl
});
```

This setup allows you to efficiently store images on Walrus and retrieve them for frontend display while handling all the necessary conversions and error cases. 