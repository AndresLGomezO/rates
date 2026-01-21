# Firebase Integration Guide

This document is the **single source of truth** for Firebase configuration and emulator usage in the Rates monorepo.

It complements:

- Root `README.md` and `QUICKSTART.md` (high-level project + startup)
- `docs/INTEGRATIONS.md` (overall integrations architecture)
- `packages/firebase-client/README.md` (Firebase client API details)

---

## 1. Architecture & Responsibilities

- **Main app** (`apps/app`)
  - Uses the shared `@rates/firebase-client` package for:
    - Initializing the Firebase client SDK (emulator vs live).
    - Accessing Firestore, Auth, Storage, and Functions.
  - All Firestore access goes through `services/*` and `utils/*`.

- **Auth app** (`apps/auth-app`)
  - Uses Firebase **client SDK** for user sign‑in/sign‑up.
  - Uses Firebase **Admin SDK** for server‑side token validation behind `/api/validate`.

- **Shared package** (`packages/firebase-client`)
  - Centralized client‑side initialization + emulator/live switching.
  - Financial accounts schema, types, amortization utilities.

- **Firebase config** (`firebase/`)
  - `firebase.json`, `firestore.rules`, `firestore.indexes.json`, `storage.rules`.

---

## 2. Local Development: Emulators

You can run emulators either **locally with Firebase CLI** or **in Docker**.

### 2.1 Start Emulators (Local CLI)

From repo root:

```bash
pnpm firebase:emulators
```

This starts:

- Auth: `http://127.0.0.1:9099`
- Firestore: `http://127.0.0.1:8080`
- Storage: `http://127.0.0.1:9199`
- Functions: `http://127.0.0.1:5001`
- Emulator UI: `http://127.0.0.1:4000`

### 2.2 Start Emulators (Docker)

From repo root:

```bash
pnpm docker:emulators:build   # first time or when Dockerfile changes
pnpm docker:emulators:up
```

Then:

- Emulator UI: `http://127.0.0.1:4000`
- Other ports are mapped the same as local CLI (9099, 8080, 9199, 5001)

See `docker/README.md` for full Docker workflow, data persistence, and troubleshooting.

---

## 3. Ports, Hosts, and Project IDs

Ports are standardized across `firebase.json`, Docker, and env examples:

| Service            | Port | Notes                                 |
| ------------------ | ---- | ------------------------------------- |
| Auth Emulator      | 9099 | `firebase.json`, docker, env examples |
| Firestore Emulator | 8080 | `firebase.json`, docker, env examples |
| Storage Emulator   | 9199 | `firebase.json`, docker, env examples |
| Functions Emulator | 5001 | docker, env examples                  |
| Emulator UI        | 4000 | `firebase.json`, docker               |

Hosts and URLs:

- Emulator host: `127.0.0.1`
- Main app: `http://127.0.0.1:5174`
- Auth app: `http://127.0.0.1:5175`

Standard project ID for local/emulator usage:

- `demo-project`
- Must be consistent in:
  - `apps/app/.env.local` → `VITE_FIREBASE_PROJECT_ID`
  - `apps/auth-app/.env.local` → `VITE_FIREBASE_PROJECT_ID`
  - `docker/.env.docker` → `FIREBASE_PROJECT_ID`

---

## 4. Environment Variables (Client Side)

These are Vite env vars (all `VITE_*`) and are safe for client exposure.

### 4.1 Core Firebase Config

Set in root `env.example` and app‑level `env.example` files:

```bash
VITE_FIREBASE_API_KEY=demo-api-key
VITE_FIREBASE_AUTH_DOMAIN=demo-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=demo-project
VITE_FIREBASE_STORAGE_BUCKET=demo-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:demo
VITE_FIREBASE_MEASUREMENT_ID=G-DEMO123
```

### 4.2 Emulator / Mode Flags

```bash
VITE_FIREBASE_MODE=emulator            # or 'live'
VITE_USE_FIREBASE_EMULATOR=true        # convenient toggle

VITE_FIREBASE_EMULATOR_HOST=127.0.0.1
VITE_FIREBASE_EMULATOR_AUTH_PORT=9099
VITE_FIREBASE_EMULATOR_FIRESTORE_PORT=8080
VITE_FIREBASE_EMULATOR_STORAGE_PORT=9199
VITE_FIREBASE_EMULATOR_FUNCTIONS_PORT=5001
```

The shared client (`@rates/firebase-client`) uses these to decide between emulator/live and to connect the individual SDKs.

---

## 5. Environment Variables (Server / Admin Side)

Used only by the **auth app’s** Admin SDK utilities (Node context).

### 5.1 Emulator Behavior

```bash
FIREBASE_MODE=emulator
USE_FIREBASE_EMULATOR=true
FIREBASE_EMULATOR_HOST=127.0.0.1
FIREBASE_EMULATOR_AUTH_PORT=9099
FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099
FIREBASE_PROJECT_ID=demo-project
```

These are typically set implicitly by the dev environment; Admin helpers also derive `FIREBASE_AUTH_EMULATOR_HOST` when needed.

### 5.2 Production Credentials

Choose one of:

```bash
# Option A: service account JSON file
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json

# Option B: inline JSON
FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account", ...}'
```

In Google Cloud environments, Application Default Credentials (ADC) can be used without additional configuration.

---

## 6. Using Firebase in the Apps

### 6.1 Main App (via `@rates/firebase-client`)

Example usage:

```ts
import { getAuth, getFirestore } from '@rates/firebase-client';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { collection, getDocs } from 'firebase/firestore';

const auth = getAuth();
const firestore = getFirestore();

await signInWithEmailAndPassword(auth, email, password);
const snapshot = await getDocs(collection(firestore, 'users'));
```

Initialization happens in `apps/app/src/firebase.ts` via `initializeFirebase()` from the shared package; you usually don’t need to call it manually.

### 6.2 Auth App (client SDK)

The auth app initializes Firebase directly in `apps/auth-app/src/firebase.ts` using `VITE_FIREBASE_*` env vars and connects to the Auth emulator when enabled.

### 6.3 Auth App (Admin SDK)

Admin helpers in `apps/auth-app/src/utils/admin*.ts`:

- Initialize Admin SDK with emulator or production credentials.
- Validate ID tokens server‑side for `/api/validate`.

---

## 7. Scripts & Commands

From project root:

- **Local emulators**
  - `pnpm firebase:emulators` – start all Firebase emulators
  - `pnpm firebase:emulators:exec` – run a command with emulators running

- **Docker emulators**
  - `pnpm docker:emulators:build` – build the emulator image
  - `pnpm docker:emulators:up` – start emulators in Docker
  - `pnpm docker:emulators:down` – stop emulators
  - `pnpm docker:emulators:logs` – follow logs
  - `pnpm docker:emulators:clean` – clear all emulator data

- **Firebase deploy**
  - `pnpm firebase:deploy` – deploy rules + indexes
  - `pnpm firebase:deploy:rules` – deploy Firestore rules only
  - `pnpm firebase:deploy:indexes` – deploy Firestore indexes only

---

## 8. Verification & Troubleshooting

### 8.1 Quick Verification

```bash
# Verify emulator UI
curl http://127.0.0.1:4000

# Verify Auth emulator
curl http://127.0.0.1:9099

# Optional helper script
./verify-firebase-config.sh
```

Checklist:

- [ ] `VITE_FIREBASE_PROJECT_ID=demo-project` in both apps
- [ ] Emulator ports match `firebase.json` (9099, 8080, 9199, 5001, 4000)
- [ ] Docker `.env.docker` (if used) has `FIREBASE_PROJECT_ID=demo-project`

### 8.2 Common Issues

- **Port already in use**
  - Use `lsof -i :9099` / `lsof -i :4000` to find the process.
  - Stop the conflicting process or adjust ports in `docker-compose.override.yml`.

- **Connection refused**
  - Ensure emulators or Docker container are running.
  - Check logs: `pnpm docker:emulators:logs` or Firebase CLI output.

- **Project ID mismatch**
  - Ensure all env files and Docker config use the same project ID.
  - Use `./fix-project-id.sh demo-project` if provided.

---

## 9. Where to Look Next

- `packages/firebase-client/README.md` – detailed client package API and examples.
- `docs/INTEGRATIONS.md` – high-level view of how Firebase, the auth app, and token validation fit together.
- `apps/app/README.md` and `apps/auth-app/README.md` – app-specific setup and auth/token flows.
