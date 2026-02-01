FROM node:20-slim AS base
WORKDIR /app
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS build
COPY . /app
# Install dependencies for all workspaces
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
# Build the dependencies first
RUN pnpm --filter @rates/vertex-ai-client build
# Build the ai-service app
RUN pnpm --filter ai-service build

# Deploy the app to a pruned directory with prod dependencies
RUN pnpm --filter ai-service --prod deploy /prod/ai-service

FROM base AS runner
WORKDIR /app
# Copy built artifacts from the deploy directory
COPY --from=build /prod/ai-service /app
# Copy the built dist folder
COPY --from=build /app/apps/ai-service/dist /app/dist

ENV NODE_ENV=production
# Create non-root user
RUN groupadd -r appgroup && useradd -r -g appgroup appuser
USER appuser

EXPOSE 8080

CMD ["node", "dist/index.js"]
