# Production container for the auth SPA (apps/auth-app)
#
# Note: this image serves the built SPA. If you rely on server-side endpoints,
# implement them as a proper backend (Cloud Run service) and route via a load balancer.

FROM node:20-alpine AS build

WORKDIR /repo

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

