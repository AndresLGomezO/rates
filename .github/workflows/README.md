# CI/CD Workflows

This directory contains GitHub Actions workflows for the Rates monorepo, following 2026 best practices from leading tech companies.

## Workflows Overview

### 1. **CI** (`ci.yml`)

Runs on every push and pull request to `main` and `develop` branches.

**Features:**

- ✅ Advanced pnpm store caching for faster builds
- ✅ Build artifact caching for incremental builds
- ✅ Parallel matrix builds for both apps
- ✅ Bundle size analysis in build summary
- ✅ Comprehensive quality checks (format, lint, type-check)

**Jobs:**

- **Quality**: Checks code formatting, linting, and TypeScript type checking
- **Build**: Builds both `app` and `auth-app` in parallel with caching
- **Security**: Runs `pnpm audit` to check for dependency vulnerabilities
- **CI Status**: Aggregates results and reports overall CI status

**Duration:** ~5-10 minutes

**Caching Strategy:**

- pnpm store cache (shared across all jobs)
- Build output cache (per app, based on file hashes)
- Vite cache (incremental builds)

### 2. **PR Preview** (`pr-preview.yml`)

Runs on pull requests to build and deploy live previews.

**Features:**

- ✅ **Live preview deployments** to GitHub Pages
- ✅ Automatic PR comments with preview links
- ✅ Cleanup on PR close
- ✅ Staging environment configuration

**Jobs:**

- **Preview**: Builds and deploys both apps to GitHub Pages with unique PR paths
- **Cleanup**: Removes preview deployments when PR is closed

**Duration:** ~10-15 minutes

**Preview URLs:**

- Format: `https://{owner}.github.io/{repo}/preview/pr-{number}/{app}/`
- Example: `https://github.com/user/rates/preview/pr-123/app/`

**Required Setup:**

1. Enable GitHub Pages in repository settings
2. Set source to `gh-pages` branch or `GitHub Actions`
3. Configure staging Firebase secrets (see Setup Instructions below)

### 3. **Deploy** (`deploy.yml`)

Runs on pushes to `main` (production) and `develop` (staging) branches, or manually via workflow_dispatch.

**Features:**

- ✅ Environment-aware deployments
- ✅ Firebase rules and indexes deployment
- ✅ Firebase Hosting deployment (if configured)
- ✅ Build caching for faster deployments
- ✅ Comprehensive deployment summaries

**Jobs:**

- **Determine Environment**: Sets deployment target (production/staging)
- **Build**: Builds both apps with environment-specific configuration and caching
- **Deploy Firebase Rules**: Deploys Firestore rules, indexes, and Storage rules
- **Deploy Hosting**: Deploys built apps to Firebase Hosting (if configured)
- **Deployment Summary**: Creates a detailed summary of the deployment

**Duration:** ~15-20 minutes

**Required Secrets:**

#### Production Secrets

```
FIREBASE_PROJECT_ID_PRODUCTION
FIREBASE_API_KEY_PRODUCTION
FIREBASE_AUTH_DOMAIN_PRODUCTION
FIREBASE_STORAGE_BUCKET_PRODUCTION
FIREBASE_MESSAGING_SENDER_ID_PRODUCTION
FIREBASE_APP_ID_PRODUCTION
FIREBASE_TOKEN_PRODUCTION
```

#### Staging Secrets

```
FIREBASE_PROJECT_ID_STAGING
FIREBASE_API_KEY_STAGING
FIREBASE_AUTH_DOMAIN_STAGING
FIREBASE_STORAGE_BUCKET_STAGING
FIREBASE_MESSAGING_SENDER_ID_STAGING
FIREBASE_APP_ID_STAGING
FIREBASE_TOKEN_STAGING
```

### 4. **Lighthouse CI** (`lighthouse.yml`)

Runs on pull requests and pushes for performance monitoring.

**Features:**

- ✅ Performance, accessibility, SEO, and best practices audits
- ✅ Multiple runs for consistent results
- ✅ Artifact uploads for historical tracking
- ✅ Configurable thresholds

**Jobs:**

- **Lighthouse**: Runs Lighthouse audits on both apps

**Duration:** ~10-15 minutes

**Configuration:**

- Thresholds defined in `.github/lighthouse/config.json`
- Performance: 80% (warn)
- Accessibility: 90% (error)
- Best Practices: 80% (warn)
- SEO: 80% (warn)

### 5. **Bundle Analysis** (`bundle-analysis.yml`)

Runs on pull requests and pushes to track bundle size changes.

**Features:**

- ✅ JavaScript and CSS file size analysis
- ✅ Gzipped size calculations
- ✅ PR comments with bundle breakdown
- ✅ Build summary with totals

**Jobs:**

- **Analyze**: Analyzes bundle sizes for both apps and comments on PRs

**Duration:** ~10-15 minutes

### 6. **CodeQL Security Analysis** (`codeql.yml`)

Runs on pushes, pull requests, and weekly schedule for security analysis.

**Features:**

- ✅ Static code analysis for JavaScript and TypeScript
- ✅ Security and quality queries
- ✅ Weekly scheduled scans
- ✅ Advanced caching

**Jobs:**

- **Analyze**: Performs static code analysis for JavaScript and TypeScript

**Duration:** ~10-15 minutes

### 7. **Release** (`release.yml`)

Runs on tag pushes (e.g., `v1.0.0`) or manual workflow dispatch.

**Features:**

- ✅ Automatic changelog generation
- ✅ GitHub release creation
- ✅ Production build artifacts
- ✅ Artifact attachment to releases

**Jobs:**

- **Create Release**: Generates changelog and creates GitHub release
- **Build Release**: Builds production artifacts for the release

**Duration:** ~15-20 minutes

## Setup Instructions

### 1. Configure GitHub Secrets

Navigate to **Settings → Secrets and variables → Actions** in your GitHub repository and add the following secrets:

#### Production Secrets

```
FIREBASE_PROJECT_ID_PRODUCTION
FIREBASE_API_KEY_PRODUCTION
FIREBASE_AUTH_DOMAIN_PRODUCTION
FIREBASE_STORAGE_BUCKET_PRODUCTION
FIREBASE_MESSAGING_SENDER_ID_PRODUCTION
FIREBASE_APP_ID_PRODUCTION
FIREBASE_TOKEN_PRODUCTION
```

#### Staging Secrets

```
FIREBASE_PROJECT_ID_STAGING
FIREBASE_API_KEY_STAGING
FIREBASE_AUTH_DOMAIN_STAGING
FIREBASE_STORAGE_BUCKET_STAGING
FIREBASE_MESSAGING_SENDER_ID_STAGING
FIREBASE_APP_ID_STAGING
FIREBASE_TOKEN_STAGING
```

### 2. Get Firebase CLI Token

```bash
firebase login:ci
```

Copy the token and add it to `FIREBASE_TOKEN_*` secrets.

### 3. Enable GitHub Pages (for PR Previews)

1. Go to **Settings → Pages**
2. Under "Source", select **GitHub Actions**
3. Save the settings

### 4. Configure Firebase Hosting (Optional)

To enable Firebase Hosting deployments, add a `hosting` block to `firebase/firebase.json`:

```json
{
  "hosting": [
    {
      "target": "app",
      "public": "apps/app/dist",
      "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
      "rewrites": [
        {
          "source": "**",
          "destination": "/index.html"
        }
      ]
    },
    {
      "target": "auth-app",
      "public": "apps/auth-app/dist",
      "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
      "rewrites": [
        {
          "source": "**",
          "destination": "/index.html"
        }
      ]
    }
  ]
}
```

Also update `.firebaserc` to include hosting targets:

```json
{
  "projects": {
    "default": "your-project-id",
    "dev": "your-project-id-dev",
    "staging": "your-project-id-staging",
    "prod": "your-project-id-prod"
  },
  "targets": {
    "prod": {
      "hosting": {
        "app": ["your-hosting-site-1"],
        "auth-app": ["your-hosting-site-2"]
      }
    },
    "staging": {
      "hosting": {
        "app": ["your-staging-site-1"],
        "auth-app": ["your-staging-site-2"]
      }
    }
  }
}
```

## Best Practices

### 1. Branch Protection

Enable branch protection rules on `main` and `develop` requiring:

- ✅ CI checks to pass
- ✅ Code review approval
- ✅ Up-to-date branches
- ✅ Status checks: `quality`, `build`, `security`

### 2. Secrets Management

- ✅ Never commit secrets. Use GitHub Secrets for all sensitive data.
- ✅ Use environment-specific secrets (staging vs production)
- ✅ Rotate Firebase tokens regularly
- ✅ Use OIDC for Firebase authentication when possible (future enhancement)

### 3. Caching Strategy

The workflows use a multi-layer caching strategy:

- **pnpm store cache**: Shared across all jobs, based on `pnpm-lock.yaml`
- **Build cache**: Per-app, based on source file hashes
- **Vite cache**: Incremental build cache

### 4. Monorepo Optimizations

- ✅ Matrix builds for parallel app builds
- ✅ Filtered pnpm installs (via workspace)
- ✅ Per-app build caching
- ✅ Affected package detection (future: Turborepo integration)

### 5. Performance Monitoring

- ✅ Lighthouse CI on every PR
- ✅ Bundle size tracking
- ✅ Build time monitoring
- ✅ Artifact retention policies

### 6. Artifact Retention

Build artifacts are retained for:

- CI builds: 7 days
- Deployments: 30 days
- Releases: 90 days
- PR previews: 3 days (auto-cleanup on PR close)

## Workflow Status Badges

Add these to your README.md to show CI status:

```markdown
![CI](https://github.com/your-username/rates/actions/workflows/ci.yml/badge.svg)
![Deploy](https://github.com/your-username/rates/actions/workflows/deploy.yml/badge.svg)
![CodeQL](https://github.com/your-username/rates/actions/workflows/codeql.yml/badge.svg)
```

## Troubleshooting

### Build Failures

- Check the workflow logs for specific error messages
- Verify all required secrets are configured
- Ensure `pnpm-lock.yaml` is committed and up to date
- Clear caches if builds are inconsistent (Actions → Caches)

### Deployment Failures

- Verify Firebase authentication tokens are valid
- Check Firebase project permissions
- Ensure hosting is configured if using Firebase Hosting
- Review deployment summary in workflow output

### Preview Deployment Issues

- Verify GitHub Pages is enabled
- Check repository permissions for GitHub Actions
- Ensure staging secrets are configured
- Review PR preview workflow logs

### Security Scan Failures

- Review CodeQL alerts in the Security tab
- Address high and critical severity issues
- Update dependencies with known vulnerabilities
- Review Lighthouse accessibility warnings

### Performance Issues

- Check Lighthouse CI results in workflow artifacts
- Review bundle size analysis in PR comments
- Monitor build times in workflow summaries
- Consider optimizing large dependencies

## Advanced Features

### Custom Lighthouse Thresholds

Edit `.github/lighthouse/config.json` to adjust performance thresholds:

```json
{
  "ci": {
    "assert": {
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.9 }]
      }
    }
  }
}
```

### Matrix Build Customization

Modify the `matrix` strategy in workflows to add/remove apps or configurations:

```yaml
strategy:
  matrix:
    app: [app, auth-app]
    node-version: [20, 22] # Example: test multiple Node versions
```

### Conditional Deployments

Use environment conditions to control deployments:

```yaml
if: github.ref == 'refs/heads/main' && github.event_name == 'push'
```

## Future Enhancements

Potential improvements for the CI/CD pipeline:

1. **Turborepo Integration**: Add Turborepo for better monorepo task orchestration
2. **E2E Testing**: Add Playwright or Cypress tests in CI
3. **Visual Regression**: Add Percy or Chromatic for visual testing
4. **Dependency Updates**: Automated dependency update PRs (Dependabot already configured)
5. **OIDC for Firebase**: Use OIDC instead of tokens for better security
6. **Preview Environments**: Multiple preview environments per PR (staging, production-like)
7. **Performance Budgets**: Enforce bundle size limits
8. **Deployment Notifications**: Slack/Discord notifications for deployments

## References

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Firebase Hosting Documentation](https://firebase.google.com/docs/hosting)
- [Lighthouse CI Documentation](https://github.com/GoogleChrome/lighthouse-ci)
- [pnpm Documentation](https://pnpm.io/)
- [Vite Documentation](https://vitejs.dev/)
