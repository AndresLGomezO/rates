# 🗺️ INFRASTRUCTURE PROVISIONING PLAN

## Overview

- **Total Steps**: 24
- **Estimated Completion**: 6 phases
- **Dependencies Map**: See dependency graph below
- **💰 Cost Profile**: FREE TIER DEFAULT (paid features opt-in)
- **📌 Terraform Version**: >= 1.6.0, recommended 1.9.8
- **📌 Google Provider Version**: ~> 6.14.0 (6.14.1)

## Step Prioritization Criteria

1. Foundation resources first (project, APIs)
2. Security infrastructure early (IAM, WIF)
3. Dependent services after their dependencies
4. Configuration/outputs last
5. **FREE TIER resources before paid alternatives**

---

## Detailed Step Breakdown

### PHASE 1: Foundation & Configuration [Steps 1-4]

├── Step 1.1: Core Terraform Configuration
│ ├── Files: `versions.tf`, `backend.tf`, `locals.tf`
│ ├── Dependencies: None (foundation)
│ ├── Outputs: Provider configuration, version constraints
│ ├── Priority: CRITICAL
│ ├── 💰 Cost: FREE
│ └── 📌 Versions: Terraform >= 1.6.0, Google ~> 6.14.0
│
├── Step 1.2: Input Variables with FREE TIER Defaults
│ ├── Files: `variables.tf`
│ ├── Dependencies: Step 1.1
│ ├── Outputs: Variable definitions with validation
│ ├── Priority: CRITICAL
│ ├── 💰 Cost: FREE (variables only)
│ └── 📌 Versions: Terraform >= 1.6.0 (for validation blocks)
│
├── Step 1.3: Project Module (Greenfield/Brownfield Support)
│ ├── Files: `modules/project/main.tf`, `modules/project/variables.tf`, `modules/project/outputs.tf`
│ ├── Dependencies: Step 1.2
│ ├── Outputs: Project ID, project number, billing status
│ ├── Priority: CRITICAL
│ ├── 💰 Cost: FREE (project creation is free)
│ └── 📌 Versions: Google provider ~> 6.14.0
│
└── Step 1.4: API Enablement with Propagation Handling
├── Files: `modules/project/apis.tf`
├── Dependencies: Step 1.3
├── Outputs: Enabled APIs, propagation delay resource
├── Priority: CRITICAL
├── 💰 Cost: FREE (enabling APIs is free, usage may cost)
└── 📌 Versions: Google provider ~> 6.14.0, Time provider ~> 0.12.0

---

### PHASE 2: Security Infrastructure [Steps 5-8]

├── Step 2.1: Service Accounts Module
│ ├── Files: `modules/iam/main.tf`, `modules/iam/variables.tf`, `modules/iam/outputs.tf`
│ ├── Dependencies: Step 1.4 (APIs enabled)
│ ├── Outputs: Service account emails, IDs
│ ├── Priority: CRITICAL
│ ├── 💰 Cost: FREE
│ └── 📌 Versions: Google provider ~> 6.14.0
│
├── Step 2.2: Workload Identity Federation Module
│ ├── Files: `modules/workload-identity/main.tf`, `modules/workload-identity/variables.tf`, `modules/workload-identity/outputs.tf`
│ ├── Dependencies: Step 2.1 (service accounts)
│ ├── Outputs: WIF pool name, provider name, GitHub Actions config
│ ├── Priority: CRITICAL
│ ├── 💰 Cost: FREE
│ └── 📌 Versions: Google provider ~> 6.14.0
│
├── Step 2.3: IAM Bindings (Least Privilege)
│ ├── Files: `modules/iam/bindings.tf`
│ ├── Dependencies: Step 2.1, Step 2.2
│ ├── Outputs: IAM member configurations
│ ├── Priority: HIGH
│ ├── 💰 Cost: FREE
│ └── 📌 Versions: Google provider ~> 6.14.0
│
└── Step 2.4: Secret Manager Base Configuration
├── Files: `modules/secrets/main.tf`, `modules/secrets/variables.tf`, `modules/secrets/outputs.tf`
├── Dependencies: Step 1.4 (Secret Manager API)
├── Outputs: Secret IDs, secret versions
├── Priority: HIGH
├── 💰 Cost: FREE (up to 6 versions, 10K accesses/month)
└── 📌 Versions: Google provider ~> 6.14.0

---

### PHASE 3: Firebase Services [Steps 9-13]

├── Step 3.1: Firebase Project Linking
│ ├── Files: `modules/firebase/main.tf`
│ ├── Dependencies: Step 1.4 (Firebase API)
│ ├── Outputs: Firebase project ID, project number
│ ├── Priority: CRITICAL
│ ├── 💰 Cost: FREE
│ └── 📌 Versions: Google-beta provider ~> 6.14.0
│
├── Step 3.2: Identity Platform (Firebase Auth)
│ ├── Files: `modules/firebase/auth.tf`
│ ├── Dependencies: Step 3.1
│ ├── Outputs: Auth config, OAuth providers
│ ├── Priority: CRITICAL
│ ├── 💰 Cost: FREE (up to 50K MAU)
│ └── 📌 Versions: Google provider ~> 6.14.0
│
├── Step 3.3: Cloud Firestore Database
│ ├── Files: `modules/firebase/firestore.tf`
│ ├── Dependencies: Step 3.1, Step 1.4 (Firestore API)
│ ├── Outputs: Database name, location, PITR status
│ ├── Priority: CRITICAL
│ ├── 💰 Cost: FREE TIER (1GB storage, 50K reads/day, 20K writes/day)
│ └── 📌 Versions: Google provider ~> 6.14.0
│
├── Step 3.4: Firebase App Check
│ ├── Files: `modules/firebase/app_check.tf`
│ ├── Dependencies: Step 3.1
│ ├── Outputs: App Check config, enforcement mode
│ ├── Priority: MEDIUM
│ ├── 💰 Cost: FREE
│ └── 📌 Versions: Google-beta provider ~> 6.14.0
│
└── Step 3.5: Firebase Secrets & IAM
├── Files: `modules/firebase/secrets.tf`
├── Dependencies: Step 3.1, Step 2.4
├── Outputs: Firebase config secret ID
├── Priority: HIGH
├── 💰 Cost: FREE (within Secret Manager limits)
└── 📌 Versions: Google provider ~> 6.14.0

---

### PHASE 4: GCP Services [Steps 14-17]

├── Step 4.1: Artifact Registry Module
│ ├── Files: `modules/artifact-registry/main.tf`, `modules/artifact-registry/variables.tf`, `modules/artifact-registry/outputs.tf`
│ ├── Dependencies: Step 1.4 (Artifact Registry API)
│ ├── Outputs: Repository URL, cleanup policies
│ ├── Priority: HIGH
│ ├── 💰 Cost: FREE (up to 0.5GB storage)
│ └── 📌 Versions: Google provider ~> 6.14.0
│
├── Step 4.2: Cloud Run Infrastructure Module
│ ├── Files: `modules/cloud-run/main.tf`, `modules/cloud-run/service_account.tf`, `modules/cloud-run/variables.tf`, `modules/cloud-run/outputs.tf`
│ ├── Dependencies: Step 2.1 (service accounts), Step 1.4 (Cloud Run API)
│ ├── Outputs: Service account, IAM bindings, FREE TIER config
│ ├── Priority: CRITICAL
│ ├── 💰 Cost: FREE TIER (scale to zero, 2M requests/month, 360K GB-seconds)
│ └── 📌 Versions: Google provider ~> 6.14.0
│
├── Step 4.3: Application Secrets Module
│ ├── Files: `modules/secrets/app_secrets.tf`
│ ├── Dependencies: Step 2.4, Step 3.5
│ ├── Outputs: Secret IDs, access bindings
│ ├── Priority: HIGH
│ ├── 💰 Cost: FREE (within limits)
│ └── 📌 Versions: Google provider ~> 6.14.0
│
└── Step 4.4: Cross-Service IAM Bindings
├── Files: `modules/iam/cross_service.tf`
├── Dependencies: Step 4.2, Step 4.3
├── Outputs: IAM member bindings
├── Priority: HIGH
├── 💰 Cost: FREE
└── 📌 Versions: Google provider ~> 6.14.0

---

### PHASE 5: Integration & Outputs [Steps 18-20]

├── Step 5.1: Root Module Orchestration
│ ├── Files: `main.tf`
│ ├── Dependencies: All previous modules
│ ├── Outputs: Module invocations, dependencies
│ ├── Priority: CRITICAL
│ ├── 💰 Cost: FREE (orchestration only)
│ └── 📌 Versions: All providers from Step 1.1
│
├── Step 5.2: Outputs with Cost Summary
│ ├── Files: `outputs.tf`
│ ├── Dependencies: Step 5.1
│ ├── Outputs: All resource outputs, cost summary, GitHub Actions config
│ ├── Priority: CRITICAL
│ ├── 💰 Cost: FREE (outputs only)
│ └── 📌 Versions: Terraform >= 1.6.0
│
└── Step 5.3: Validation Checks & Brownfield Support
├── Files: `checks.tf`, `imports.tf`
├── Dependencies: Step 5.1
├── Outputs: Validation results, import blocks
├── Priority: HIGH
├── 💰 Cost: FREE (validation only)
└── 📌 Versions: Terraform >= 1.5.0 (checks), >= 1.5.0 (imports)

---

### PHASE 6: Scripts & Documentation [Steps 21-24]

├── Step 6.1: Interactive Setup Script
│ ├── Files: `scripts/setup.sh`
│ ├── Dependencies: None (standalone)
│ ├── Outputs: `terraform.tfvars` file
│ ├── Priority: HIGH
│ ├── 💰 Cost: FREE (script only)
│ └── 📌 Versions: Bash 5.0+, gcloud >= 450.0.0, terraform >= 1.6.0
│
├── Step 6.2: Validation & Utility Scripts
│ ├── Files: `scripts/validate.sh`, `scripts/outputs-to-env.sh`, `scripts/cost-estimate.sh`
│ ├── Dependencies: Step 6.1
│ ├── Outputs: Validation results, .env files, cost estimates
│ ├── Priority: MEDIUM
│ ├── 💰 Cost: FREE
│ └── 📌 Versions: Bash 5.0+, gcloud >= 450.0.0
│
├── Step 6.3: GitHub Actions Integration
│ ├── Files: `scripts/github-secrets.sh`, `modules/workload-identity/github-actions-example.yml`
│ ├── Dependencies: Step 2.2 (WIF)
│ ├── Outputs: GitHub secrets, workflow example
│ ├── Priority: HIGH
│ ├── 💰 Cost: FREE
│ └── 📌 Versions: GitHub CLI >= 2.40.0, Actions pinned (v4.2.2, v2.1.7, etc.)
│
└── Step 6.4: Documentation Suite
├── Files: `README.md`, `VARIABLES.md`, `ARCHITECTURE.md`, `SECURITY.md`, `COSTS.md`, `VERSIONS.md`
├── Dependencies: All previous steps
├── Outputs: Complete documentation
├── Priority: HIGH
├── 💰 Cost: FREE
└── 📌 Versions: Markdown documentation

---

## Dependency Graph

```
Step 1.1 (versions.tf)
  └─> Step 1.2 (variables.tf)
      └─> Step 1.3 (project module)
          └─> Step 1.4 (APIs)
              ├─> Step 2.1 (service accounts)
              │   └─> Step 2.2 (WIF)
              │       └─> Step 2.3 (IAM bindings)
              ├─> Step 2.4 (secrets base)
              ├─> Step 3.1 (Firebase project)
              │   ├─> Step 3.2 (Identity Platform)
              │   ├─> Step 3.3 (Firestore)
              │   ├─> Step 3.4 (App Check)
              │   └─> Step 3.5 (Firebase secrets)
              ├─> Step 4.1 (Artifact Registry)
              ├─> Step 4.2 (Cloud Run)
              │   └─> Step 4.4 (cross-service IAM)
              └─> Step 4.3 (app secrets)
                  └─> Step 4.4 (cross-service IAM)
                      └─> Step 5.1 (root module)
                          ├─> Step 5.2 (outputs)
                          └─> Step 5.3 (checks)
                              └─> Step 6.1-6.4 (scripts & docs)
```

---

## Risk Points

| Risk                             | Mitigation                          | Step     |
| -------------------------------- | ----------------------------------- | -------- |
| API propagation delays           | Use `time_sleep` resource (90s)     | 1.4      |
| Firestore location immutable     | Validate early, document clearly    | 3.3      |
| WIF pool name conflicts          | Include environment in name         | 2.2      |
| Billing account not linked       | Validate in setup script            | 6.1      |
| GitHub repo format invalid       | Regex validation in variables       | 1.2      |
| Free tier limits exceeded        | Aggressive cleanup policies, checks | 4.1, 5.3 |
| Service account key creation     | Explicitly forbid, use WIF only     | 2.2      |
| Paid features enabled by default | FREE TIER defaults, explicit opt-in | 1.2      |

---

## 💰 Cost Summary

### Free Tier Resources (Default Configuration)

- **GCP Project: FREE**
- **Cloud Run**: Scale to zero (0 min instances) = FREE
  - 2 million requests/month
  - 360,000 GB-seconds memory
  - 180,000 vCPU-seconds
- **Cloud Firestore**: FREE TIER
  - 1 GB storage
  - 50,000 reads/day
  - 20,000 writes/day
  - 20,000 deletes/day
- **Artifact Registry**: FREE up to 0.5GB
- **Secret Manager**: FREE
  - 6 active secret versions
  - 10,000 access operations/month
- **Identity Platform**: FREE up to 50,000 MAU
- **Workload Identity Federation**: FREE
- **Cloud Logging**: FREE up to 50GB/month

### Opt-in Paid Resources (Requires `enable_free_tier_only=false`)

- **Firestore PITR**: ~$0.10/GB/month (disabled by default)
- **Firestore Backups**: Variable cost (disabled by default)
- **Cloud Run Always-On**: Variable (min_instances > 0, disabled by default)
- **SMS MFA**: After 10 SMS/day (disabled by default)

### Estimated Monthly Cost

- **Default (FREE TIER)**: **$0**
- **With all paid features**: Variable (use GCP pricing calculator)

---

## 📌 Version Pinning Summary

### Core Tools

- **Terraform**: >= 1.6.0, < 2.0.0 (recommended: 1.9.8)
- **gcloud CLI**: >= 450.0.0 (recommended: 503.0.0)
- **GitHub CLI**: >= 2.40.0 (recommended: 2.63.0)

### Terraform Providers

- **hashicorp/google**: ~> 6.14.0 (6.14.1)
- **hashicorp/google-beta**: ~> 6.14.0 (6.14.1)
- **hashicorp/random**: ~> 3.6.0 (3.6.3)
- **hashicorp/time**: ~> 0.12.0 (0.12.1)
- **hashicorp/null**: ~> 3.2.0 (3.2.3)

### GitHub Actions

- **actions/checkout**: v4.2.2
- **google-github-actions/auth**: v2.1.7
- **google-github-actions/setup-gcloud**: v2.1.2
- **google-github-actions/deploy-cloudrun**: v2.7.2
- **docker/setup-buildx-action**: v3.7.1
- **docker/build-push-action**: v6.10.0

---

## Verification Checkpoints

After each phase, verify:

- [ ] **Phase 1**: `terraform init` succeeds, providers download correctly
- [ ] **Phase 2**: Service accounts created, WIF pool active
- [ ] **Phase 3**: Firebase project linked, Firestore database created
- [ ] **Phase 4**: Artifact Registry accessible, Cloud Run service account ready
- [ ] **Phase 5**: `terraform plan` shows no errors, outputs valid
- [ ] **Phase 6**: Scripts executable, documentation complete

---

## Next Steps

**Ready to begin Step 1.1**: Core Terraform Configuration

Type `go` to proceed to Step 1.1, or use:

- `plan` - Show this plan again
- `status` - Show current progress
- `skip` - Skip to next step (not recommended for first run)
