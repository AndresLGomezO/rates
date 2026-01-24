# Fixing Cloud Run "Project Deleted" Error

## Error

```
Error: Error creating Service: googleapi: Error 403: denied: Project #900491261672 has been deleted.
```

## Root Cause

This error occurs when:

1. **Application Default Credentials (ADC) have stale project information cached** (MOST COMMON)
2. The Terraform provider has a cached/stale project number
3. Cloud Run API is referencing an old project number from cached credentials

**Current Status (2026-01-23):**

- ✅ Project exists: `dev-rates` (number: 900491261672)
- ✅ Billing account linked
- ✅ Cloud Run API enabled
- ✅ User has owner permissions
- ✅ Provider cache cleared
- ✅ Time delays added for API propagation
- ❌ Error persists - **ADC re-authentication required**

## Verification Steps

Run these commands to verify the current project:

```bash
# 1. Verify current project
gcloud config get-value project

# 2. Get current project number
gcloud projects describe dev-rates --format="value(projectNumber)"

# 3. Verify Cloud Run API is enabled
gcloud services list --enabled --project=dev-rates --filter="name:run.googleapis.com"

# 4. Check if project number matches
# The error mentions project #900491261672 - verify if this matches current project
```

## Solutions

### Solution 1: Refresh Terraform Provider (Recommended)

```bash
cd /Users/andresgomezortiz/Projects/rates/infra/environments/application/dev

# Remove provider cache
rm -rf .terraform/providers

# Re-initialize
terraform init -upgrade

# Try apply again
terraform apply
```

### Solution 2: Verify Project Number

If the project was recreated, the project number changed. Verify:

```bash
# Get current project number
PROJECT_NUMBER=$(gcloud projects describe dev-rates --format="value(projectNumber)")
echo "Current project number: $PROJECT_NUMBER"

# If it doesn't match 900491261672, the project was recreated
# You may need to refresh all Terraform state
```

### Solution 3: Re-authenticate (REQUIRED - This is the fix)

**This is the solution. The error persists even after clearing provider cache and adding delays, which confirms it's an ADC issue.**

The error "Project #900491261672 has been deleted" occurs even though:

- The project exists and is active
- The project number matches (900491261672)
- All APIs are enabled
- Permissions are correct

This indicates Application Default Credentials (ADC) have stale project information cached. Re-authenticate to refresh:

```bash
# Re-authenticate with application default credentials
gcloud auth application-default login

# Verify credentials are working
gcloud auth application-default print-access-token

# Verify the correct project is set
gcloud config get-value project

# Then retry the setup
cd /Users/andresgomezortiz/Projects/rates/infra
./setup.sh --phase 3
```

### Solution 4: Check Project Status

```bash
# Verify project exists and is active
gcloud projects describe dev-rates

# Check if project is marked as deleted
gcloud projects list --filter="projectId:dev-rates"
```

## If Project Was Recreated

If the project was deleted and recreated:

1. The project number changed
2. You may need to refresh Terraform state
3. Some resources may need to be recreated

Run:

```bash
cd /Users/andresgomezortiz/Projects/rates/infra/environments/application/dev
terraform refresh
terraform plan
```
