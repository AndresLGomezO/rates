FROM node:20-slim AS base
WORKDIR /app
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS build
COPY . /app
# Install dependencies for all workspaces
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
# Build the ai-processor app
RUN pnpm --filter ai-processor build

FROM base AS app
# Copy built artifacts and production dependencies
# Since it's a monorepo, it's safer to isolate the app. 
# But for simplicity in this setup, we can copy the built app and necessary node_modules.
# Using 'deploy' via pnpm is often better, but let's try a simpler approach first:
# Copy everything installed (including dev deps if pruning is hard in monorepo without deploy) 
# OR use pnpm deploy.

# Let's try to prune.
COPY --from=build /app/apps/ai-processor/dist /app/dist
COPY --from=build /app/apps/ai-processor/package.json /app/package.json
# We need to install prod deps. 
# In a monorepo, just 'pnpm install --prod' in the subfolder might work if we have local workspace protocols removed or handled.
# A robust way is 'pnpm deploy'
# RUN pnpm --filter ai-processor --prod deploy /prod/ai-processor
# But 'pnpm deploy' requires pnpm > 8.

# Alternative: Copy all node_modules from build? Too large.
# Let's assume we can run 'pnpm install --prod' in the container for the single app if we remove workspace deps or if they are published.
# But 'ai-processor' doesn't use workspace packages yet (except maybe internal ones later?). 
# It uses external libs.
# So we can just copy package.json and install prod deps.

COPY apps/ai-processor/package.json .
# We need lockfile? Ideally yes.
# COPY pnpm-lock.yaml . 
# But pnpm-lock is at root. 
# Let's copy root lockfile and filtering.

# Actually, the most reliable way for standard Cloud Run Jobs (which are often single binaries or straightforward) 
# is to bundle everything. But we are compiling to JS.
# Let's just do a clean install in the final image.
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prod

CMD ["node", "dist/index.js"]
