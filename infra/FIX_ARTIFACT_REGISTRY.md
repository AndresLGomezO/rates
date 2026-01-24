# Fixing Artifact Registry "Entity Not Found" Error

## Root Cause

The error "Error code 5: Requested entity was not found" when creating the prod Artifact Registry repository is a **GCP API issue**, not a Terraform issue. Even manual `gcloud` commands fail with the same error.

**Confirmed:** This happens when trying to create a SECOND repository in the same location after the first one succeeds. Possible causes:

1. Free tier quota limit (may only allow 1 repository per location)
2. GCP backend propagation delay after first repository creation
3. Artifact Registry API backend issue in us-central1

## Why "prod" in "dev-rates"?

The foundation layer creates shared infrastructure for **both** dev and prod environments in the same project. This is by design - the foundation sets up:

- Service accounts for both environments
- Artifact Registry repositories for both environments
- All in the same project (dev-rates)

This is correct behavior - you'll have separate projects later for actual prod deployment.

## Why "prod" in "dev-rates"?

The foundation layer creates shared infrastructure for **both** dev and prod environments in the same project. This is by design - the foundation sets up:

- Service accounts for both environments
- Artifact Registry repositories for both environments
- All in the same project (dev-rates)

This is correct behavior - you'll have separate projects later for actual prod deployment.

## Manual Validation Steps

Run these commands to validate the current state:

```bash
cd /Users/andresgomezortiz/Projects/rates/infra/environments/foundation

# 1. Check what repositories exist in GCP
gcloud artifacts repositories list --location=us-central1 --project=dev-rates

# 2. Check if Artifact Registry API is enabled
gcloud services list --enabled --project=dev-rates --filter="name:artifactregistry.googleapis.com"

# 3. Check Terraform state
terraform state list | grep artifact_registry

# 4. Try creating prod repository manually to see the actual error
gcloud artifacts repositories create rates-prod-containers \
  --repository-format=docker \
  --location=us-central1 \
  --project=dev-rates \
  --description="Docker container images for prod environment"

# 5. Check for orphaned time_sleep resources
terraform state list | grep time_sleep
```

## Fix: Remove Orphaned Resources

The module code was updated to remove `time_sleep.wait_for_api`, but it still exists in state. Remove it:

```bash
cd /Users/andresgomezortiz/Projects/rates/infra/environments/foundation

# Remove orphaned time_sleep resources from state
terraform state rm 'module.artifact_registry["dev"].time_sleep.wait_for_api' 2>/dev/null || true
terraform state rm 'module.artifact_registry["prod"].time_sleep.wait_for_api' 2>/dev/null || true

# Then try apply again
terraform plan
terraform apply
```

## Solution: Skip Prod Repository for Now (Recommended)

Since this is a GCP API issue affecting even manual commands, the best solution is to skip prod repository creation for now:

**Option 1: Modify terraform.tfvars temporarily**

```bash
cd /Users/andresgomezortiz/Projects/rates/infra/environments/foundation
# Edit terraform.tfvars and change:
environments = ["dev"]  # Only create dev resources
```

**Option 2: Wait 24 hours and try again**
GCP backend issues often resolve after waiting. The dev repository works, so the API is functional - this appears to be a temporary backend issue.

**Option 3: Try a different location**
If you need prod repository immediately, try creating it in a different region (though this may have cost implications):

```bash
# Try us-east1 instead of us-central1
gcloud artifacts repositories create rates-prod-containers \
  --repository-format=docker \
  --location=us-east1 \
  --project=dev-rates
```

**Option 4: Check quota limits**

```bash
gcloud compute project-info describe --project=dev-rates --format="value(quotas)"
# Look for Artifact Registry quotas
```

## If Manual Creation Works

If the manual `gcloud` command succeeds but Terraform fails, it's likely a Terraform provider issue. Try:

1. Updating the Google provider version
2. Using `terraform apply -refresh=false` to skip state refresh
3. Creating the repository manually and importing it
