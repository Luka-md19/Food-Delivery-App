# Build stage
FROM node:20-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Set working directory
WORKDIR /usr/src/app

# Copy package files and workspace config
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY nest-cli.json tsconfig.json tsconfig.build.json ./

# Copy the entire project
COPY . .

# Install all dependencies including devDependencies
RUN pnpm install --frozen-lockfile

# Build common library first
RUN pnpm exec nest build common

# Build menu service
RUN pnpm exec nest build menu

# Production stage
FROM node:20-alpine

# Install necessary tools
RUN apk add --no-cache curl dumb-init

# Set working directory
WORKDIR /usr/src/app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY nest-cli.json tsconfig.json tsconfig.build.json ./

# Copy built files
COPY --from=builder /usr/src/app/dist ./dist

# Install only production dependencies
RUN corepack enable && corepack prepare pnpm@latest --activate && \
    pnpm install --prod --frozen-lockfile

# Create directory for failed messages
RUN mkdir -p storage/failed-messages

# Set environment variables
ENV NODE_ENV=production

# Use dumb-init as entrypoint
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/apps/menu/main"]

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:3002/health || exit 1 