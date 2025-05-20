# Build stage
FROM node:20-alpine AS builder

# Install necessary tools and set environment variables
RUN apk add --no-cache python3 make g++ curl
ENV NODE_OPTIONS="--max-old-space-size=2048"
ENV PNPM_HOME="/root/.local/share/pnpm"
ENV PATH="${PNPM_HOME}:${PATH}"

# Install pnpm with specific version to avoid upgrade messages
RUN corepack enable && corepack prepare pnpm@10.6.3 --activate

# Set working directory
WORKDIR /usr/src/app

# Copy package files and workspace config
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY nest-cli.json tsconfig.json tsconfig.build.json ./

# Clean install with development dependencies to ensure build tools are available
RUN rm -rf node_modules && pnpm store prune && pnpm install --verbose

# Copy only the necessary files for building common
COPY libs/common ./libs/common
# Remove the load testing scripts to avoid them being bundled with the application
RUN rm -rf libs/common/src/load-testing/cli/*.ts libs/common/src/load-testing/cli/*.js
# Install the NestJS CLI locally at the workspace root
RUN pnpm add -w -D @nestjs/cli ts-loader

# Make sure we're using the latest code from libs/common
RUN echo "Building common library with latest changes..."
RUN npx nest build common

# Copy menu service source files
COPY apps/menu ./apps/menu

# Build menu service with increased memory allocation
RUN NODE_OPTIONS="--max-old-space-size=2048" npx nest build menu

# After building, print the service-auth.client.ts contents for debug verification
RUN echo "Checking service-auth.client built file:" && \
    find dist -name "service-auth.client.js" -o -name "index.js" | xargs ls -la && \
    echo "Searching for API endpoint string..." && \
    find dist -type f -name "*.js" | xargs grep -l "auth/service/token" || echo "No matches found"

# Production stage
FROM node:20-alpine

# Install necessary tools
RUN apk add --no-cache curl dumb-init

# Configure pnpm with better network settings
RUN mkdir -p ~/.pnpm && echo 'registry=https://registry.npmjs.org/' > ~/.npmrc && \
    echo 'network-timeout=60000' >> ~/.npmrc && \
    echo 'fetch-retries=5' >> ~/.npmrc && \
    echo 'fetch-timeout=60000' >> ~/.npmrc

# Set working directory
WORKDIR /usr/src/app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY nest-cli.json tsconfig.json tsconfig.build.json ./

# Copy built files
COPY --from=builder /usr/src/app/dist ./dist

# Verify the files contain our API endpoint change
RUN echo "Verifying endpoint in production build:" && \
    find dist -type f -name "*.js" | xargs grep -l "auth/service/token" || echo "Warning: No matches found for endpoint"

# Install only production dependencies and explicitly add swagger
RUN set -e; \
    # Ensure pnpm is available no matter what
    if which pnpm > /dev/null; then \
        echo "pnpm is already installed"; \
    elif corepack enable && corepack prepare pnpm@10.6.3 --activate; then \
        echo "Installed pnpm using corepack"; \
    else \
        echo "Corepack failed, using npm to install pnpm instead"; \
        npm install -g pnpm@10.6.3 --force; \
    fi && \
    pnpm install -w --prod && \
    pnpm add -w @nestjs/swagger swagger-ui-express

# Create directory for failed messages
RUN mkdir -p storage/failed-messages

# Set environment variables
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=1024"

# Use dumb-init as entrypoint
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/apps/menu/main"]

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:3002/health || exit 1 