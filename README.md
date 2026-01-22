# Rates Monorepo

A monorepo structure for multiple applications using pnpm workspaces. This serves as a model project structure that can be used as a base for implementing different applications using branches.

## Structure

```
rates/
├── apps/
│   └── app/          # React application with React Router v7
├── packages/
│   └── firebase-client/  # Firebase client SDK wrapper
├── firebase/
│   ├── firebase.json     # Firebase configuration
│   ├── firestore.rules   # Firestore security rules
│   └── firestore.indexes.json  # Firestore indexes
├── package.json      # Root package.json
├── pnpm-workspace.yaml
└── README.md
```

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0

### Installation

Install dependencies for all workspaces:

```bash
pnpm install
```

### Development

Run the development server for the app:

```bash
pnpm dev
```

Or run from the root:

```bash
pnpm --filter app dev
```

### Building

Build the app:

```bash
pnpm build
```

### Preview

Preview the production build:

```bash
pnpm preview
```

### Linting

Run ESLint:

```bash
pnpm lint
```

## Adding New Applications

To add a new application:

1. Create a new directory under `apps/` (e.g., `apps/new-app`)
2. Initialize your application in that directory
3. The workspace will automatically include it via `pnpm-workspace.yaml`
4. Add scripts to the root `package.json` if needed

## Dependency Version Management

This monorepo is configured to use pnpm's **catalog** feature to centralize dependency versions. All library versions are defined in `pnpm-workspace.yaml` for reference.

**Note**: Due to a known issue with pnpm 9.0.0 catalog resolution, we're currently using direct version numbers in `package.json` files as a workaround. See `CATALOG_ISSUE.md` for details. The catalog is maintained for future use when this issue is resolved.

### Benefits

- **Consistency**: All applications use the same versions of shared dependencies
- **Easy Updates**: Update a version once in the catalog, and all apps automatically use it
- **Reduced Conflicts**: Centralized version management reduces merge conflicts
- **Best Practice**: Aligns with pnpm's recommended monorepo structure

### How It Works

1. **Versions are defined in `pnpm-workspace.yaml`**:

   ```yaml
   catalog:
     react: ^18.3.1
     react-router: ^7.9.2
     # ... etc
   ```

2. **Applications reference catalog versions**:

   ```json
   {
     "dependencies": {
       "react": "catalog:",
       "react-router": "catalog:"
     }
   }
   ```

3. **To update a dependency**: Simply change the version in `pnpm-workspace.yaml` and run `pnpm install`

### Cataloged Dependencies

The following dependencies are centralized in the catalog:

- **React ecosystem**: `react`, `react-dom`, `@types/react`, `@types/react-dom`
- **React Router v7**: `react-router`, `react-router-dom`
- **Build tools**: `vite`, `@vitejs/plugin-react`
- **TypeScript**: `typescript`
- **ESLint**: `eslint`, `@eslint/js`, `typescript-eslint`, and all ESLint plugins
- **Firebase**: `firebase`, `@types/node`

## Technologies

- **pnpm** - Package manager with workspace support
- **React 18.3** - UI library
- **React Router v7.9.2** - Routing library (latest stable)
- **Vite 6** - Build tool and dev server
- **TypeScript 5.7** - Type safety
- **ESLint 9** - Code linting
- **Firebase 11.1** - Backend services (Auth, Firestore, Storage, Functions)

## Firebase Setup

This monorepo includes a global Firebase service package (`@rates/firebase-client`) that supports both emulator and live modes.

### Quick Start

1. **Install dependencies**:

   ```bash
   pnpm install
   ```

2. **Set up environment variables**:
   - Copy `env.example` to `.env.local`
   - Fill in your Firebase project configuration

3. **Start Firebase emulators** (for local development):

   ```bash
   pnpm firebase:emulators
   ```

4. **Use Firebase in your app**:

   ```typescript
   import {
     initializeFirebase,
     getAuth,
     getFirestore,
   } from '@rates/firebase-client';

   // Initialize Firebase (in your app entry point)
   initializeFirebase();

   // Use services
   const auth = getAuth();
   const firestore = getFirestore();
   ```

### Firebase Scripts

- `pnpm firebase:emulators` - Start Firebase emulators
- `pnpm firebase:deploy` - Deploy Firebase configuration
- `pnpm firebase:deploy:rules` - Deploy Firestore rules only
- `pnpm firebase:deploy:indexes` - Deploy Firestore indexes only

### Environment Variables

See `env.example` for all available environment variables. Key variables:

- `VITE_FIREBASE_API_KEY` - Firebase API key
- `VITE_FIREBASE_PROJECT_ID` - Firebase project ID
- `VITE_USE_FIREBASE_EMULATOR` - Set to `true` to use emulators

### Documentation

For detailed Firebase usage, see:

- `packages/firebase-client/README.md` - Complete API documentation
- `packages/firebase-client/src/example-usage.ts` - Usage examples

## Infrastructure as Code

This repository includes Terraform configuration for automated infrastructure provisioning on Google Cloud Platform.

### Quick Start

1. **Configure Terraform**:

   ```bash
   cd iaac
   cp terraform.tfvars.example terraform.tfvars
   # Edit terraform.tfvars with your values
   ```

2. **Run Setup Script**:

   ```bash
   ./scripts/setup.sh
   ```

3. **Deploy Infrastructure**:
   ```bash
   terraform apply
   ```

### Features

- ✅ **GCP Project** - Automated project creation
- ✅ **Firebase** - Firestore, Auth, App Check
- ✅ **Cloud Run** - Serverless container hosting (FREE TIER optimized)
- ✅ **Artifact Registry** - Container image repository
- ✅ **GitHub Actions** - Automated deployment pipeline with keyless authentication
- ✅ **Secret Manager** - Secure configuration storage

### Documentation

- [Infrastructure README](./iaac/README.md) - Infrastructure overview
- [GitHub Actions Setup](./docs/GITHUB_ACTIONS_SETUP.md) - Deployment pipeline setup
- [Dynamic Configuration](./docs/DYNAMIC_CONFIG.md) - Configuration management

## Using Branches

This monorepo is designed to be used as a base structure. You can create branches for different application implementations:

1. Create a new branch from main
2. Modify or extend the `apps/app` application
3. Or create new applications under `apps/`
4. Each branch can represent a different application or feature set

## CI/CD (GCP + GitHub Actions, OIDC/WIF)

This repo includes production-ready GitHub Actions workflows that:

- Run **PR validation** (format, lint, type-check, build) in a **monorepo-aware** way (only affected apps build)
- Deploy on **push to `main`** using **Workload Identity Federation (OIDC)** (no service account keys)
- Build/push container images to **Artifact Registry** and deploy to **Cloud Run**

See `docs/CICD_GITHUB_ACTIONS_GCP.md` for:

- The **security model** (least privilege, repo/branch-restricted identity binding)
- **GCP setup commands** (WIF pool/provider + per-env service accounts + IAM)
- How to add a new deployable service
