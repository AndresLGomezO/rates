# Known Issue: pnpm Catalog Resolution

## Problem

pnpm 9.0.0 has an issue resolving catalog entries from `pnpm-workspace.yaml`. When using `catalog:` protocol in `package.json` files, pnpm throws:

```
ERR_PNPM_SPEC_NOT_SUPPORTED_BY_ANY_RESOLVER  <package>@catalog: isn't supported by any available resolver.
```

## Current Workaround

As a temporary workaround, we're using direct version numbers in `package.json` files instead of `catalog:` references. The catalog is still defined in `pnpm-workspace.yaml` for reference and future use.

## Affected Packages

All packages that were using `catalog:` protocol have been updated to use direct versions:

- `apps/app/package.json`
- `packages/firebase-client/package.json`

## Future Fix

Once this issue is resolved (either by updating pnpm or finding the root cause), we can revert to using `catalog:` protocol for better dependency management consistency.

## References

- pnpm catalog documentation: https://pnpm.io/catalogs
- Related GitHub issues: https://github.com/pnpm/pnpm/issues/8566

## To Use Catalog Again (When Fixed)

1. Update all `package.json` files to use `catalog:` instead of direct versions
2. Run `pnpm install` to verify it works
3. Update this document
