# Documentation Index

This repo intentionally keeps docs in a few “homes” to avoid Markdown files scattered everywhere:

- Root-level docs: **project entry points / setup**
- `docs/`: **shared engineering docs** (architecture, styling, integrations, etc.)
- `apps/*/README.md`: **app-specific docs** (how to run + app-specific behavior)
- `packages/*/README.md`: **package-specific docs** (APIs + usage)
- `docker/README.md`: **dockerized emulator workflow**

---

## Start here

- `README.md`: monorepo overview + commands
- `QUICKSTART.md`: fastest local setup for both apps + emulators

---

## Apps

- `apps/app/README.md`: main SPA (accounts, payments, amortization) + auth integration + token validation + migration
- `apps/auth-app/README.md`: auth SPA + nonce flow + Firebase Admin token validation endpoint

---

## Shared engineering docs (`docs/`)

- `docs/PROJECT_OVERVIEW.md`: comprehensive (and somewhat “generated”) overview of structure + tooling
- `docs/INTEGRATIONS.md`: integrations overview + links to subpages
  - `docs/integrations/Firebase.md`: Firebase + emulator configuration and env vars
- `docs/STATE_MANAGEMENT.md`: state patterns and conventions
- `docs/UTILITIES.md`: utilities catalog + usage patterns
- `docs/COMPONENTS.md`: UI/components documentation
- `docs/STYLING.md`: Tailwind + theme rules and patterns
- `docs/TESTING.md`: how to test
- `docs/DEPLOYMENT.md`: deployment and environments
- `docs/CICD_GITHUB_ACTIONS_GCP.md`: CI/CD + GCP WIF/OIDC

Tailwind audit/history docs (optional to keep as separate files):

- `docs/TAILWIND_SETUP.md`
- `docs/TAILWIND_MAPPING_STRATEGY.md`
- `docs/TAILWIND_COLOR_MAPPING.md`
- `docs/CSS_AUDIT.md`
- `docs/TAILWIND_CLEANUP_REPORT.md`

---

## Docker emulators (`docker/`)

- `docker/README.md`: full Docker emulator setup + troubleshooting
- `docker/QUICKSTART.md`: short form quickstart (candidate to merge into `docker/README.md`)
- `docker/VERIFICATION.md`: verification checklist
- `docker/CLEANUP.md`: cleanup / reset instructions

---

## Cleanup helpers

- `docs/DOCUMENTATION_CLEANUP_PLAN.md`: historical plan (currently out-of-date; candidate to update or delete)
