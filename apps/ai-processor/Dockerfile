FROM node:20-slim AS base
WORKDIR /app
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS build
COPY . /app
# Install dependencies for all workspaces
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
# Build the dependencies first ensuring they exist
RUN pnpm --filter @rates/firebase-client build
# Build the ai-processor app
RUN pnpm --filter ai-processor build

# Deploy the app to a pruned directory with prod dependencies
RUN pnpm --filter ai-processor --prod deploy /prod/ai-processor

FROM base AS app
# Copy built artifacts from the deploy directory
COPY --from=build /prod/ai-processor /app

# Copy the built dist folder (since deploy might exclude build artifacts if not configured)
# Actually, pnpm deploy copies source. We need to copy our built dist over it/into it.
# Usually 'deploy' copies package.json and installs deps. It doesn't run build (we did that).
# So we need to copy the compiled 'dist' from the build stage into the final app location.
COPY --from=build /app/apps/ai-processor/dist /app/dist

CMD ["node", "dist/index.js"]
