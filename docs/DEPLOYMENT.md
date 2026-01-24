## 1. Deployment Platform

- **Hosting platform**: Not explicitly configured in this repo. The apps are standard Vite/React frontends (`apps/app`, `apps/auth-app`) suitable for deployment to any static hosting platform (e.g. Firebase Hosting, Vercel, Netlify, Cloudflare Pages, S3+CloudFront). Firebase is configured for Firestore/Storage and local emulators, but there is **no `hosting` block** in `firebase/firebase.json`, so Firebase Hosting is not yet wired up.
- **Primary deployment-related tooling**:
  - **Firebase**: Firestore, Storage and emulators configured in `firebase/firebase.json`.
  - **Docker**: Local Firebase emulators containerized via `docker/Dockerfile.firebase-emulators` and `docker/docker-compose.yml`.
  - **PnPM monorepo**: Root `package.json` drives builds and emulator workflows.
- **Deployment configuration files** (non-exhaustive):
  - Root: `package.json`, `pnpm-workspace.yaml`, `env.example`
  - Main app: `apps/app/package.json`, `apps/app/vite.config.ts`, `apps/app/env.example`
  - Auth app: `apps/auth-app/package.json`, `apps/auth-app/vite.config.ts`, `apps/auth-app/env.example`
  - Firebase: `firebase/firebase.json`, `firebase/firestore.rules`, `firebase/firestore.indexes.json`, `firebase/storage.rules`
  - Docker/emulators: `docker/Dockerfile.firebase-emulators`, `docker/docker-compose.yml`, `docker/env.docker.example`, `docker/entrypoint.sh`
- **Platform-specific optimizations**:
  - The project is optimized for **local Firebase emulators** (auth, Firestore, Storage, Functions, UI) with:

    ```json
    // firebase/firebase.json
    {
      "emulators": {
        "auth": { "host": "0.0.0.0", "port": 9099 },
        "firestore": { "host": "0.0.0.0", "port": 8080 },
        "storage": { "host": "0.0.0.0", "port": 9199 },
        "ui": { "enabled": true, "host": "0.0.0.0", "port": 4000 },
        "singleProjectMode": true
      }
    }
    ```

  - Docker image for emulators pre-installs **Java 21** (required by newer Firebase tools) and `firebase-tools`:

    ```dockerfile
    # docker/Dockerfile.firebase-emulators
    FROM node:20-slim
    RUN apt-get update && \
        apt-get install -y wget curl gnupg && \
        mkdir -p /etc/apt/keyrings && \
        wget -O - https://packages.adoptium.net/artifactory/api/gpg/key/public | tee /etc/apt/keyrings/adoptium.asc && \
        ...
    RUN npm install -g firebase-tools
    WORKDIR /app
    COPY firebase/firebase.json ./
    COPY firebase/firestore.rules ./firestore.rules
    COPY firebase/firestore.indexes.json ./firestore.indexes.json
    COPY firebase/storage.rules ./storage.rules
    COPY .firebaserc ./
    ENTRYPOINT ["/entrypoint.sh"]
    ```

## 2. Build Process

- **Root monorepo scripts** (`package.json`):

  ```json
  {
    "scripts": {
      "dev": "pnpm --filter app dev",
      "dev:auth-app": "pnpm --filter auth-app dev",
      "build": "pnpm --filter app build",
      "build:auth-app": "pnpm --filter auth-app build",
      "preview": "pnpm --filter app preview",
      "preview:auth-app": "pnpm --filter auth-app preview",
      "check": "pnpm format:check && pnpm lint && pnpm type-check",
      "firebase:emulators": "firebase emulators:start",
      "firebase:emulators:exec": "firebase emulators:exec",
      "firebase:deploy": "firebase deploy",
      "firebase:deploy:rules": "firebase deploy --only firestore:rules",
      "firebase:deploy:indexes": "firebase deploy --only firestore:indexes",
      "docker:emulators:up": "test -f .env.docker || cp docker/env.docker.example .env.docker; docker-compose -f docker/docker-compose.yml up -d",
      "docker:emulators:down": "docker-compose -f docker/docker-compose.yml down",
      "docker:emulators:logs": "docker-compose -f docker/docker-compose.yml logs -f",
      "docker:emulators:restart": "docker-compose -f docker/docker-compose.yml restart",
      "docker:emulators:build": "docker-compose -f docker/docker-compose.yml build",
      "docker:emulators:clean": "docker-compose -f docker/docker-compose.yml down -v",
      "docker:emulators:check": "docker/check-emulators.sh"
    }
  }
  ```

  - **Local dev**:
    - Main app: `pnpm dev` (runs `vite` in `apps/app`)
    - Auth app: `pnpm dev:auth-app` (runs `vite` in `apps/auth-app`)
  - **Build**:
    - Main app: `pnpm build` ⇒ `pnpm --filter app build`
    - Auth app: `pnpm build:auth-app` ⇒ `pnpm --filter auth-app build`

- **Per-app build scripts**:
  - `apps/app/package.json`:

    ```json
    {
      "scripts": {
        "dev": "vite",
        "build": "tsc && vite build",
        "preview": "vite preview",
        "lint": "eslint . --max-warnings 0",
        "type-check": "tsc --noEmit"
      }
    }
    ```

  - `apps/auth-app/package.json`:

    ```json
    {
      "scripts": {
        "dev": "vite",
        "build": "tsc && vite build",
        "preview": "vite preview",
        "lint": "eslint . --max-warnings 0",
        "type-check": "tsc --noEmit"
      }
    }
    ```

- **Build output structure**:
  - Vite defaults, plus existing sample build output for `auth-app`:
    - `apps/auth-app/dist/index.html`
    - `apps/auth-app/dist/assets/*` (JS/CSS bundles)
  - For the main app, `vite build` in `apps/app` will similarly emit to `apps/app/dist/`.
  - These `dist/` directories contain static assets suitable for any static hosting platform or a static file server/container.

- **Build-time environment variables**:
  - Vite exposes only variables prefixed with `VITE_`. This repo defines env templates:
    - Root: `env.example`
    - Main app: `apps/app/env.example`
    - Auth app: `apps/auth-app/env.example`
  - **Root Firebase envs** (`env.example`):

    ```env
    # Copy to .env.local or .env.development / .env.production
    VITE_FIREBASE_API_KEY=demo-api-key
    VITE_FIREBASE_AUTH_DOMAIN=demo-project.firebaseapp.com
    VITE_FIREBASE_PROJECT_ID=demo-project
    VITE_FIREBASE_STORAGE_BUCKET=demo-project.appspot.com
    VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
    VITE_FIREBASE_APP_ID=1:123456789:web:demo
    VITE_FIREBASE_MEASUREMENT_ID=G-DEMO123

    VITE_FIREBASE_MODE=
    VITE_USE_FIREBASE_EMULATOR=true
    VITE_FIREBASE_EMULATOR_HOST=127.0.0.1
    VITE_FIREBASE_EMULATOR_AUTH_PORT=9099
    VITE_FIREBASE_EMULATOR_FIRESTORE_PORT=8080
    VITE_FIREBASE_EMULATOR_STORAGE_PORT=9199
    VITE_FIREBASE_EMULATOR_FUNCTIONS_PORT=5001
    ```

  - **Main app envs** (`apps/app/env.example`):

    ```env
    # Inherits root Firebase config; plus:
    VITE_AUTH_APP_URL=http://localhost:5175
    VITE_NONCE_SECRET=your-secret-key-minimum-16-chars-long
    ```

  - **Auth app envs** (`apps/auth-app/env.example`):

    ```env
    VITE_FIREBASE_API_KEY=demo-api-key
    VITE_FIREBASE_AUTH_DOMAIN=demo-project.firebaseapp.com
    VITE_FIREBASE_PROJECT_ID=demo-project
    ...
    VITE_DEFAULT_RETURN_URL=http://127.0.0.1:5174
    VITE_ALLOWED_REDIRECTS=http://127.0.0.1:5174,http://localhost:5174,https://app.example.com
    VITE_ENABLE_AUTH_COOKIE=true
    VITE_AUTH_COOKIE_NAME=auth_app_token
    VITE_AUTH_COOKIE_MAX_AGE=3600
    VITE_AUTH_COOKIE_SAMESITE=Lax
    # (optional) GOOGLE_APPLICATION_CREDENTIALS / FIREBASE_SERVICE_ACCOUNT_JSON / ADC for production
    ```

  - For production, you would typically:
    - Map these `VITE_` variables to your hosting platform’s build-time env configuration.
    - Ensure **secrets** like `VITE_NONCE_SECRET` and service account credentials are stored in the platform’s secret manager.

## 3. CI/CD Pipeline

- **Pipeline configuration files**:
  - As of this snapshot, there is **no CI/CD configuration** checked in:
    - No `.github/workflows/*`
    - No `.gitlab-ci.yml`
    - No `.circleci/config.yml`
  - All build and deploy commands are currently **manual**, executed via `pnpm` and `firebase-tools`.

- **Potential pipeline stages (recommended, not yet implemented)**:
  - **Install & cache**: Install `pnpm`, restore pnpm store, run `pnpm install`.
  - **Static checks**: `pnpm check` (format, lint, type-check) at repo root.
  - **Build apps**:
    - `pnpm build` (main app)
    - `pnpm build:auth-app` (auth app)
  - **Deploy**:
    - Option A: Use `firebase:deploy` for Firestore/Storage rules + Firebase Hosting (once configured).
    - Option B: Upload `apps/app/dist` and `apps/auth-app/dist` to your chosen hosting provider(s).

- **Automated deployment triggers**:
  - None are defined in the repo. Any branch-to-environment trigger logic would be defined once a CI/CD provider is integrated.

## 4. Environment Strategy

- **Environment tiers**:
  - Explicit tiers are not fully codified, but the repo hints at:
    - **Local development**: Vite dev servers + Firebase emulators (Docker or `firebase emulators:start`).
    - **Production**: Implied by comments around production Firebase credentials and CDN domains (`https://app.example.com`), but not yet wired to concrete hosting.
    - A **staging** tier is not explicitly defined but can be added by introducing separate env files / CI pipelines.

- **Environment-specific configurations**:
  - Vite supports `.env`, `.env.development`, `.env.production`, etc. The repo uses `*.example` as templates:
    - Root `env.example` mentions:

      ```env
      # Copy this file to .env.local for local development
      # or .env.development / .env.production for environment-specific configs
      ```

  - **Local dev**:
    - Use demo Firebase credentials and emulators:

      ```env
      VITE_USE_FIREBASE_EMULATOR=true
      VITE_FIREBASE_MODE=emulator # (optional explicit)
      ```

    - Auth app and main app communicate via `VITE_AUTH_APP_URL` / `VITE_DEFAULT_RETURN_URL` with local ports (e.g. 5174, 5175).

  - **Production** (planned pattern):
    - Set real Firebase project values for `VITE_FIREBASE_*` and either leave emulator flags unset or set:

      ```env
      VITE_USE_FIREBASE_EMULATOR=false
      VITE_FIREBASE_MODE=live
      ```

    - Configure cookie and redirect settings to point to production domains:

      ```env
      VITE_DEFAULT_RETURN_URL=https://app.example.com
      VITE_ALLOWED_REDIRECTS=https://app.example.com
      ```

- **Branch-to-environment mappings**:
  - Not defined in code (no CI configuration).
  - A common approach (to be implemented in CI) would be:
    - `main` ⇒ production
    - `develop` / feature branches ⇒ preview/staging environments

## 5. Docker & Containerization

- **Dockerfile configuration**:
  - Single Dockerfile is focused on **Firebase emulators**, not on containerizing the React apps:

    ```dockerfile
    # docker/Dockerfile.firebase-emulators
    FROM node:20-slim
    RUN npm install -g firebase-tools
    WORKDIR /app
    COPY firebase/firebase.json ./
    COPY firebase/firestore.rules ./firestore.rules
    COPY firebase/firestore.indexes.json ./firestore.indexes.json
    COPY firebase/storage.rules ./storage.rules
    COPY .firebaserc ./
    COPY docker/entrypoint.sh /entrypoint.sh
    ENTRYPOINT ["/entrypoint.sh"]
    ```

  - It expects `.firebaserc` at the repo root (not shown in this summary) and uses `/app/.firebase/emulators` for persistent emulator data.

- **docker-compose setup**:

  ```yaml
  # docker/docker-compose.yml
  services:
    firebase-emulators:
      build:
        context: ..
        dockerfile: docker/Dockerfile.firebase-emulators
      container_name: rates-firebase-emulators
      ports:
        - '4000:4000' # UI
        - '9099:9099' # Auth
        - '8080:8080' # Firestore
        - '9199:9199' # Storage
        - '5001:5001' # Functions
      volumes:
        - firebase-emulator-data:/app/.firebase/emulators
        - ../firebase/firebase.json:/app/firebase.json:ro
        - ../firebase/firestore.rules:/app/firestore.rules:ro
        - ../firebase/firestore.indexes.json:/app/firestore.indexes.json:ro
        - ../firebase/storage.rules:/app/storage.rules:ro
      env_file:
        - ../.env.docker
      environment:
        - FIREBASE_PROJECT_ID=${FIREBASE_PROJECT_ID:-demo-project}
      networks:
        - rates-network
      healthcheck:
        test:
          [
            'CMD-SHELL',
            'wget --quiet --tries=1 --spider http://localhost:4000 || exit 1',
          ]
        interval: 10s
        timeout: 5s
        retries: 5
        start_period: 30s
      restart: unless-stopped

  volumes:
    firebase-emulator-data:
      driver: local

  networks:
    rates-network:
      driver: bridge
  ```

  - Helper scripts and env:
    - `docker/env.docker.example` ⇒ copied to `.env.docker` if missing.
    - Root scripts:

      ```json
      {
        "docker:emulators:up": "test -f .env.docker || cp docker/env.docker.example .env.docker; docker-compose -f docker/docker-compose.yml up -d",
        "docker:emulators:down": "docker-compose -f docker/docker-compose.yml down",
        "docker:emulators:clean": "docker-compose -f docker/docker-compose.yml down -v"
      }
      ```

- **Container orchestration details**:
  - Local-only orchestration via `docker-compose` on a single host.
  - No Kubernetes / ECS / Nomad or other orchestration configs are present.
  - If you move to K8s/ECS, you would:
    - Either expose Firebase emulators as a shared dev cluster service.
    - Or replace emulators with production Firebase endpoints and avoid running them in-cluster.

## 6. Monitoring & Logging

- **Error tracking tools**:
  - No references in `package.json` or code to external tools like Sentry, LogRocket, Datadog, etc.
  - Error monitoring is currently limited to browser console / manual observation.

- **Logging patterns**:
  - The frontend apps primarily rely on default browser console logging (no centralized logging config in this repo).
  - Firebase rules and emulator logs are available via:
    - `firebase emulators:start` (CLI output)
    - `docker:emulators:logs` (Docker logs for the emulator container)

- **Performance monitoring tools**:
  - None are configured (no Lighthouse CI, Web Vitals reporting, or APM integrations in the codebase).
  - You can add such tools per hosting provider (e.g. Vercel Analytics) or via custom integrations.

## 7. Infrastructure as Code (IaC)

- **IaC tools**:
  - There is no Terraform, Pulumi, CloudFormation, or similar IaC configuration in this repo.
  - Firebase configuration (`firebase.json`, rules, indexes) functions as a **lightweight IaC** for Firestore/Storage schema and security, but broader cloud infra (networking, load balancers, compute) is not defined here.

- **Cloud resource configurations**:
  - Firebase resources defined:

    ```json
    // firebase/firebase.json
    {
      "firestore": {
        "rules": "firestore.rules",
        "indexes": "firestore.indexes.json"
      },
      "storage": {
        "rules": "storage.rules"
      },
      "emulators": {
        "auth": { "host": "0.0.0.0", "port": 9099 },
        "firestore": { "host": "0.0.0.0", "port": 8080 },
        "storage": { "host": "0.0.0.0", "port": 9199 },
        "ui": { "enabled": true, "host": "0.0.0.0", "port": 4000 },
        "singleProjectMode": true
      }
    }
    ```

  - Deployment commands:

    ```bash
    pnpm firebase:deploy          # deploys configured Firebase resources
    pnpm firebase:deploy:rules    # deploys Firestore rules only
    pnpm firebase:deploy:indexes  # deploys Firestore indexes only
    ```

- **Infrastructure dependencies**:
  - A Google Cloud project with Firebase enabled (project ID provided via `.firebaserc` and `FIREBASE_PROJECT_ID`).
  - For production Auth/Admin flows:
    - Service account credentials (via `GOOGLE_APPLICATION_CREDENTIALS`, `FIREBASE_SERVICE_ACCOUNT_JSON`, or Application Default Credentials in GCP) as described in `apps/auth-app/env.example`.
  - A static hosting solution for:
    - The **main app** build output (`apps/app/dist`).
    - The **auth app** build output (`apps/auth-app/dist`).

---

**Summary**: This repo is currently optimized for **local development** with Firebase emulators and Vite, with manual build and Firebase deploy commands. To move toward full production deployment, you’ll typically add: a concrete hosting provider configuration (or Firebase Hosting blocks), CI/CD workflows (GitHub Actions/GitLab CI/etc.), and production-grade environment/secret management wired to the existing `VITE_` configuration surface.
