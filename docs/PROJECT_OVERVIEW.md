# Project Overview

This document provides a comprehensive overview of the Rates monorepo project structure, technologies, dependencies, and configuration.

## 1. Project Structure

### Complete Folder/File Structure

```
rates/
├── apps/                          # Application packages
│   ├── app/                      # Main financial accounts application
│   │   ├── src/
│   │   │   ├── components/      # React components
│   │   │   │   ├── AuthRedirectHandler.tsx
│   │   │   │   ├── BatchPaymentModal.tsx
│   │   │   │   ├── CreateAccountForm.tsx
│   │   │   │   ├── Filters.tsx
│   │   │   │   ├── LogPaymentModal.tsx
│   │   │   │   ├── Modal.tsx
│   │   │   │   ├── NewAccountWizard.tsx
│   │   │   │   ├── PrivateLayout.tsx
│   │   │   │   ├── ProtectedRoute.tsx
│   │   │   │   ├── PublicLayout.tsx
│   │   │   │   └── SearchBar.tsx
│   │   │   ├── contexts/         # React contexts
│   │   │   │   └── AuthContext.tsx
│   │   │   ├── pages/            # Page components
│   │   │   │   ├── AccountDetail.tsx
│   │   │   │   ├── AccountsByType.tsx
│   │   │   │   ├── Dashboard.tsx
│   │   │   │   ├── Login.tsx
│   │   │   │   └── MigrateAccounts.tsx
│   │   │   ├── services/         # Service layer
│   │   │   │   ├── financialAccounts.ts
│   │   │   │   └── paymentPeriods.ts
│   │   │   ├── utils/            # Utility functions
│   │   │   │   ├── auth.ts
│   │   │   │   ├── filterAccounts.ts
│   │   │   │   ├── formatters.ts
│   │   │   │   ├── generateAmortizationPlan.ts
│   │   │   │   ├── migrateAccounts.ts
│   │   │   │   ├── mockFinancialAccounts.ts
│   │   │   │   ├── nonce.ts
│   │   │   │   ├── paymentUtils.ts
│   │   │   │   └── tokenValidation.ts
│   │   │   ├── firebase.ts       # Firebase initialization
│   │   │   ├── index.css         # Global styles
│   │   │   └── main.tsx          # Application entry point
│   │   ├── public/               # Static assets
│   │   ├── index.html            # HTML template
│   │   ├── package.json
│   │   ├── vite.config.ts        # Vite configuration
│   │   ├── tsconfig.json         # TypeScript configuration
│   │   └── env.example           # Environment variables template
│   │
│   └── auth-app/                 # Authentication microservice application
│       ├── src/
│       │   ├── components/
│       │   │   └── NonceGuard.tsx
│       │   ├── contexts/
│       │   │   └── AuthContext.tsx
│       │   ├── pages/
│       │   │   ├── ApiValidate.tsx
│       │   │   ├── Landing.tsx
│       │   │   ├── Login.tsx
│       │   │   ├── Logout.tsx
│       │   │   ├── Session.tsx
│       │   │   ├── Signup.tsx
│       │   │   └── Validate.tsx
│       │   ├── utils/
│       │   │   ├── admin.ts
│       │   │   ├── adminValidate.ts
│       │   │   ├── apiHandler.ts
│       │   │   ├── apiValidate.ts
│       │   │   ├── config.ts
│       │   │   ├── errors.ts
│       │   │   ├── nonce-generator.ts
│       │   │   ├── nonce.ts
│       │   │   └── redirect.ts
│       │   ├── routes.tsx         # Route definitions
│       │   ├── App.tsx
│       │   ├── firebase.ts
│       │   ├── index.css
│       │   └── main.tsx           # Application entry point
│       ├── dist/                  # Build output
│       ├── package.json
│       ├── vite.config.ts
│       ├── vite.plugin.api.ts    # Custom Vite plugin for API routes
│       ├── tsconfig.json
│       └── env.example
│
├── packages/                      # Shared packages
│   └── firebase-client/          # Firebase client SDK wrapper
│       ├── src/
│       │   ├── amortization.ts
│       │   ├── example-usage.ts
│       │   ├── financial-accounts-example.ts
│       │   ├── financial-accounts-utils.ts
│       │   ├── financial-accounts.ts
│       │   ├── index.ts          # Package entry point
│       │   ├── initialize.ts
│       │   ├── payment-periods.ts
│       │   ├── services.ts
│       │   └── types.ts
│       ├── package.json
│       └── tsconfig.json
│
├── firebase/                      # Firebase configuration
│   ├── firebase.json             # Firebase project configuration
│   ├── firestore.rules           # Firestore security rules
│   ├── firestore.indexes.json    # Firestore index definitions
│   └── storage.rules             # Storage security rules
│
├── docker/                        # Docker configuration for Firebase emulators
│   ├── docker-compose.yml        # Docker Compose configuration
│   ├── Dockerfile.firebase-emulators
│   ├── entrypoint.sh
│   ├── check-emulators.sh
│   ├── cleanup-and-recreate.sh
│   ├── Makefile
│   └── README.md
│
├── scripts/                       # Utility scripts
│
├── docs/                          # Documentation (this file)
│   └── PROJECT_OVERVIEW.md
│
├── package.json                   # Root package.json
├── pnpm-workspace.yaml           # pnpm workspace configuration
├── pnpm-lock.yaml                # Dependency lock file
├── tsconfig.base.json            # Base TypeScript configuration
├── eslint.config.js              # Root ESLint configuration
├── env.example                   # Root environment variables template
└── README.md                     # Project README
```

### Purpose of Each Main Directory

#### `apps/`

Contains all application packages in the monorepo:

- **`app/`**: Main financial accounts management application. Features include account management, payment tracking, amortization calculations, and dashboard visualization. Uses React Router v7 for navigation and Firebase for backend services.
- **`auth-app/`**: Standalone authentication microservice. Handles user authentication, token validation, and provides API endpoints for token verification. Uses Firebase Admin SDK for server-side operations and includes a custom Vite plugin for API route handling.

#### `packages/`

Contains shared packages used across applications:

- **`firebase-client/`**: Centralized Firebase client SDK wrapper. Provides unified Firebase initialization, service exports, and financial account schema/types. Supports both emulator and live Firebase modes based on environment configuration.

#### `firebase/`

Firebase project configuration:

- **`firebase.json`**: Defines Firebase services (Firestore, Storage) and emulator configuration
- **`firestore.rules`**: Security rules for Firestore database
- **`firestore.indexes.json`**: Composite index definitions for Firestore queries
- **`storage.rules`**: Security rules for Firebase Storage

#### `docker/`

Docker configuration for running Firebase emulators in containers:

- Provides isolated Firebase emulator environment
- Includes scripts for setup, verification, and cleanup
- Supports Docker Compose for orchestration

#### `docs/`

Project documentation directory containing comprehensive guides and overviews.

### Entry Points

1. **Main App (`apps/app/src/main.tsx`)**
   - Initializes Firebase
   - Sets up React Router with protected/public routes
   - Wraps application in AuthProvider context
   - Renders root component

2. **Auth App (`apps/auth-app/src/main.tsx`)**
   - Initializes React application
   - Sets up AuthProvider context
   - Renders AppRouter component

3. **Firebase Client Package (`packages/firebase-client/src/index.ts`)**
   - Exports Firebase initialization functions
   - Exports service getters (Auth, Firestore, Storage, Functions)
   - Exports TypeScript types and schemas
   - Exports utility functions for financial accounts

## 2. Frameworks & Core Technologies

### Primary Framework

**React 18.3.1**

- Modern React with hooks and functional components
- Both applications use React for UI rendering
- React Router v7.9.2 for client-side routing

### Language & Version

**TypeScript 5.7.2**

- Strict type checking enabled
- Modern ES2020+ features
- JSX support for React components
- Type-safe development across all packages

### Build Tools

**Vite 6.0.5**

- Fast development server with HMR (Hot Module Replacement)
- Optimized production builds
- Plugin system for extensibility
- **Main App**: Runs on port `5174`
- **Auth App**: Runs on port `5175` with custom API plugin

**Vite Plugins:**

- `@vitejs/plugin-react` (v4.3.1): React support with Fast Refresh
- Custom `vite.plugin.api.ts` (auth-app): Server-side API route handling for token validation

### Package Manager

**pnpm 9.0.0**

- Fast, disk space efficient package manager
- Workspace support for monorepo structure
- Catalog feature for centralized dependency version management
- Node.js >= 18.0.0 required

### Additional Technologies

- **Firebase 11.1.0**: Backend-as-a-Service (Authentication, Firestore, Storage, Functions)
- **Firebase Admin SDK 13.0.1**: Server-side Firebase operations (auth-app only)
- **Recharts 2.15.4**: Charting library for data visualization (main app only)

## 3. Package Dependencies

### Root Dependencies (`package.json`)

#### Dev Dependencies

- **firebase-tools** (^13.0.0): Firebase CLI for deployment and emulator management
- **husky** (^9.1.7): Git hooks for pre-commit checks
- **prettier** (^3.4.2): Code formatter

### Main App Dependencies (`apps/app/package.json`)

#### Runtime Dependencies

- **@rates/firebase-client** (workspace:\*): Shared Firebase client package
- **firebase** (^11.1.0): Firebase JavaScript SDK
- **react** (^18.3.1): React library
- **react-dom** (^18.3.1): React DOM renderer
- **react-router** (^7.9.2): React Router core
- **react-router-dom** (^7.9.2): React Router DOM bindings
- **recharts** (^2.15.4): Charting library for visualizations

#### Dev Dependencies

- **@eslint/js** (^9.17.0): ESLint JavaScript plugin
- **@types/react** (^18.3.12): TypeScript types for React
- **@types/react-dom** (^18.3.1): TypeScript types for React DOM
- **@typescript-eslint/eslint-plugin** (^8.18.0): TypeScript ESLint plugin
- **@typescript-eslint/parser** (^8.18.0): TypeScript parser for ESLint
- **@vitejs/plugin-react** (^4.3.1): Vite plugin for React
- **eslint** (^9.17.0): JavaScript/TypeScript linter
- **eslint-plugin-react-hooks** (^5.1.0): React Hooks linting rules
- **eslint-plugin-react-refresh** (^0.4.12): React Fast Refresh linting
- **globals** (^15.14.0): Global variables for ESLint
- **typescript** (^5.7.2): TypeScript compiler
- **typescript-eslint** (^8.18.0): TypeScript ESLint tooling
- **vite** (^6.0.5): Build tool and dev server

### Auth App Dependencies (`apps/auth-app/package.json`)

#### Runtime Dependencies

- **firebase** (^11.1.0): Firebase JavaScript SDK
- **firebase-admin** (^13.0.1): Firebase Admin SDK for server-side operations
- **react** (^18.3.1): React library
- **react-dom** (^18.3.1): React DOM renderer
- **react-router** (^7.9.2): React Router core
- **react-router-dom** (^7.9.2): React Router DOM bindings

#### Dev Dependencies

- Same as main app, plus:
- **@types/node** (^22.10.2): TypeScript types for Node.js (needed for Firebase Admin)

### Firebase Client Package Dependencies (`packages/firebase-client/package.json`)

#### Runtime Dependencies

- **firebase** (^11.1.0): Firebase JavaScript SDK

#### Dev Dependencies

- **@eslint/js** (^9.17.0): ESLint JavaScript plugin
- **@types/node** (^22.10.2): TypeScript types for Node.js
- **eslint** (^9.17.0): JavaScript/TypeScript linter
- **globals** (^15.14.0): Global variables for ESLint
- **typescript** (^5.7.2): TypeScript compiler
- **typescript-eslint** (^8.18.0): TypeScript ESLint tooling

### Dependency Categories

#### UI Framework

- `react`, `react-dom`: Core React library
- `react-router`, `react-router-dom`: Client-side routing
- `recharts`: Data visualization (main app only)

#### State Management & Context

- React Context API (via `AuthContext` components)
- No external state management library (using React built-in features)

#### Backend Services

- `firebase`: Client-side Firebase SDK
- `firebase-admin`: Server-side Firebase operations (auth-app)
- `@rates/firebase-client`: Shared Firebase wrapper

#### Build & Development Tools

- `vite`: Build tool and dev server
- `@vitejs/plugin-react`: React support for Vite
- `typescript`: TypeScript compiler
- `eslint`, `typescript-eslint`: Linting
- `prettier`: Code formatting
- `husky`: Git hooks

#### Utilities

- All utility functions are custom-built within the project
- No external utility libraries (lodash, date-fns, etc.)

### Version Constraints

- **Node.js**: >= 18.0.0 (specified in `engines`)
- **pnpm**: >= 8.0.0 (specified in `engines`)
- **Package Manager**: pnpm@9.0.0 (specified in `packageManager`)

## 4. Configuration Files

### Root Configuration Files

#### `package.json`

- Defines monorepo scripts for development, building, linting, and Firebase operations
- Contains workspace-level dev dependencies
- Specifies Node.js and pnpm version requirements

#### `pnpm-workspace.yaml`

- Defines workspace structure (`apps/*`, `packages/*`)
- Contains dependency catalog for centralized version management
- Catalog includes React, React Router, Vite, TypeScript, ESLint, and Firebase versions

#### `tsconfig.base.json`

- Base TypeScript configuration shared across all packages
- Target: ES2020
- Module: ESNext
- JSX: react-jsx
- Strict mode enabled
- Bundler module resolution

#### `eslint.config.js`

- Root ESLint configuration using flat config format
- Extends recommended TypeScript ESLint rules
- Configures ignores for build outputs and config files
- Sets up TypeScript-specific linting rules

#### `env.example`

- Template for Firebase configuration
- Emulator port definitions
- Firebase project settings

### Application Configuration Files

#### `apps/app/vite.config.ts`

- Vite configuration for main app
- React plugin enabled
- Dev server: `127.0.0.1:5174`
- Port not strictly enforced (`strictPort: false`)

#### `apps/app/tsconfig.json`

- Extends `tsconfig.base.json`
- Configures path aliases (`@/*` → `./src/*`)
- Includes `src` directory
- References `tsconfig.node.json` for Node.js tooling

#### `apps/app/eslint.config.js`

- Extends root ESLint config
- Adds React-specific rules and plugins
- Type-checked rules enabled
- React Hooks and React Refresh linting

#### `apps/app/env.example`

- Firebase configuration template
- Auth app URL configuration
- Nonce secret for app-to-app communication
- Instructions for setup

#### `apps/auth-app/vite.config.ts`

- Vite configuration for auth app
- React plugin enabled
- Custom API plugin for server-side routes (`vite.plugin.api.ts`)
- Dev server: `127.0.0.1:5175`
- Port not strictly enforced

#### `apps/auth-app/vite.plugin.api.ts`

- Custom Vite plugin for handling `/api/validate` endpoint
- Server-side middleware for token validation
- Uses Firebase Admin SDK for token verification
- Handles CORS preflight requests

#### `apps/auth-app/tsconfig.json`

- Extends `tsconfig.base.json`
- Configures path aliases (`@/*` → `./src/*`)
- Includes Node.js types for Firebase Admin SDK
- References `tsconfig.node.json`

#### `apps/auth-app/env.example`

- Firebase configuration template
- Firebase Admin SDK configuration options
- Redirect handling configuration
- Cookie handling settings
- Emulator and production mode settings

### Package Configuration Files

#### `packages/firebase-client/package.json`

- Package name: `@rates/firebase-client`
- Type: module
- Main entry: `./src/index.ts`
- Exports TypeScript types

#### `packages/firebase-client/tsconfig.json`

- Extends `tsconfig.base.json`
- Standard TypeScript configuration for library

### Firebase Configuration Files

#### `firebase/firebase.json`

- Firestore rules path: `firestore.rules`
- Firestore indexes path: `firestore.indexes.json`
- Storage rules path: `storage.rules`
- Emulator configuration:
  - Auth: port `9099`
  - Firestore: port `8080`
  - Storage: port `9199`
  - UI: port `4000`
  - Single project mode enabled

#### `firebase/firestore.rules`

- Security rules for Firestore database
- Defines access control for collections

#### `firebase/firestore.indexes.json`

- Composite index definitions
- Required for complex Firestore queries

#### `firebase/storage.rules`

- Security rules for Firebase Storage
- Defines access control for file uploads

### Docker Configuration Files

#### `docker/docker-compose.yml`

- Docker Compose configuration for Firebase emulators
- Service definitions and networking

#### `docker/Dockerfile.firebase-emulators`

- Docker image for Firebase emulators
- Base image and emulator setup

#### `docker/env.docker.example`

- Environment variables template for Docker setup

### Custom Configurations

1. **Path Aliases**: Both apps use `@/*` alias pointing to `./src/*` for cleaner imports
2. **Port Configuration**:
   - Main app: `5174`
   - Auth app: `5175`
   - Firebase Emulator UI: `4000`
3. **TypeScript Strict Mode**: Enabled across all packages with strict type checking
4. **ESLint Type-Checked Rules**: Enabled in app configurations for enhanced type safety
5. **Custom Vite Plugin**: Auth app includes server-side API route handling via custom plugin
6. **Workspace Dependencies**: Main app uses `@rates/firebase-client` as a workspace dependency

---

## Quick Reference

### Development Commands

- `pnpm dev` - Start main app dev server
- `pnpm dev:auth-app` - Start auth app dev server
- `pnpm lint` - Lint all packages
- `pnpm type-check` - Type check all packages
- `pnpm firebase:emulators` - Start Firebase emulators

### Build Commands

- `pnpm build` - Build main app
- `pnpm build:auth-app` - Build auth app

### Docker Commands

- `pnpm docker:emulators:up` - Start emulators in Docker
- `pnpm docker:emulators:down` - Stop emulators
- `pnpm docker:emulators:logs` - View emulator logs

---

_Last updated: Generated from project analysis_
