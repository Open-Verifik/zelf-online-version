#!/bin/bash

echo "🔧 Generating SSL Certificate for zelf.node with proper key usage..."
echo ""

# Create directory
mkdir -p ssl

# Generate private key
echo "🔑 Generating private key..."
openssl genrsa -out ssl/zelf.node.key 2048

# Generate certificate signing request
echo "📄 Creating certificate signing request..."
openssl req -new -key ssl/zelf.node.key -out ssl/zelf.node.csr -config ssl/zelf.node.conf

# Generate self-signed certificate with proper extensions
echo "🎫 Generating self-signed certificate with proper SSL extensions..."
openssl x509 -req -days 365 \
    -in ssl/zelf.node.csr \
    -signkey ssl/zelf.node.key \
    -out ssl/zelf.node.crt \
    -extensions v3_req \
    -extfile ssl/zelf.node.conf

# Set proper permissions
chmod 600 ssl/zelf.node.key
chmod 644 ssl/zelf.node.crt

# Clean up
rm ssl/zelf.node.csr

echo ""
echo "✅ SSL Certificate generated successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Start containers: docker compose -f docker-compose.nginx-backend.yml up -d"
echo "2. Add to /etc/hosts: echo '127.0.0.1 zelf.node' | sudo tee -a /etc/hosts"
echo "3. Install certificate to keychain (manually)"
echo "4. Visit https://zelf.node/docs"
