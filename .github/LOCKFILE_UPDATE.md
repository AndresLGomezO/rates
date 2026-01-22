# Lockfile Update Required

## Issue

The `pnpm-lock.yaml` file is out of sync with `package.json` files. The CI/CD workflows use `--frozen-lockfile` to ensure reproducible builds, which requires the lockfile to be up to date.

## Error

```
ERR_PNPM_OUTDATED_LOCKFILE  Cannot install with "frozen-lockfile" because pnpm-lock.yaml is not up to date with apps/app/package.json
```

## Solution

Update the lockfile by running:

```bash
pnpm install
```

This will:

1. Read all `package.json` files in the workspace
2. Resolve dependencies
3. Update `pnpm-lock.yaml` to match

Then commit the updated lockfile:

```bash
git add pnpm-lock.yaml
git commit -m "chore: update pnpm-lock.yaml"
git push
```

## Why This Happens

The lockfile can become out of sync when:

- Dependencies are added/removed/updated in `package.json` files
- The lockfile isn't committed after changes
- Manual edits to `package.json` without running `pnpm install`

## Prevention

Always run `pnpm install` after modifying `package.json` files and commit the updated `pnpm-lock.yaml`.

## CI/CD Behavior

All CI/CD workflows use `--frozen-lockfile` to:

- Ensure reproducible builds
- Catch lockfile inconsistencies early
- Prevent unexpected dependency updates in CI

This is a best practice and should not be changed.
