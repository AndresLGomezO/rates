# @rates/firebase-client

Firebase Client SDK wrapper package for the Rates monorepo. Provides centralized Firebase initialization and service access with support for both emulator and live modes.

## Features

- ✅ **Emulator & Live Mode Support**: Automatically switches between emulator and live Firebase based on environment
- ✅ **Type-Safe**: Full TypeScript support with proper types
- ✅ **Lazy Initialization**: Services are initialized on-demand
- ✅ **Environment-Based Config**: Uses environment variables for configuration
- ✅ **Monorepo Ready**: Designed for use across multiple apps in the monorepo

## Installation

This package is part of the monorepo workspace. To use it in an app:

```json
{
  "dependencies": {
    "@rates/firebase-client": "workspace:*"
  }
}
```

## Usage

### 1. Initialize Firebase

In your app's entry point (e.g., `main.tsx` or `App.tsx`):

```typescript
import { initializeFirebase } from '@rates/firebase-client';

// Initialize Firebase (reads config from environment variables)
initializeFirebase();
```

### 2. Use Firebase Services

```typescript
import {
  getAuth,
  getFirestore,
  getStorage,
  getFunctions,
} from '@rates/firebase-client';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { collection, getDocs } from 'firebase/firestore';

// Get services
const auth = getAuth();
const firestore = getFirestore();
const storage = getStorage();
const functions = getFunctions();

// Use Firebase services
async function login(email: string, password: string) {
  const userCredential = await signInWithEmailAndPassword(
    auth,
    email,
    password
  );
  return userCredential.user;
}

async function getUsers() {
  const usersCollection = collection(firestore, 'users');
  const snapshot = await getDocs(usersCollection);
  return snapshot.docs.map((doc) => doc.data());
}
```

### 3. Manual Configuration (Optional)

If you need to provide custom configuration:

```typescript
import { initializeFirebase } from '@rates/firebase-client';

const config = {
  apiKey: 'your-api-key',
  authDomain: 'your-project.firebaseapp.com',
  projectId: 'your-project-id',
  storageBucket: 'your-project.appspot.com',
  messagingSenderId: 'your-sender-id',
  appId: 'your-app-id',
};

initializeFirebase(config);
```

## Environment Variables

The package reads configuration from environment variables. See `env.example` in the root directory for all available options.

### Required Variables

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

### Optional Variables

- `VITE_FIREBASE_MEASUREMENT_ID` - For Analytics
- `VITE_FIREBASE_MODE` - Force mode: `'emulator'` or `'live'`
- `VITE_USE_FIREBASE_EMULATOR` - Set to `'true'` to use emulators
- `VITE_FIREBASE_EMULATOR_HOST` - Emulator host (default: `localhost`)
- `VITE_FIREBASE_EMULATOR_AUTH_PORT` - Auth emulator port (default: `9099`)
- `VITE_FIREBASE_EMULATOR_FIRESTORE_PORT` - Firestore emulator port (default: `8080`)
- `VITE_FIREBASE_EMULATOR_STORAGE_PORT` - Storage emulator port (default: `9199`)
- `VITE_FIREBASE_EMULATOR_FUNCTIONS_PORT` - Functions emulator port (default: `5001`)

## Mode Detection

The package automatically determines which mode to use:

1. **Explicit Mode**: If `VITE_FIREBASE_MODE` is set to `'emulator'` or `'live'`, that mode is used
2. **Development Mode**: If `import.meta.env.DEV` is `true`, defaults to emulator mode
3. **Production Mode**: Otherwise, uses live Firebase

## Running Emulators

Start Firebase emulators from the root:

```bash
pnpm firebase:emulators
```

This will start all emulators configured in `firebase/firebase.json`.

## API Reference

### `initializeFirebase(config?, forceReinit?)`

Initialize Firebase app and connect to emulators if in emulator mode.

- `config` (optional): Custom Firebase configuration object
- `forceReinit` (optional): Force re-initialization even if already initialized
- Returns: `FirebaseApp` instance

### `getAuth(region?)`

Get Firebase Auth instance.

- `region` (optional): Auth region
- Returns: `Auth` instance

### `getFirestore(databaseId?)`

Get Firestore instance.

- `databaseId` (optional): Database ID
- Returns: `Firestore` instance

### `getStorage(bucket?)`

Get Firebase Storage instance.

- `bucket` (optional): Storage bucket name
- Returns: `Storage` instance

### `getFunctions(region?)`

Get Cloud Functions instance.

- `region` (optional): Functions region (default: `us-central1`)
- Returns: `Functions` instance

### `getFirebaseApp()`

Get the initialized Firebase app instance.

- Returns: `FirebaseApp` instance
- Throws: Error if Firebase is not initialized

### `isFirebaseInitialized()`

Check if Firebase is initialized.

- Returns: `boolean`

## Best Practices

1. **Initialize Early**: Call `initializeFirebase()` in your app's entry point before using any Firebase services
2. **Use Environment Variables**: Store Firebase config in environment variables, not in code
3. **Separate by Environment**: Use different `.env` files for different environments (`.env.local`, `.env.development`, `.env.production`)
4. **Type Safety**: Import types from Firebase SDK for better type safety:
   ```typescript
   import type { User } from 'firebase/auth';
   import type { DocumentData } from 'firebase/firestore';
   ```

## Troubleshooting

### "Firebase not initialized" Error

Make sure to call `initializeFirebase()` before using any Firebase services.

### Emulators Not Connecting

1. Ensure emulators are running: `pnpm firebase:emulators`
2. Check that `VITE_USE_FIREBASE_EMULATOR=true` or you're in development mode
3. Verify emulator ports match your `firebase.json` configuration

### Environment Variables Not Loading

In Vite, environment variables must be prefixed with `VITE_` to be accessible in the browser. Make sure your `.env` files use the `VITE_` prefix.
