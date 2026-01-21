# Production container for a Vite-built SPA (apps/app)
#
# Why: Cloud Run (and GKE) deploy containers. This multi-stage build keeps images small
# and avoids shipping the whole monorepo/node_modules at runtime.

FROM node:20-alpine AS build

WORKDIR /repo

# Build-time config for Vite (VITE_* are embedded at build time)
ARG VITE_AUTH_APP_URL
ARG VITE_NONCE_SECRET
ENV VITE_AUTH_APP_URL=${VITE_AUTH_APP_URL}
ENV VITE_NONCE_SECRET=${VITE_NONCE_SECRET}

# Enable pnpm via corepack (recommended vs npm i -g pnpm).
RUN corepack enable

# Copy only files needed for dependency resolution first (better layer caching).
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY tsconfig.base.json tsconfig.base.json
COPY apps/app/package.json apps/app/package.json
COPY packages/firebase-client/package.json packages/firebase-client/package.json
COPY packages/ui-theme/package.json packages/ui-theme/package.json

RUN pnpm install --frozen-lockfile

# Now copy source
COPY apps/app apps/app
COPY packages/firebase-client packages/firebase-client
COPY packages/ui-theme packages/ui-theme

RUN pnpm --filter app build

FROM nginx:1.27-alpine AS runtime

# Cloud Run listens on $PORT. Nginx listens on 8080 in this image.
ENV PORT=8080

# Minimal nginx config for SPA routing.
COPY apps/app/nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=build /repo/apps/app/dist /usr/share/nginx/html

EXPOSE 8080

