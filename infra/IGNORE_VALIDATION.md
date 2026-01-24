# Infrastructure Ignore Rules Validation

## Summary

This document validates that all Terraform and infrastructure-related files are properly ignored by git.

## Ignore Rules Added to `.gitignore`

The following rules have been added to the root `.gitignore`:

```gitignore
# Terraform
.terraform/
.terraform.lock.hcl
*.tfstate
*.tfstate.*
*.tfvars.backup
*.tfvars.bak
tfplan
tfplan.*
.terraformrc
terraform.rc

# Infrastructure setup scripts
infra/.setup.config
infra/.setup.log
```

## Files That Should Be Ignored

### ✅ Correctly Ignored (New Files)

- `*.log` files (including `infra/.setup.log`) - ✅ Ignored by `*.log`
- `*.tfstate` files - ✅ Ignored by `*.tfstate`
- `.terraform/` directories - ✅ Ignored by `.terraform/`
- New `.terraform.lock.hcl` files - ✅ Ignored by `.terraform.lock.hcl`

### ⚠️ Currently Tracked (Need Removal from Git)

The following files are currently tracked by git but should be ignored:

1. **Setup Configuration:**
   - `infra/.setup.config`

2. **Terraform Lock Files:**
   - `infra/environments/bootstrap/.terraform.lock.hcl`
   - `infra/environments/foundation/.terraform.lock.hcl`
   - `infra/environments/application/dev/.terraform.lock.hcl`
   - `infra/environments/application/prod/.terraform.lock.hcl`

3. **Terraform State Files:**
   - `infra/environments/bootstrap/.terraform/terraform.tfstate`
   - `infra/environments/foundation/.terraform/terraform.tfstate`
   - `infra/environments/application/dev/.terraform/terraform.tfstate`
   - `infra/environments/application/prod/.terraform/terraform.tfstate`

4. **Terraform Provider Files:**
   - All files under `infra/environments/*/.terraform/` directories

## Action Required

To remove these files from git tracking (they will remain on disk but won't be tracked):

```bash
cd /Users/andresgomezortiz/Projects/rates

# Remove setup config
git rm --cached infra/.setup.config

# Remove all .terraform.lock.hcl files
git rm --cached infra/environments/bootstrap/.terraform.lock.hcl
git rm --cached infra/environments/foundation/.terraform.lock.hcl
git rm --cached infra/environments/application/dev/.terraform.lock.hcl
git rm --cached infra/environments/application/prod/.terraform.lock.hcl

# Remove all .terraform directories and their contents
git rm -r --cached infra/environments/bootstrap/.terraform
git rm -r --cached infra/environments/foundation/.terraform
git rm -r --cached infra/environments/application/dev/.terraform
git rm -r --cached infra/environments/application/prod/.terraform
```

**Note:** The `--cached` flag removes files from git's index but keeps them on disk. This is safe and allows the ignore rules to take effect.

## Verification

After removing files from git tracking, verify with:

```bash
# Check that files are now ignored
git check-ignore -v infra/.setup.config
git check-ignore -v infra/environments/bootstrap/.terraform.lock.hcl

# Verify no Terraform files are tracked
git ls-files infra/ | grep -E "(\.terraform|\.tfstate|\.terraform\.lock|\.setup\.config)"
# Should return no results
```

## Files That Should NOT Be Ignored

The following files should remain tracked:

- ✅ `infra/**/*.tf` - Terraform configuration files
- ✅ `infra/**/*.tfvars` - Terraform variable files (but `.tfvars.backup` and `.tfvars.bak` are ignored)
- ✅ `infra/**/README.md` - Documentation
- ✅ `infra/**/*.sh` - Scripts
- ✅ `infra/**/*.md` - Documentation

## Cleanup Performed

- ✅ Removed `infra/environments/application/prod/Untitled` file
- ✅ Fixed `.gitignore` formatting issue (separated `*.cache` and `# Docker` comment)
