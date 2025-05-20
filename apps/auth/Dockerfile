# 1) === Development Stage ===
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

# Copy build-worker-threads.js script
COPY build-worker-threads.js ./

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

# Copy auth service source files
COPY apps/auth ./apps/auth

# Build auth service with increased memory allocation
RUN NODE_OPTIONS="--max-old-space-size=2048" npx nest build auth

# Worker threads will be generated at runtime in start.sh to avoid bcrypt compilation issues

# Production stage
FROM node:20-alpine

# Install necessary tools and build dependencies needed for native modules
RUN apk add --no-cache curl dumb-init postgresql-client python3 make g++ jq netcat-openbsd

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

# Create workers directory since it doesn't exist in source
RUN mkdir -p ./dist/apps/auth/workers/

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

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Start the application
CMD ["node", "dist/apps/auth/main"]