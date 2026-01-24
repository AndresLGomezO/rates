# ============================================================================
# DOCKERFILE - AUTH APP API
# ============================================================================
# Source of Truth: docs/COST_GUARDRAILS.md (Resource Limits)
#
# Multi-stage build for optimized production images
# Target: Cloud Run deployment
# ============================================================================

# ----------------------------------------------------------------------------
# Stage 1: Dependencies
# ----------------------------------------------------------------------------
FROM node:20-alpine AS deps

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@9

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/auth-app/package.json ./apps/auth-app/
COPY packages/ui-theme/package.json ./packages/ui-theme/

# Install dependencies
RUN pnpm install --frozen-lockfile

# ----------------------------------------------------------------------------
# Stage 2: Builder
# ----------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@9

# Copy workspace configuration first
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./

# Copy package configurations
COPY apps/auth-app/package.json ./apps/auth-app/
COPY packages/ui-theme/package.json ./packages/ui-theme/

# Install dependencies first (this creates workspace symlinks)
RUN pnpm install --frozen-lockfile

# Copy source code (after dependencies are installed to preserve symlinks)
COPY apps/auth-app ./apps/auth-app
COPY packages/ui-theme ./packages/ui-theme

# Build the application
ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

RUN pnpm --filter=auth-app build:api

# ----------------------------------------------------------------------------
# Stage 3: Production
# ----------------------------------------------------------------------------
FROM node:20-alpine AS production

WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy workspace configuration
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nodejs:nodejs /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=builder --chown=nodejs:nodejs /app/pnpm-workspace.yaml ./pnpm-workspace.yaml

# Copy built application (static files)
COPY --from=builder --chown=nodejs:nodejs /app/apps/auth-app/dist ./apps/auth-app/dist

# Copy server files and source code needed for API
COPY --from=builder --chown=nodejs:nodejs /app/apps/auth-app/server.js ./apps/auth-app/server.js
COPY --from=builder --chown=nodejs:nodejs /app/apps/auth-app/src ./apps/auth-app/src
COPY --from=builder --chown=nodejs:nodejs /app/apps/auth-app/package.json ./apps/auth-app/
COPY --from=builder --chown=nodejs:nodejs /app/apps/auth-app/tsconfig.json ./apps/auth-app/

# Copy ui-theme package (needed as workspace dependency)
COPY --from=builder --chown=nodejs:nodejs /app/packages/ui-theme ./packages/ui-theme

# Install production dependencies and tsx for running TypeScript
# Skip lifecycle scripts (like husky prepare) that require dev dependencies
RUN npm install -g pnpm@9 tsx && \
    pnpm install --prod --frozen-lockfile --ignore-scripts

# Switch to non-root user
USER nodejs

# Expose port (Cloud Run uses PORT env var)
EXPOSE 8080

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

# Start the application (using tsx to run TypeScript)
ENV PORT=8080
WORKDIR /app/apps/auth-app
CMD ["tsx", "server.js"]