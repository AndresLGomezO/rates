# Cloud Run backend for token validation (apps/auth-api)
FROM node:20-alpine AS build

WORKDIR /repo
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY tsconfig.base.json tsconfig.base.json
COPY apps/auth-api/package.json apps/auth-api/package.json

RUN pnpm install --frozen-lockfile

COPY apps/auth-api apps/auth-api

RUN pnpm --filter auth-api build

FROM node:20-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080

COPY --from=build /repo/apps/auth-api/dist ./dist
COPY --from=build /repo/apps/auth-api/package.json ./package.json

RUN npm install --omit=dev

EXPOSE 8080
CMD ["node", "dist/index.js"]

