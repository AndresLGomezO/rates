# GCP CI/CD (GitHub Actions) — OIDC/WIF, Artifact Registry, Cloud Run (Monorepo)

This repo is a pnpm monorepo with multiple deployable apps under `apps/*`.
This document describes a production-grade CI/CD design using:

- **GitHub Actions** as the orchestrator
- **Workload Identity Federation (OIDC)** for auth to Google Cloud (**no service account keys**)
- **Artifact Registry** for container images
- **Cloud Run** for deployment (design also supports GKE)
- **Monorepo-aware** selective builds/deploys via path filters and a matrix strategy

## Security model (PCA-style)

- **No long-lived secrets**: GitHub obtains a short-lived OIDC token per job, exchanged for a short-lived Google access token via Workload Identity Federation.
- **Least privilege**:
  - Separate **deployer service accounts per environment** (e.g. `github-ci-dev`, `github-ci-prod`).
  - Bind each SA to only the intended GitHub repo, and restrict prod to the `main` branch.
  - Grant only the exact IAM roles needed to push images + deploy.
- **Environment isolation**:
  - Separate GCP projects and Artifact Registry repositories per environment is recommended (or at least separate repos + service accounts).
  - GitHub **Environments** (e.g. `production`) provide **manual approvals** and an auditable deployment boundary.

## GitHub Actions workflows in this repo

- `/.github/workflows/ci.yml`
  - Triggers on PRs
  - Runs: format check, lint, type-check, optional tests
  - Builds only affected apps
- `/.github/workflows/deploy.yml`
  - Triggers on push to `main`
  - Uses OIDC/WIF to authenticate to GCP
  - Builds & pushes only affected images to Artifact Registry (tagged with `github.sha`)
  - Deploys the corresponding Cloud Run service

## GCP setup (commands)

The commands below are designed to be copy/pasted, but you must substitute:

- `PROJECT_ID`
- `PROJECT_NUMBER`
- `REGION` (e.g. `us-central1`)
- `GITHUB_OWNER`, `GITHUB_REPO` (e.g. `andresgomezortiz`, `rates`)
- `POOL_ID`, `PROVIDER_ID` (recommended: `github-pool`, `github-provider`)
- service account emails per env

### 1) Enable required APIs

```bash
gcloud services enable \
  iamcredentials.googleapis.com \
  iam.googleapis.com \
  run.googleapis.com \
  artifactregistry.googleapis.com
```

### 2) Create a regional Artifact Registry repo (per env)

```bash
gcloud artifacts repositories create rates \
  --repository-format=docker \
  --location=us-central1 \
  --description="Rates container images (prod)"
```

### 3) Create a Workload Identity Pool + Provider (GitHub OIDC)

Create the pool:

```bash
gcloud iam workload-identity-pools create github-pool \
  --location="global" \
  --display-name="GitHub Actions Pool"
```

Create the provider (GitHub is the OIDC issuer):

```bash
gcloud iam workload-identity-pools providers create-oidc github-provider \
  --location="global" \
  --workload-identity-pool="github-pool" \
  --display-name="GitHub Actions Provider" \
  --issuer-uri="https://token.actions.githubusercontent.com" \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.ref=assertion.ref,attribute.actor=assertion.actor" \
  --attribute-condition="assertion.repository=='GITHUB_OWNER/GITHUB_REPO'"
```

Why these mappings:

- `attribute.repository` and `attribute.ref` allow IAM conditions like “only this repo” and “only main branch”.
- The provider-level condition blocks federation from any other repo at the door.

### 4) Create per-environment deployer service accounts

Prod deployer:

```bash
gcloud iam service-accounts create github-ci-prod \
  --display-name="GitHub Actions Deployer (prod)"
```

Dev deployer (optional but recommended):

```bash
gcloud iam service-accounts create github-ci-dev \
  --display-name="GitHub Actions Deployer (dev)"
```

### 5) Bind GitHub identities to each service account (repo + branch restricted)

Define convenience vars:

```bash
PROJECT_ID="your-prod-project-id"
PROJECT_NUMBER="123456789012"
POOL_ID="github-pool"
PROVIDER_ID="github-provider"
GITHUB_REPO="GITHUB_OWNER/GITHUB_REPO"
```

Prod: allow only `refs/heads/main`:

```bash
gcloud iam service-accounts add-iam-policy-binding \
  "github-ci-prod@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL_ID}/attribute.repository/${GITHUB_REPO}" \
  --condition="expression=attribute.ref=='refs/heads/main',title=github-main-only,description=Only allow federation from main branch"
```

Dev example: allow only `refs/heads/develop`:

```bash
gcloud iam service-accounts add-iam-policy-binding \
  "github-ci-dev@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL_ID}/attribute.repository/${GITHUB_REPO}" \
  --condition="expression=attribute.ref=='refs/heads/develop',title=github-develop-only,description=Only allow federation from develop branch"
```

Notes:

- We bind to a `principalSet` scoped to the repo via `attribute.repository`.
- The IAM condition further restricts to a specific branch ref.
- If you want to support tags or release branches, extend the condition with additional allowed refs.

## IAM roles (least privilege examples)

Attach these roles to the **GitHub deployer service account** (e.g. `github-ci-prod@...`).

### Artifact Registry (push images)

Repo-level (preferred):

```bash
gcloud artifacts repositories add-iam-policy-binding rates \
  --location=us-central1 \
  --member="serviceAccount:github-ci-prod@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.writer"
```

### Cloud Run (deploy services)

Minimal practical set:

- **`roles/run.developer`** on the project (or a folder-level scope if you have one)
- **`roles/iam.serviceAccountUser`** on the **runtime** service account used by the Cloud Run service
  - Needed so the deployer can “actAs” that runtime identity during deploy

Project-level Cloud Run deploy:

```bash
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:github-ci-prod@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/run.developer"
```

If your Cloud Run service uses a dedicated runtime SA (recommended):

```bash
RUNTIME_SA="cloud-run-runtime@${PROJECT_ID}.iam.gserviceaccount.com"
gcloud iam service-accounts add-iam-policy-binding "${RUNTIME_SA}" \
  --member="serviceAccount:github-ci-prod@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"
```

If you also need to set Cloud Run IAM (public invoker, etc.), add narrowly scoped permissions via:

- `roles/run.admin` (stronger; avoid if you can)
- or manage IAM separately (recommended) with infra tooling and keep the deployer at `run.developer`.

## Deploy workflow configuration (what to change)

In `/.github/workflows/deploy.yml`, set:

- `GCP_PROJECT_ID`
- `GCP_REGION`
- `AR_REPOSITORY`
- `WIF_PROVIDER` (full provider resource name)
- `WIF_SERVICE_ACCOUNT` (deployer SA email)
- Cloud Run service names (`CLOUD_RUN_SERVICE_*`)

## GKE support (design notes)

This design intentionally keeps the image build + push identical for Cloud Run and GKE.
To deploy to GKE instead of Cloud Run:

- Grant the deployer SA the minimum roles to fetch cluster credentials and apply manifests (typically `roles/container.developer` plus RBAC in-cluster).
- Add a deploy step:
  - `gcloud container clusters get-credentials ...`
  - `kubectl set image ...` or `helm upgrade ...`

The same Workload Identity Federation setup applies; only the “deploy step” changes.

## How to add a new deployable service

1. Create `apps/<new-service>/Dockerfile` (multi-stage build) and, if needed, `nginx.conf`.
2. Update `/.github/workflows/ci.yml`:
   - Add a new paths-filter entry.
   - Add a new matrix entry for builds.
3. Update `/.github/workflows/deploy.yml`:
   - Add a new paths-filter entry.
   - Add a new matrix include item with:
     - `dockerfile`
     - `image_name`
     - `cloud_run_service` (or GKE workload name)
4. Create the Cloud Run service (or GKE workload) once, then let CI/CD update it.
