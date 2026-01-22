# Import Troubleshooting Guide

If you're getting "already exists" errors even after running the import script, follow these steps:

## Quick Fix

1. **Run the import script manually:**

   ```bash
   cd iaac
   ./scripts/import-existing.sh
   ```

2. **Verify imports worked:**

   ```bash
   terraform state list | grep -E "(identity_platform|firestore|secret|artifact_registry)"
   ```

3. **If resources are in state but still failing, refresh state:**

   ```bash
   terraform refresh
   ```

4. **Then try apply again:**
   ```bash
   terraform apply
   ```

## Manual Import Commands

If automatic import fails, import resources manually:

```bash
# Get your project ID from terraform.tfvars
PROJECT_ID=$(grep 'project_id' terraform.tfvars | cut -d'"' -f2)
REGION=$(grep 'region' terraform.tfvars | cut -d'"' -f2)
ENVIRONMENT=$(grep 'environment' terraform.tfvars | cut -d'"' -f2)

# Import Identity Platform
terraform import module.firebase.google_identity_platform_config.default projects/${PROJECT_ID}

# Import Firestore
terraform import module.firebase.google_firestore_database.default projects/${PROJECT_ID}/databases/(default)

# Import Firebase config secret
terraform import module.firebase.google_secret_manager_secret.firebase_config projects/${PROJECT_ID}/secrets/firebase-client-config-${ENVIRONMENT}

# Import Artifact Registry (adjust REPO_ID as needed)
REPO_ID="rates-${ENVIRONMENT}-containers"  # or check your terraform.tfvars
terraform import module.artifact_registry.google_artifact_registry_repository.containers projects/${PROJECT_ID}/locations/${REGION}/repositories/${REPO_ID}
```

## Verify Resources Exist in GCP

Check if resources actually exist before importing:

```bash
# Check Identity Platform
gcloud identity config describe --project=${PROJECT_ID}

# Check Firestore
gcloud firestore databases describe --database="(default)" --project=${PROJECT_ID}

# Check Secret
gcloud secrets describe firebase-client-config-${ENVIRONMENT} --project=${PROJECT_ID}

# Check Artifact Registry
gcloud artifacts repositories describe rates-${ENVIRONMENT}-containers --location=${REGION} --project=${PROJECT_ID}
```

## Common Issues

### Issue: "Resource already exists" but import fails

**Solution:** The resource might be in a different state. Try:

1. Check if resource is already in Terraform state: `terraform state list`
2. If it's there but with wrong address, use `terraform state mv` to move it
3. If it's not there, the import ID might be wrong - check the exact format

### Issue: Import succeeds but apply still fails

**Solution:** The Terraform configuration might not match the existing resource. Try:

1. Run `terraform plan` to see what Terraform wants to change
2. Update your `terraform.tfvars` to match existing resource configuration
3. Or use `lifecycle { ignore_changes = [...] }` to ignore specific attributes

### Issue: "Error code 5: Requested entity was not found" for Artifact Registry

**Solution:** This usually means:

1. The repository doesn't exist yet (will be created)
2. The repository ID or location is wrong
3. API propagation delay - wait a few minutes and try again

## Prevention

To avoid these issues in the future:

1. **Always run import script before first apply:**

   ```bash
   pnpm terraform:setup
   # When prompted, say "Y" to import existing resources
   ```

2. **Use the setup script which runs imports automatically:**
   The `scripts/setup-terraform.sh` script now includes an import step.

3. **Check state before applying:**
   ```bash
   terraform state list
   ```

## Still Having Issues?

1. Check Terraform state: `terraform state list`
2. Check what Terraform wants to do: `terraform plan`
3. Review the import script output for errors
4. Try manual imports using the commands above
