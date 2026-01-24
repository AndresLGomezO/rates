## 1. API Architecture

The project is a **Firebase-backed SPA architecture** composed of:

- **Main App** (`apps/app`): React + Vite SPA that talks directly to **Firebase client SDKs** (Firestore, Auth, Storage, Functions) via the shared `@rates/firebase-client` package and Firestore services in `services/*`.
- **Auth App** (`apps/auth-app`): React + Vite SPA that exposes a **client-side API-like endpoint** at `/api/validate` implemented as a React route, plus Firebase Auth flows.
- **Token Validation API**: The main app calls the auth-app’s `/api/validate` endpoint over HTTP using the browser `fetch` API for server-side token validation via Firebase Admin SDK.

**API style**

- **Direct SDK**: Most data access is done via **Firebase SDK functions**, not REST endpoints (`collection`, `doc`, `getDoc`, `getDocs`, `setDoc`, `updateDoc`, etc.).
- **REST-like internal endpoint**: `/api/validate?token=...` in `auth-app` behaves like a REST GET endpoint returning JSON for token validation.
- There is **no GraphQL, tRPC, or custom REST API server** beyond this validation endpoint.

**Base URLs & endpoint patterns**

- **Auth validation base URL (from main app)**:
  - Base: `VITE_AUTH_APP_URL` (default `http://localhost:5175`)
  - Endpoint pattern: `${AUTH_APP_URL}/api/validate?token=${encodeURIComponent(token)}`
- **Auth app routes** (React Router in `apps/auth-app/src/routes.tsx`):
  - `/` (landing), `/login`, `/signup`, `/session`, `/validate`, `/logout`, `/api/validate`, `*` redirect
- **Firebase-backed collections**
  - `financialAccounts` collection with `paymentPeriods` subcollection used by the main app services for CRUD and amortization.

**API versioning**

- No explicit API versioning scheme is used:
  - `/api/validate` is unversioned.
  - Firebase client and Admin SDKs are used directly with their current versions as declared in `package.json`.

**Example: main app calling auth-app validation endpoint**

```ts
// apps/app/src/utils/tokenValidation.ts
const AUTH_APP_URL =
  (import.meta.env as Record<string, string | undefined>).VITE_AUTH_APP_URL ??
  'http://localhost:5175';

export async function validateToken(
  token: string | null
): Promise<TokenValidationResult> {
  // ...
  const response = await fetch(
    `${AUTH_APP_URL}/api/validate?token=${encodeURIComponent(token)}`,
    {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    }
  );
  // ...
}
```

## 2. External Services & Third-Party APIs

### Firebase (Client SDK)

- **Purpose**
  - Primary backend for:
    - Authentication (Firebase Auth)
    - Data storage (`financialAccounts` and `paymentPeriods` collections in Firestore)
    - Potential Storage and Functions usage (wired in through the shared client, even if not all are currently used).
- **SDKs & versions (from `apps/*/package.json` and `packages/firebase-client/package.json`)**
  - `firebase` `^11.1.0` – Web client SDK
  - Used via:
    - `@rates/firebase-client` (shared package) for main app
    - `apps/auth-app/src/firebase.ts` directly for auth-app
- **Configuration**
  - Centralized in `packages/firebase-client/src/initialize.ts` and `apps/auth-app/src/firebase.ts`.
  - Driven by Vite env vars (`VITE_FIREBASE_*`, `VITE_USE_FIREBASE_EMULATOR`, `VITE_FIREBASE_MODE`, etc.).

**Example: shared Firebase client initialization**

```ts
// packages/firebase-client/src/initialize.ts
function getFirebaseConfig(isEmulatorMode = false): FirebaseConfig {
  const config: FirebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? '',
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? '',
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? '',
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? '',
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '',
    appId: import.meta.env.VITE_FIREBASE_APP_ID ?? '',
  };
  // ...
}

export function initializeFirebase(
  config?: FirebaseConfig,
  forceReinit = false
): FirebaseApp {
  const mode = getFirebaseMode(); // 'emulator' or 'live'
  const isEmulatorMode = mode === 'emulator';
  const firebaseConfig = config ?? getFirebaseConfig(isEmulatorMode);
  const emulatorConfig = getEmulatorConfig();
  const app = initializeApp(firebaseConfig);
  if (mode === 'emulator' && Object.keys(emulatorConfig).length > 0) {
    connectEmulators(app, emulatorConfig);
  }
  // ...
  return app;
}
```

**Example: main app bootstrapping Firebase**

```ts
// apps/app/src/firebase.ts
import { initializeFirebase } from '@rates/firebase-client';

console.log('🔥 [firebase.ts] Initializing Firebase...');
// logs various VITE_FIREBASE_* envs for diagnostics

const app = initializeFirebase();
console.log('✅ [firebase.ts] Firebase initialized successfully');
```

**Example: auth-app Firebase initialization**

```ts
// apps/auth-app/src/firebase.ts
import { initializeApp, type FirebaseOptions } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';

const env = import.meta.env as Record<string, string | undefined>;
const isEmulator =
  env.VITE_FIREBASE_MODE === 'emulator' ||
  (env.VITE_USE_FIREBASE_EMULATOR !== 'false' && import.meta.env.PROD !== true);

const projectId = env.VITE_FIREBASE_PROJECT_ID ?? 'demo-project';
const firebaseConfig: FirebaseOptions = {
  apiKey: env.VITE_FIREBASE_API_KEY ?? 'demo-api-key',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN ?? `${projectId}.firebaseapp.com`,
  projectId,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID ?? 'demo-app-id',
};

const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);

if (isEmulator) {
  const host = env.VITE_FIREBASE_EMULATOR_HOST ?? '127.0.0.1';
  const port = Number(env.VITE_FIREBASE_EMULATOR_AUTH_PORT ?? 9099);
  connectAuthEmulator(auth, `http://${host}:${port}`, {
    disableWarnings: true,
  });
}
```

### Firebase Admin SDK

- **Purpose**
  - Server-side validation of Firebase ID tokens for stronger auth guarantees.
  - Used only inside the **auth-app** in a Node.js context (Vite middleware / server) to back the `/api/validate` endpoint.
- **SDK & version**
  - `firebase-admin` `^13.0.1` (see `apps/auth-app/package.json`).
- **Configuration**
  - Uses a combination of:
    - Emulator detection (`VITE_FIREBASE_MODE`, `FIREBASE_MODE`, `VITE_USE_FIREBASE_EMULATOR`, `USE_FIREBASE_EMULATOR`, `FIREBASE_AUTH_EMULATOR_HOST`).
    - Production credentials (`FIREBASE_SERVICE_ACCOUNT_JSON`, `GOOGLE_APPLICATION_CREDENTIALS`, and `FIREBASE_PROJECT_ID` / `VITE_FIREBASE_PROJECT_ID`).

**Example: Admin initialization and emulator/live split**

```ts
// apps/auth-app/src/utils/admin.ts
export function initializeAdmin(): App {
  const env = process.env as Record<string, string | undefined>;
  const isEmulator =
    env.VITE_FIREBASE_MODE === 'emulator' ||
    env.FIREBASE_MODE === 'emulator' ||
    (env.VITE_USE_FIREBASE_EMULATOR !== 'false' &&
      env.USE_FIREBASE_EMULATOR !== 'false' &&
      process.env.NODE_ENV !== 'production');

  if (isEmulator) {
    const emulatorHost =
      env.VITE_FIREBASE_EMULATOR_HOST ??
      env.FIREBASE_EMULATOR_HOST ??
      '127.0.0.1';
    const emulatorPort =
      env.VITE_FIREBASE_EMULATOR_AUTH_PORT ??
      env.FIREBASE_EMULATOR_AUTH_PORT ??
      '9099';
    process.env.FIREBASE_AUTH_EMULATOR_HOST = `${emulatorHost}:${emulatorPort}`;

    const projectId =
      env.VITE_FIREBASE_PROJECT_ID ?? env.FIREBASE_PROJECT_ID ?? 'demo-project';
    return (adminApp = initializeApp({ projectId }));
  }

  const projectId = env.VITE_FIREBASE_PROJECT_ID ?? env.FIREBASE_PROJECT_ID;
  const serviceAccountPath = env.GOOGLE_APPLICATION_CREDENTIALS;
  const serviceAccountJson = env.FIREBASE_SERVICE_ACCOUNT_JSON;
  // choose between file path, JSON, or ADC
  // ...
}
```

**Example: server-side token validation with Admin**

```ts
// apps/auth-app/src/utils/adminValidate.ts
export async function validateTokenWithAdmin(
  token: string
): Promise<ValidationResponse> {
  const auth = getAdminAuth();
  const decodedToken = await auth.verifyIdToken(token, true);
  const expiresAt = decodedToken.exp ? decodedToken.exp * 1000 : undefined;
  return { valid: true, expiresAt };
}
```

### Custom `@rates/firebase-client` Package

- **Purpose**
  - Shared abstraction over Firebase client SDK:
    - Centralized initialization with emulator/live switching.
    - Typed financial account and payment period schemas.
    - Amortization and payment calculations.
  - Consumed primarily by the main app’s `services/*` and utilities.

**Example: using the shared client in services**

```ts
// apps/app/src/services/financialAccounts.ts
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  Timestamp,
  type Firestore,
  type DocumentReference,
  type QuerySnapshot,
} from 'firebase/firestore';
import { getFirestore } from '@rates/firebase-client';

export async function createFinancialAccount(
  accountData: Omit<CreateFinancialAccountInput, 'userId'>
): Promise<string> {
  const firestore: Firestore = getFirestore();
  const accountRef: DocumentReference<FinancialAccount> = doc(
    firestore,
    FINANCIAL_ACCOUNTS_COLLECTION,
    accountId
  ) as DocumentReference<FinancialAccount>;
  await setDoc(accountRef, account);
  return accountId;
}
```

### Other External Services

- No direct integrations with Stripe, Auth0, or similar third-party SaaS APIs are present.
- Docker-based Firebase emulators are configured under `docker/` and `firebase/firebase.json` but are part of the Firebase stack rather than a separate API.

## 3. Authentication & Authorization

### Auth Strategy Overview

- **Authentication model**
  - **Firebase Auth** is the source of truth for user identities.
  - The **auth-app** manages sign-up, sign-in, session, and logout flows using Firebase Auth.
  - The **main app** treats the auth-app as an external identity provider and uses a **JWT-like token** (Firebase ID token) stored in a cookie/token store.
- **Token validation**
  - Client-side token format and expiry checks in both apps as a lightweight guard.
  - Server-side validation (via Firebase Admin SDK) behind `/api/validate` for strong guarantees.
  - Main app calls `/api/validate` to validate and optionally refresh tokens.
- **Authorization**
  - Authorization is primarily **implicit** via:
    - User-specific Firestore queries (filtering by `userId`).
    - Future enforcement via Firestore security rules (`firebase/firestore.rules`).

### Auth Providers & Contexts

- **Main app (`apps/app`)**
  - `AuthContext` (`apps/app/src/contexts/AuthContext.tsx`):
    - Holds current token, `isAuthenticated`, `redirectToAuth`, and `signOut`.
    - Uses `getAuthToken` / `clearAuthToken` utilities and a nonce-based redirect flow to the auth-app.

```ts
// apps/app/src/contexts/AuthContext.tsx
export function AuthProvider({ children }: PropsWithChildren) {
  const token = useSyncExternalStore(
    subscribeToken,
    getTokenSnapshot,
    getTokenSnapshot
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      isAuthenticated: token !== null && isValidTokenFormat(token),
      async redirectToAuth(path = 'login') {
        const currentUrl = new URL(window.location.href);
        const redirectTo = currentUrl.toString();
        const authUrl = await buildAuthAppUrl(AUTH_APP_URL, redirectTo, path);
        window.location.href = authUrl;
      },
      async signOut() {
        clearAuthToken();
        // redirect into auth-app logout flow
      },
    }),
    [token]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
```

- **Auth-app (`apps/auth-app`)**
  - Uses its own `AuthContext` (`apps/auth-app/src/contexts/AuthContext.tsx`) bound directly to `firebase.auth()`:

```ts
// apps/auth-app/src/contexts/AuthContext.tsx
export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });
    return unsub;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      async signIn(email, password, remember) {
        await setPersistence(
          auth,
          remember ? browserLocalPersistence : browserSessionPersistence
        );
        const result = await signInWithEmailAndPassword(auth, email, password);
        return result.user;
      },
      async signUp(email, password) {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        return result.user;
      },
      async signOut() {
        await firebaseSignOut(auth);
      },
    }),
    [loading, user]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
```

### Token Validation Flow

1. **User logs in via auth-app** (`/login`, `/signup` routes).
2. Auth-app obtains a Firebase ID token and sets it in a cookie according to `VITE_AUTH_COOKIE_*` settings.
3. Main app reads token from its storage (`getAuthToken`) and treats user as authenticated if the token format is valid.
4. Main app periodically or on access calls `validateAndRefreshToken` (in `apps/app/src/utils/tokenValidation.ts`), which:
   - Calls `/api/validate?token=...` on the auth-app.
   - Uses Admin SDK on the server side to validate and possibly refresh the token.
   - Clears invalid tokens and returns `null` if validation fails.

**Example: validate-and-refresh helper**

```ts
// apps/app/src/utils/tokenValidation.ts
export async function validateAndRefreshToken(): Promise<string | null> {
  const token = getAuthToken();
  if (!token) return null;

  const result = await validateToken(
    typeof token === 'string' ? token : (token?.token ?? null)
  );

  if (!result.isValid) {
    clearAuthToken();
    return null;
  }
  return result.token ?? null;
}
```

### Protected Routes & Permission Levels

- **Main app**
  - Protected routes are enforced via React routing and auth context (e.g., `ProtectedRoute`, `PrivateLayout` pattern described in docs).
  - While specific `ProtectedRoute` implementation lives in `apps/app/src/components/ProtectedRoute.tsx`, the pattern is:
    - If `isAuthenticated` is false, redirect to auth-app’s `/login` with a `redirectTo` back to the current URL.
    - Otherwise, render the protected content.
  - Data-level authorization:
    - `financialAccounts` and `paymentPeriods` services filter by user ID extracted from the token payload, ensuring users see only their own resources.

**Example: user scoping in Firestore queries**

```ts
// apps/app/src/services/financialAccounts.ts
function getCurrentUserId(): string {
  const tokenResult = getAuthToken(false);
  const token = typeof tokenResult === 'string' ? tokenResult : null;
  if (token) {
    const payload = decodeTokenPayload(token);
    return payload?.user_id ?? payload?.uid ?? payload?.sub ?? 'user-mock-123';
  }
  return 'user-mock-123'; // dev fallback
}

export async function getUserFinancialAccounts(): Promise<FinancialAccount[]> {
  const firestore: Firestore = getFirestore();
  const userId = getCurrentUserId();
  const accountsRef = collection(firestore, FINANCIAL_ACCOUNTS_COLLECTION);
  const q = query(accountsRef, where('userId', '==', userId));
  const querySnapshot = (await getDocs(q)) as QuerySnapshot<FinancialAccount>;
  return querySnapshot.docs.map(
    (docSnapshot) => docSnapshot.data() as FinancialAccount
  );
}
```

## 4. Data Fetching Patterns

### Fetching Utilities & Patterns

- **Firebase SDK-driven data access**
  - All persistent data operations use Firebase client SDKs:
    - `firebase/firestore` for documents/collections.
    - `firebase/auth` in auth-app.
  - There is **no axios/ky**; HTTP `fetch` is used only to call the auth-app’s validation endpoint.

**Typical Firestore CRUD pattern (main app)**

```ts
// apps/app/src/services/paymentPeriods.ts
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { getFirestore } from '@rates/firebase-client';

export async function getPaymentPeriods(
  accountNumber: string
): Promise<PaymentPeriod[]> {
  const firestore: Firestore = getFirestore();
  const periodsRef = getPaymentPeriodsCollection(firestore, accountNumber);
  const q = query(periodsRef, orderBy('periodNumber', 'asc'));
  const querySnapshot = (await getDocs(q)) as QuerySnapshot<PaymentPeriod>;
  return querySnapshot.docs.map(
    (docSnapshot) => docSnapshot.data() as PaymentPeriod
  );
}
```

**Pattern: batch operations & business logic in services**

- Services like `logPayment`, `generateAmortizationPlanForAccount`, and `batchLogPaymentsToPeriods` encapsulate:
  - Multiple Firestore reads/writes.
  - Domain logic (amortization, capital vs interest, status transitions).
  - Integration with shared `@rates/firebase-client` utilities.

**Example: logging a payment to a period**

```ts
// apps/app/src/services/paymentPeriods.ts
export async function logPaymentToPeriod(
  accountNumber: string,
  periodNumber: number,
  paymentData: LogPaymentToPeriodInput
): Promise<PaymentPeriod> {
  const firestore: Firestore = getFirestore();
  const periodRef = getPaymentPeriodRef(firestore, accountNumber, periodNumber);
  const periodSnap = await getDoc(periodRef);
  const period = periodSnap.data() as PaymentPeriod;

  const { getFinancialAccount } = await import('./financialAccounts');
  const account = await getFinancialAccount(accountNumber);
  const isBill = account?.accountType === 'bill';

  const newAmountPaid = period.amountPaid + paymentData.amount;
  const newStatus = calculatePeriodStatus(
    period.amount,
    newAmountPaid,
    isBill,
    true
  );

  await updateDoc(periodRef, {
    amountPaid: newAmountPaid,
    status: newStatus,
    paymentLog: [...period.paymentLog, paymentEntry],
    updatedAt: Timestamp.now(),
  });

  const updatedSnap = await getDoc(periodRef);
  return updatedSnap.data() as PaymentPeriod;
}
```

### Caching & Revalidation

- There is **no explicit client-side cache layer** like React Query or SWR.
- Implicit caching exists through:
  - Firebase SDK’s internal connection pooling.
  - Component-level state where data is stored after fetching.
- Revalidation patterns:
  - Pages and modals re-fetch from Firestore as needed through services (e.g., after creating accounts, logging payments, or generating amortization plans).
  - No global invalidation bus; revalidation is handled per screen/interaction.

### HTTP Fetch Usage

- `fetch` is used specifically for token validation:
  - Endpoint: `${AUTH_APP_URL}/api/validate?token=...`
  - Method: `GET`
  - Expectation: JSON body matching `ValidationApiResponse`.

## 5. Environment Variables

> Note: Values are omitted; only names and usage are documented.

### Firebase Core (shared)

Defined in root `env.example` and used by `@rates/firebase-client` and `auth-app`:

- **Project configuration**
  - `VITE_FIREBASE_API_KEY` – Client-side Firebase API key.
  - `VITE_FIREBASE_AUTH_DOMAIN` – Firebase Auth domain.
  - `VITE_FIREBASE_PROJECT_ID` – Project ID (used by both client and Admin).
  - `VITE_FIREBASE_STORAGE_BUCKET` – Storage bucket name.
  - `VITE_FIREBASE_MESSAGING_SENDER_ID` – Messaging sender ID.
  - `VITE_FIREBASE_APP_ID` – Web app ID.
  - `VITE_FIREBASE_MEASUREMENT_ID` – Optional analytics measurement ID.
- **Mode & emulator configuration**
  - `VITE_FIREBASE_MODE` – `'emulator'` or `'live'`; if unset, emulator in dev and live in prod.
  - `VITE_USE_FIREBASE_EMULATOR` – `'true'`/`'false'` toggle for emulator usage.
  - `VITE_FIREBASE_EMULATOR_HOST` – Host for emulators (default `127.0.0.1`).
  - `VITE_FIREBASE_EMULATOR_AUTH_PORT` – Auth emulator port (default `9099`).
  - `VITE_FIREBASE_EMULATOR_FIRESTORE_PORT` – Firestore emulator port (default `8080`).
  - `VITE_FIREBASE_EMULATOR_STORAGE_PORT` – Storage emulator port (default `9199`).
  - `VITE_FIREBASE_EMULATOR_FUNCTIONS_PORT` – Functions emulator port (default `5001`).

**Visibility**

- All `VITE_*` variables are **exposed to the client** (Vite convention).
- They should only contain values safe for client-side usage (Firebase keys are designed to be public).

### Main App Specific (`apps/app/env.example`)

- **Auth app integration**
  - `VITE_AUTH_APP_URL` – Base URL for auth-app (`http://localhost:5175` by default).
- **Nonce-based security**
  - `VITE_NONCE_SECRET` – Shared secret for nonce generation between main app and auth-app (must match in both apps; minimum 16 chars).

**Visibility**

- All of the above are `VITE_*` and thus **client-exposed**.

### Auth-App Specific (`apps/auth-app/env.example`)

- **Firebase configuration**
  - Same `VITE_FIREBASE_*` and emulator-related variables as above.
- **Redirect handling**
  - `VITE_DEFAULT_RETURN_URL` – Default URL to redirect back to (main app, e.g. `http://127.0.0.1:5174`).
  - `VITE_ALLOWED_REDIRECTS` – Comma-separated whitelist of allowed redirect origins/URLs.
- **Auth cookie configuration**
  - `VITE_ENABLE_AUTH_COOKIE` – Enables non-HttpOnly auth cookie.
  - `VITE_AUTH_COOKIE_NAME` – Cookie name.
  - `VITE_AUTH_COOKIE_MAX_AGE` – Lifetime in seconds.
  - `VITE_AUTH_COOKIE_DOMAIN` – Optional cookie domain.
  - `VITE_AUTH_COOKIE_SAMESITE` – SameSite policy (e.g. `Lax`).
- **Nonce security**
  - `VITE_NONCE_SECRET` – Same shared secret as main app.
  - `VITE_NONCE_MAX_AGE_MS` – Optional override for nonce max age (ms).

**Visibility**

- All `VITE_*` variables are **client-exposed** in auth-app; secrets must be chosen accordingly (nonce secret is sensitive but required for this cross-app design).

### Server-Only / Admin Environment Variables (auth-app)

- **Admin & emulator behavior**
  - `FIREBASE_MODE` – Server-side mirror of mode.
  - `USE_FIREBASE_EMULATOR` – Server-side emulator flag.
  - `FIREBASE_EMULATOR_HOST`, `FIREBASE_EMULATOR_AUTH_PORT` – Emulator host/port overrides.
  - `FIREBASE_AUTH_EMULATOR_HOST` – Computed host:port for Admin to connect to emulator.
- **Admin credentials**
  - `FIREBASE_PROJECT_ID` – Server-side project ID.
  - `GOOGLE_APPLICATION_CREDENTIALS` – Path to service account JSON file (production).
  - `FIREBASE_SERVICE_ACCOUNT_JSON` – Raw JSON string for service account (production).

**Visibility**

- All of the above are **server-only**, read via `process.env` in Node context (never exposed to the browser).

### Docker / Emulator Configuration

- Environment defaults are also referenced in:
  - `docker/env.docker.example`
  - `firebase/firebase.json` (emulator ports and hosts).
- These configure the Firebase emulators (auth, Firestore, storage, UI) but do not introduce new application-level environment variables beyond those already listed.

## 6. Webhooks & Background Jobs

### Webhooks

- There are **no external webhooks** configured (no Stripe webhooks, GitHub webhooks, etc.).
- Internal API-like endpoint:
  - `/api/validate` functions as an internal validation endpoint rather than a webhook:
    - Implemented as a React route (`apps/auth-app/src/pages/ApiValidate.tsx`) that uses `handleValidateAPI` to respond with JSON.

**Example: internal API handler**

```ts
// apps/auth-app/src/utils/apiHandler.ts
export async function handleValidateAPI(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const token = url.searchParams.get('token');
  if (!token) {
    return new Response(
      JSON.stringify({ valid: false, error: 'Token parameter is required' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  return new Promise((resolve) => {
    onAuthStateChanged(
      auth,
      (user) => {
        void (async () => {
          const result = await validateTokenAPI(token, user);
          resolve(
            new Response(JSON.stringify(result), {
              status: result.valid ? 200 : 401,
              headers: { 'Content-Type': 'application/json' },
            })
          );
        })();
      },
      () => {
        void validateTokenAPI(token, null).then((result) => {
          resolve(
            new Response(JSON.stringify(result), {
              status: result.valid ? 200 : 401,
              headers: { 'Content-Type': 'application/json' },
            })
          );
        });
      }
    );
  });
}
```

### Background Jobs & Schedulers

- There are **no dedicated background job processors** (e.g., Bull, Agenda, Cloud Scheduler) configured in this repo.
- Background-like logic is **triggered on demand** from the client:
  - Functions such as `generateAmortizationPlanForAccount` and `extendPeriodicBillPeriods` perform multi-step operations synchronously in response to user actions.
  - They run entirely in the browser using Firestore and local computations.

**Example: on-demand amortization generation**

```ts
// apps/app/src/services/paymentPeriods.ts
export async function generateAmortizationPlanForAccount(
  accountNumber: string,
  regenerate: boolean = false,
  endDate?: Date
): Promise<void> {
  const { getFinancialAccount } = await import('./financialAccounts');
  const { generateAmortizationPlan } = await import('@rates/firebase-client');

  const account = await getFinancialAccount(accountNumber);
  // calculates and writes all payment periods directly to Firestore
}
```

### Cron / Scheduled Tasks

- There are **no cron jobs or scheduled tasks** wired up in this repo.
- Any periodic maintenance (e.g., extending periodic bill periods) is currently implemented as **user-triggered actions** via UI flows that call service functions like:
  - `extendPeriodicBillPeriods`
  - `generateAmortizationPlanForAccount`
