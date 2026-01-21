# Production container for the auth SPA (apps/auth-app)
#
# Note: this image serves the built SPA. If you rely on server-side endpoints,
# implement them as a proper backend (Cloud Run service) and route via a load balancer.

FROM node:20-alpine AS build

WORKDIR /repo

# Build-time config for Vite (VITE_* are embedded at build time)
ARG VITE_ALLOWED_REDIRECTS
ARG VITE_DEFAULT_RETURN_URL
ARG VITE_NONCE_SECRET
ENV VITE_ALLOWED_REDIRECTS=${VITE_ALLOWED_REDIRECTS}
ENV VITE_DEFAULT_RETURN_URL=${VITE_DEFAULT_RETURN_URL}
ENV VITE_NONCE_SECRET=${VITE_NONCE_SECRET}

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY tsconfig.base.json tsconfig.base.json
COPY apps/auth-app/package.json apps/auth-app/package.json
COPY packages/ui-theme/package.json packages/ui-theme/package.json

RUN pnpm install --frozen-lockfile

COPY apps/auth-app apps/auth-app
COPY packages/ui-theme packages/ui-theme

RUN pnpm --filter auth-app build

FROM nginx:1.27-alpine AS runtime

ENV PORT=8080

COPY apps/auth-app/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/apps/auth-app/dist /usr/share/nginx/html

EXPOSE 8080

