# Rates Monorepo

A monorepo structure for multiple applications using pnpm workspaces. This serves as a model project structure that can be used as a base for implementing different applications using branches.

## Structure

```
rates/
├── apps/
│   └── app/          # React application with React Router v7
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

This monorepo uses pnpm's **catalog** feature to centralize dependency versions. All library versions are defined in `pnpm-workspace.yaml` and referenced in each application's `package.json` using the `catalog:` protocol.

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

## Technologies

- **pnpm** - Package manager with workspace support
- **React 18.3** - UI library
- **React Router v7.9.2** - Routing library (latest stable)
- **Vite 6** - Build tool and dev server
- **TypeScript 5.7** - Type safety
- **ESLint 9** - Code linting

## Using Branches

This monorepo is designed to be used as a base structure. You can create branches for different application implementations:

1. Create a new branch from main
2. Modify or extend the `apps/app` application
3. Or create new applications under `apps/`
4. Each branch can represent a different application or feature set

