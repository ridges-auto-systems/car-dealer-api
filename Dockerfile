# Dockerfile - Debian-based (Most Compatible with Prisma)
FROM node:18-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    openssl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Set environment
ENV NODE_ENV=production

# Install dependencies without scripts
RUN npm ci --only=production --ignore-scripts

# Copy application code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Create logs directory and user
RUN mkdir -p logs && \
    groupadd -r nodejs && \
    useradd -r -g nodejs nodejs && \
    chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "const http = require('http'); \
    const req = http.request({hostname: 'localhost', port: 5000, path: '/health'}, (res) => { \
      process.exit(res.statusCode === 200 ? 0 : 1); \
    }); \
    req.on('error', () => process.exit(1)); \
    req.end();"

# Start the application
CMD ["node", "src/app.js"]