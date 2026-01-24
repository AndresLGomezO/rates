# Artifact Registry: Why It Fails & Impact of Removal

## Why It's Still Failing

**Root Cause:** This is a **GCP Artifact Registry API backend issue**, not a Terraform problem. Even manual `gcloud` commands fail with the same error.

**Evidence:**

- Manual `gcloud artifacts repositories create` command fails with "Error code 5: Requested entity was not found"
- This happens even when the API is enabled and permissions are correct
- The dev repository was successfully created earlier, proving the API works
- Now even dev fails, suggesting a GCP backend issue or quota problem

**Possible Causes:**

1. **GCP backend propagation delay** - API backend not fully ready
2. **Free tier quota limit** - May only allow 1 repository per location/project
3. **Temporary GCP service outage** in us-central1
4. **Project-level quota/limit** reached

## What Artifact Registry Is Used For

Artifact Registry stores **Docker container images** that are deployed to Cloud Run. Here's the dependency chain:

```
Artifact Registry Repository
    ↓
Container Image URL (e.g., us-central1-docker.pkg.dev/dev-rates/rates-dev-containers/api:latest)
    ↓
Cloud Run Service (deploys from this image)
    ↓
Your Application (runs in Cloud Run)
```

**Specific Dependencies:**

1. **Cloud Run Service** (`infra/environments/application/dev/main.tf:71`)
   - Uses: `container_image = "${local.artifact_registry_url}/api:${var.container_image_tag}"`
   - **Impact:** Cloud Run **CANNOT deploy** without a container image URL

2. **Cloud Build CI/CD** (`infra/environments/application/dev/cloudbuild.tf:103`)
   - Uses: `_ARTIFACT_REGISTRY` environment variable
   - **Impact:** CI/CD **CANNOT push images** without Artifact Registry

3. **Foundation Outputs** (`infra/environments/foundation/outputs.tf`)
   - Exports `dev_artifact_registry_url` and `prod_artifact_registry_url`
   - **Impact:** Application layer **CANNOT get image URL** without this output

## What Happens If We Remove Artifact Registry?

### Option 1: Remove Completely (NOT RECOMMENDED)

- ❌ **Cloud Run cannot deploy** - needs container image
- ❌ **CI/CD cannot work** - needs image registry
- ❌ **Application layer will fail** - depends on foundation outputs

### Option 2: Make It Optional (RECOMMENDED)

- ✅ **Skip Artifact Registry creation** in foundation
- ✅ **Use alternative image source** temporarily:
  - Docker Hub (public images)
  - Google Container Registry (GCR) - older but works
  - Manual image push to existing repository
- ✅ **Deploy Cloud Run with external image** (e.g., `gcr.io/google-samples/hello-app`)
- ✅ **Add Artifact Registry later** when GCP issue resolves

### Option 3: Use Existing Repository

- ✅ **If dev repository already exists**, import it into Terraform state
- ✅ **Skip prod repository** for now (set `environments = ["dev"]`)
- ✅ **Continue with dev-only setup**

## Recommended Solution: Make Artifact Registry Optional

1. **Comment out Artifact Registry modules** in foundation
2. **Make outputs return null** if repository doesn't exist
3. **Update application layer** to handle missing Artifact Registry:
   - Use a placeholder/default image URL
   - Or use Docker Hub/GCR temporarily
   - Or make container_image optional

This allows you to:

- ✅ Complete foundation setup
- ✅ Deploy Cloud Run with a test image
- ✅ Add Artifact Registry later when GCP issue resolves
- ✅ Continue with other infrastructure setup

## Quick Fix: Skip Artifact Registry for Now

**In `infra/environments/foundation/main.tf`:**

- Comment out `module "artifact_registry_dev"` and `module "artifact_registry_prod"`
- Update outputs to return `null` for artifact registry URLs
- Update application layer to use a default/test image

**In `infra/environments/application/dev/main.tf`:**

- Change `container_image` to use a test image like `gcr.io/google-samples/hello-app:1.0`
- Or make it optional with a default value

This unblocks you to continue with the rest of the infrastructure setup.
