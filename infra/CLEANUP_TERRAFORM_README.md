# Terraform Cleanup Script

This script removes all Terraform state files, cached data, and optionally destroys resources to allow a fresh deployment.

## Usage

```bash
cd infra
./cleanup-terraform.sh [OPTIONS]
```

## Options

- `-d` - Destroy resources via `terraform destroy` (requires terraform to be initialized)
- `-r` - Clean remote state from GCS bucket (requires gcloud access)
- `-y` - Auto-confirm all prompts (use with caution)
- `-h` - Show help message

## What Gets Cleaned

### Always Removed (Default)

- All local Terraform state files (`*.tfstate`, `*.tfstate.backup`)
- All `.terraform` directories (provider cache)
- All `.terraform.lock.hcl` files
- `terraform.tfvars` files (keeps `.example` files)

### Optional (with flags)

- **`-d`**: Destroys all resources via `terraform destroy` in reverse order:
  - Application (Prod)
  - Application (Dev)
  - Foundation
  - Bootstrap
- **`-r`**: Removes remote state from GCS bucket `rates-terraform-state`

## Examples

### Basic Cleanup (Local State Only)

```bash
./cleanup-terraform.sh
```

Removes all local state files and caches. Safe to run anytime.

### Full Cleanup (Local + Remote State)

```bash
./cleanup-terraform.sh -r
```

Removes local state files and remote state from GCS. Use when starting completely fresh.

### Destroy Resources + Clean State

```bash
./cleanup-terraform.sh -d -r
```

Destroys all resources via Terraform, then cleans up all state (local and remote).

### Auto-Confirm (Use with Caution)

```bash
./cleanup-terraform.sh -d -r -y
```

Skips all confirmation prompts. **Use only if you're absolutely sure!**

## When to Use

### Start Fresh Deployment

If you want to redeploy from scratch with new project IDs or configuration:

```bash
./cleanup-terraform.sh -r
```

Then run `deploy.sh` again.

### Fix State Corruption

If Terraform state is corrupted or out of sync:

```bash
./cleanup-terraform.sh -d -r
```

This destroys resources and cleans state, allowing a fresh deployment.

### Clean Up After Testing

After testing deployments, clean up without destroying resources:

```bash
./cleanup-terraform.sh
```

This removes state files but keeps resources intact (you'll need to import them if you want to manage them again).

## Safety Features

1. **Confirmation Prompts**: By default, the script asks for confirmation before destructive operations
2. **Preserves Example Files**: `terraform.tfvars.example` files are never deleted
3. **Error Handling**: Script continues even if some operations fail
4. **Dry Run Info**: Shows what will be cleaned before doing it

## Important Notes

⚠️ **Warning**: Using `-d` flag will **destroy all resources** managed by Terraform. This cannot be undone!

⚠️ **Warning**: Using `-r` flag will **delete remote state** from GCS. Make sure you have backups if needed!

⚠️ **Note**: The script does NOT delete:

- Terraform configuration files (`.tf` files)
- Example variable files (`.tfvars.example`)
- Documentation files (`.md` files)
- Module source code

## Troubleshooting

### "Permission Denied" Error

Make sure the script is executable:

```bash
chmod +x cleanup-terraform.sh
```

### "Bucket Not Found" Error (with -r flag)

This is normal if:

- The bucket doesn't exist yet
- You don't have access to the bucket
- The bucket name is different

The script will skip remote cleanup in this case.

### "Terraform Not Initialized" (with -d flag)

This is normal if you haven't run `terraform init` in that directory yet. The script will skip those directories.

## After Cleanup

After running the cleanup script:

1. **Review Configuration**: Check your `terraform.tfvars.example` files
2. **Copy Variables**: Create new `terraform.tfvars` files from examples
3. **Update Values**: Set correct project IDs, regions, etc.
4. **Deploy Fresh**: Run `deploy.sh` to start a new deployment

## Related Scripts

- `deploy.sh` - Main deployment script
- `cleanup-project.sh` - GCP project resource cleanup (different purpose)
