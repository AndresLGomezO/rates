## Summary

- **What**:
- **Why**:
- **Scope** (apps/packages touched):
  - [ ] `apps/app`
  - [ ] `apps/auth-app`
  - [ ] `packages/firebase-client`
  - [ ] `packages/ui-theme`
  - [ ] Other:

## Changes

- **User-facing changes**:
- **Non-user-facing changes** (refactors, tooling, CI/CD, etc.):

## Screenshots / Recordings (UI changes)

- Before:
- After:

## How to test

- **Local**:
  - [ ] `pnpm install`
  - [ ] `pnpm check` (format/lint/type-check)
  - [ ] App: `pnpm --filter app dev` (port 5174)
  - [ ] Auth app: `pnpm --filter auth-app dev` (port 5175)
- **Test cases**:
  - [ ] Happy path
  - [ ] Error states
  - [ ] Edge cases (list):

## CI impact (monorepo)

- **Expected affected workflows/jobs**:
  - [ ] PR CI (`.github/workflows/ci.yml`)
  - [ ] Deploy (`.github/workflows/deploy.yml`) (main only)

## Risk / Rollback

- **Risk level**:
  - [ ] Low
  - [ ] Medium
  - [ ] High
- **Rollback plan**:

## Security / Compliance (required if applicable)

- [ ] No secrets committed (no SA keys, no tokens)
- [ ] IAM / auth changes reviewed (least privilege)
- [ ] Data access/rules changes reviewed (Firestore/Storage rules)

## Checklist

- [ ] Lint + type-check pass (`pnpm check`)
- [ ] No Tailwind conflicting classes / inline styles introduced
- [ ] Docs updated (if behavior changes)
- [ ] Linked issue(s): #
