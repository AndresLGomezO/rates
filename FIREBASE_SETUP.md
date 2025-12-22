# Firebase Setup Guide

This document provides a quick reference for the Firebase setup in this monorepo.

## Architecture

The Firebase setup follows monorepo best practices:

- **`packages/firebase-client/`** - Shared Firebase client SDK wrapper
- **`firebase/`** - Centralized Firebase configuration
- **Environment-based configuration** - Uses `.env` files for different environments

## Quick Start

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Configure Environment Variables

Copy `env.example` to `.env.local` and fill in your Firebase project details:

```bash
cp env.example .env.local
```

Edit `.env.local` with your Firebase project configuration.

### 3. Start Emulators (Development)

You have two options:

#### Option A: Local Emulators (Recommended for quick testing)

```bash
pnpm firebase:emulators
```

This starts all Firebase emulators (Auth, Firestore, Storage, Functions) and the Emulator UI at http://localhost:4000

#### Option B: Docker Emulators (Recommended for consistency)

```bash
pnpm docker:emulators:up
```

This starts emulators in a Docker container. See `docker/README.md` for detailed Docker instructions.

**Benefits of Docker:**
- Consistent environment across team members
- Isolated from your system
- Easy to start/stop
- Data persistence via Docker volumes

### 4. Use Firebase in Your App

Firebase is already initialized in `apps/app/src/main.tsx`. You can use it anywhere in your app:

```typescript
import { getAuth, getFirestore } from '@rates/firebase-client';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { collection, getDocs } from 'firebase/firestore';

// Get services
const auth = getAuth();
const firestore = getFirestore();

// Use them
await signInWithEmailAndPassword(auth, email, password);
const snapshot = await getDocs(collection(firestore, 'users'));
```

## Environment Modes

The Firebase client automatically switches between emulator and live mode:

- **Development** (`pnpm dev`): Uses emulators by default
- **Production** (`pnpm build`): Uses live Firebase

You can override this with `VITE_FIREBASE_MODE=emulator` or `VITE_FIREBASE_MODE=live`

## Project Aliases

Use Firebase project aliases for different environments:

```bash
# Switch to dev project
firebase use dev

# Switch to staging project
firebase use staging

# Switch to production project
firebase use prod
```

Update `.firebaserc` with your actual project IDs.

## Available Scripts

### Local Emulators
- `pnpm firebase:emulators` - Start all Firebase emulators locally
- `pnpm firebase:emulators:exec` - Execute command with emulators running

### Docker Emulators
- `pnpm docker:emulators:up` - Start emulators in Docker
- `pnpm docker:emulators:down` - Stop Docker emulators
- `pnpm docker:emulators:logs` - View emulator logs
- `pnpm docker:emulators:restart` - Restart emulators
- `pnpm docker:emulators:build` - Rebuild Docker image
- `pnpm docker:emulators:clean` - Stop and remove volumes (clears data)

### Deployment
- `pnpm firebase:deploy` - Deploy Firebase configuration (rules, indexes)
- `pnpm firebase:deploy:rules` - Deploy Firestore rules only
- `pnpm firebase:deploy:indexes` - Deploy Firestore indexes only

## File Structure

```
rates/
├── packages/
│   └── firebase-client/     # Firebase client package
│       ├── src/
│       │   ├── index.ts      # Main exports
│       │   ├── initialize.ts # Firebase initialization
│       │   ├── services.ts   # Service getters
│       │   ├── types.ts      # TypeScript types
│       │   └── example-usage.ts  # Usage examples
│       └── README.md         # Detailed documentation
├── firebase/
│   ├── firebase.json         # Emulator configuration
│   ├── firestore.rules       # Security rules
│   └── firestore.indexes.json # Firestore indexes
├── docker/
│   ├── Dockerfile.firebase-emulators  # Docker image for emulators
│   ├── docker-compose.yml    # Docker Compose configuration
│   ├── docker-compose.override.yml.example  # Override example
│   ├── env.docker.example    # Docker environment variables
│   └── README.md             # Docker documentation
├── .firebaserc               # Project aliases
└── env.example               # Environment variable template
```

## Troubleshooting

### Emulators Not Connecting

1. Ensure emulators are running: `pnpm firebase:emulators`
2. Check that `VITE_USE_FIREBASE_EMULATOR=true` in your `.env.local`
3. Verify ports match between `firebase.json` and environment variables

### Environment Variables Not Loading

- Vite requires `VITE_` prefix for environment variables
- Restart dev server after changing `.env` files
- Check that `.env.local` exists and has correct values

### TypeScript Errors

- Run `pnpm install` to ensure all dependencies are installed
- Check that `@rates/firebase-client` is in your app's `package.json`

## Next Steps

1. **Set up Firestore rules**: Edit `firebase/firestore.rules` with your security rules
2. **Create Firestore indexes**: Add indexes to `firebase/firestore.indexes.json` as needed
3. **Configure authentication**: Set up authentication providers in Firebase Console
4. **Deploy rules**: `pnpm firebase:deploy:rules` when ready

For more details, see `packages/firebase-client/README.md`.

