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

# Build arguments for environment variables (can be overridden at build time)
ARG VITE_FIREBASE_MODE=live
ARG VITE_USE_FIREBASE_EMULATOR=false
ARG VITE_ALLOWED_REDIRECTS
ARG VITE_DEFAULT_RETURN_URL
ARG VITE_NONCE_SECRET
ARG VITE_FIREBASE_API_KEY
ARG VITE_FIREBASE_AUTH_DOMAIN
ARG VITE_FIREBASE_PROJECT_ID
ARG VITE_FIREBASE_STORAGE_BUCKET
ARG VITE_FIREBASE_MESSAGING_SENDER_ID
ARG VITE_FIREBASE_APP_ID
ARG VITE_FIREBASE_MEASUREMENT_ID

# Set environment variables for the build
ENV VITE_FIREBASE_MODE=${VITE_FIREBASE_MODE}
ENV VITE_USE_FIREBASE_EMULATOR=${VITE_USE_FIREBASE_EMULATOR}
ENV VITE_ALLOWED_REDIRECTS=${VITE_ALLOWED_REDIRECTS}
ENV VITE_DEFAULT_RETURN_URL=${VITE_DEFAULT_RETURN_URL}
ENV VITE_NONCE_SECRET=${VITE_NONCE_SECRET}
ENV VITE_FIREBASE_API_KEY=${VITE_FIREBASE_API_KEY}
ENV VITE_FIREBASE_AUTH_DOMAIN=${VITE_FIREBASE_AUTH_DOMAIN}
ENV VITE_FIREBASE_PROJECT_ID=${VITE_FIREBASE_PROJECT_ID}
ENV VITE_FIREBASE_STORAGE_BUCKET=${VITE_FIREBASE_STORAGE_BUCKET}
ENV VITE_FIREBASE_MESSAGING_SENDER_ID=${VITE_FIREBASE_MESSAGING_SENDER_ID}
ENV VITE_FIREBASE_APP_ID=${VITE_FIREBASE_APP_ID}
ENV VITE_FIREBASE_MEASUREMENT_ID=${VITE_FIREBASE_MEASUREMENT_ID}

# Create .env.production file for Vite to read
RUN echo "VITE_FIREBASE_MODE=${VITE_FIREBASE_MODE}" > /app/apps/auth-app/.env.production && \
    echo "VITE_USE_FIREBASE_EMULATOR=${VITE_USE_FIREBASE_EMULATOR}" >> /app/apps/auth-app/.env.production && \
    echo "VITE_ALLOWED_REDIRECTS=${VITE_ALLOWED_REDIRECTS}" >> /app/apps/auth-app/.env.production && \
    echo "VITE_DEFAULT_RETURN_URL=${VITE_DEFAULT_RETURN_URL}" >> /app/apps/auth-app/.env.production && \
    echo "VITE_NONCE_SECRET=${VITE_NONCE_SECRET}" >> /app/apps/auth-app/.env.production && \
    echo "VITE_FIREBASE_API_KEY=${VITE_FIREBASE_API_KEY}" >> /app/apps/auth-app/.env.production && \
    echo "VITE_FIREBASE_AUTH_DOMAIN=${VITE_FIREBASE_AUTH_DOMAIN}" >> /app/apps/auth-app/.env.production && \
    echo "VITE_FIREBASE_PROJECT_ID=${VITE_FIREBASE_PROJECT_ID}" >> /app/apps/auth-app/.env.production && \
    echo "VITE_FIREBASE_STORAGE_BUCKET=${VITE_FIREBASE_STORAGE_BUCKET}" >> /app/apps/auth-app/.env.production && \
    echo "VITE_FIREBASE_MESSAGING_SENDER_ID=${VITE_FIREBASE_MESSAGING_SENDER_ID}" >> /app/apps/auth-app/.env.production && \
    echo "VITE_FIREBASE_APP_ID=${VITE_FIREBASE_APP_ID}" >> /app/apps/auth-app/.env.production && \
    echo "VITE_FIREBASE_MEASUREMENT_ID=${VITE_FIREBASE_MEASUREMENT_ID}" >> /app/apps/auth-app/.env.production

RUN pnpm --filter=auth-app build --mode production

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