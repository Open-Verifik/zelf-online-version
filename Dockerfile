# Backend Dockerfile for Zelf (zelf.node)
FROM node:24-alpine

# Install required packages for native dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git \
    openssl

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json ./

# Install dependencies
RUN npm install --production && npm cache clean --force

# Copy application code
COPY . .

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "const http=require('http');http.get('http://localhost:3000/api/health',res=>{process.exit(res.statusCode===200?0:1)}).on('error',()=>process.exit(1))"

# Start the application
CMD ["npm", "start"]