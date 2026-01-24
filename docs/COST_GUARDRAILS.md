# Cost Guardrails and Free-Tier Enforcement Strategy

## GCP FinOps Specialist - Cost Optimization Architecture

**Document Version:** 1.0  
**Date:** 2026  
**Project:** Rates Monorepo  
**Status:** LOCKED - Source of Truth for Cost Control Implementation  
**Governance:** Lead Google Cloud Architect & FinOps Specialist

---

## Purpose

This document defines the **fail-safe cost control strategy** for the Rates monorepo GCP deployment. It prioritizes **hard limits** (quota enforcement, resource caps) over soft alerts (budgets) to prevent bill shock and ensure the application remains within GCP Free Tier constraints wherever possible.

**Critical Principle:** The system must **fail-safe** (stop scaling, stop running, or block execution) rather than allow unbounded spending. Budgets inform; quotas prevent.

**Usage:**

- DevOps engineers must enforce these guardrails in Terraform configurations
- Platform engineers must validate all infrastructure changes against these limits
- No resource configuration may exceed these caps without formal approval

---

## 1. Cost Risk Analysis

### 1.1 Top 3 Services Most Likely to Cause Accidental Overspending

Based on the architecture defined in `docs/ARCHITECTURAL_DECISION_LOG.md`, the following services pose the highest risk of unexpected costs:

| Service Name          | Risk Vector                                               | Impact                                                                                                                                                                                                                            | Mitigation Strategy                                                                                                                                   |
| --------------------- | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Cloud Run**         | **Traffic spike / DDoS / infinite loop**                  | **CRITICAL** - Unbounded scaling can generate thousands of dollars in hours. Default max_instances=10 allows 10×80=800 concurrent requests. At $0.00002400 per vCPU-second, sustained traffic spike could cost $50-200/day.       | **Hard limit:** max_instances=2 (enforced via Terraform). Quota: 2 instances per service. Minimum instances=0 (scale-to-zero).                        |
| **Cloud Build**       | **Frequent builds / build loop / misconfigured triggers** | **HIGH** - Free tier: 120 build-minutes/day. Exceeding this costs $0.003/build-minute. A misconfigured trigger firing every commit could consume 1000+ minutes/day = $3/day = $90/month.                                          | **Hard limit:** Cloud Build quota set to 120 minutes/day. Trigger protection: Only protected branches (main, develop). Build timeout: 10 minutes max. |
| **Artifact Registry** | **Image accumulation / no lifecycle policy**              | **MEDIUM** - Free tier: 0.5 GB storage. Each container image ~50-100 MB. Without cleanup, 10+ images accumulate = 500 MB-1 GB = $0.10-0.20/month. More critically, if images accumulate over months, storage costs grow linearly. | **Hard limit:** Lifecycle policy: Retain last 3 images OR images older than 30 days deleted. Terraform-enforced.                                      |

### 1.2 Hidden Cost Drivers

The following cost vectors are non-obvious but can cause significant spending:

#### Network Egress

- **Internet egress:** Cloud Run → Internet: $0.12/GB (first 10 GB free/month). Firestore → Internet: $0.12/GB. Firebase Hosting: 360 MB/day free, then $0.12/GB.
- **Risk:** API responses, Firestore queries returning large datasets, or accidental data export could generate egress charges.
- **Mitigation:**
  - Cloud Run response size limits (enforced in application code)
  - Firestore query pagination (enforced in application code)
  - Firebase Hosting CDN caching reduces egress (automatic)

#### Logging Volume

- **Cloud Logging:** 50 GB ingestion free/month, then $0.50/GB.
- **Risk:** Verbose logging, error loops, or debug logging in production could exceed free tier.
- **Mitigation:**
  - Log retention: 7 days (free tier default, enforced)
  - Log exclusion filters for verbose debug logs (Terraform-enforced)
  - Structured logging to reduce log size (application-level)

#### Accidental API Enablement

- **Risk:** Enabling unused APIs (Cloud Monitoring, Cloud Trace, Cloud Profiler) incurs costs even if unused.
- **Mitigation:**
  - IAM policy: Only `roles/serviceusage.serviceUsageAdmin` can enable APIs
  - Terraform: Explicitly disable unused APIs
  - Organization policy: Block API enablement (if using Google Cloud Organization)

#### Firestore Operations

- **Free tier:** 50K reads/day, 20K writes/day, 20K deletes/day.
- **Risk:** Inefficient queries, batch operations, or data migration scripts could exceed free tier.
- **Mitigation:**
  - Application-level query optimization (enforced in code review)
  - Firestore quotas: Set read/write rate limits (if available)
  - Monitoring: Alert when approaching 80% of free tier limits

#### Cloud Run Resource Misconfiguration

- **Risk:** Setting min_instances > 0 prevents scale-to-zero, incurring costs even when idle.
- **Mitigation:**
  - Terraform validation: min_instances must be 0 (enforced)
  - Exception: Only allowed with explicit justification and approval

---

## 2. Hard Guardrails (Terraform Configuration Strategy)

### 2.1 Compute Capping

#### Cloud Run Configuration

**Resource:** `google_cloud_run_v2_service`

**Enforced Values:**

```hcl
resource "google_cloud_run_v2_service" "auth_app_api" {
  name     = "rates-${var.environment}-api-${var.region}"
  location = var.region

  template {
    # HARD LIMIT: Maximum instances
    # Justification: Prevents unbounded scaling from traffic spikes or DDoS.
    # 2 instances × 80 concurrency = 160 concurrent requests max.
    # At estimated 100K requests/month, average load < 0.1 requests/second.
    # 2 instances provide 160× capacity buffer while capping cost risk.
    scaling {
      max_instance_count = 2  # HARD LIMIT - DO NOT EXCEED WITHOUT APPROVAL
      min_instance_count = 0  # REQUIRED - Scale to zero to prevent idle costs
    }

    # HARD LIMIT: Concurrency per instance
    # Justification: Default 80 is sufficient. Lowering reduces cost per instance
    # but increases instance count risk. Keep at 80 to balance cost and performance.
    max_instance_request_concurrency = 80

    # HARD LIMIT: Timeout
    # Justification: Prevents long-running requests from holding instances.
    # Token validation should complete in < 1 second. 30s provides safety margin.
    timeout = "30s"

    containers {
      # HARD LIMIT: CPU allocation
      # Justification: 1 vCPU is sufficient for token validation. Lower reduces cost.
      resources {
        cpu_idle = true
        cpu      = "1"
        memory   = "512Mi"  # Minimum for Node.js runtime
      }
    }
  }

  # HARD LIMIT: Traffic allocation
  # Justification: 100% to latest revision prevents traffic splitting costs.
  traffic {
    percent = 100
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
  }
}
```

**Quota Enforcement:**

```hcl
# Project-level quota: Maximum Cloud Run instances per service
# Set via: gcloud compute project-info describe --project=<project-id>
# Or via Terraform: google_project_quota (if supported)
# Target: 2 instances per service (matches max_instance_count)
```

**Validation Rules:**

- Terraform validation block: `max_instance_count <= 2`
- Terraform validation block: `min_instance_count == 0` (unless exception approved)
- Terraform validation block: `timeout <= 30s`

#### Cloud Run Quota Limits

**Quota Name:** `run.googleapis.com/container-instances` (per service)  
**Enforced Value:** 2 instances  
**Justification:** Matches Terraform `max_instance_count` to prevent manual override.

**Quota Name:** `run.googleapis.com/requests` (per service, per month)  
**Enforced Value:** 2,000,000 requests/month (free tier limit)  
**Justification:** Hard cap at free tier limit. Requests beyond this will fail (503) rather than incur charges.

**Implementation:**

```hcl
# Note: Quota enforcement may require gcloud CLI or Organization Policy
# Terraform does not directly manage quotas in all cases.
# Document manual quota setting in deployment runbook.
```

### 2.2 Storage Policies

#### Artifact Registry Lifecycle Policy

**Resource:** `google_artifact_registry_repository` + Lifecycle Policy

**Enforced Policy:**

```hcl
resource "google_artifact_registry_repository" "containers" {
  name      = "rates-${var.environment}-containers"
  location  = var.region
  format    = "DOCKER"
  mode      = "STANDARD_REPOSITORY"

  # HARD LIMIT: Lifecycle policy via gcloud (Terraform support limited)
  # Policy: Delete images older than 30 days OR retain only last 3 images
  # Implementation: Use gcloud artifacts docker images delete or Terraform null_resource
}

# Lifecycle policy enforcement (via null_resource or external script)
resource "null_resource" "artifact_registry_lifecycle" {
  triggers = {
    repository = google_artifact_registry_repository.containers.name
  }

  provisioner "local-exec" {
    command = <<-EOT
      # Delete images older than 30 days
      gcloud artifacts docker images list \
        --repository=${google_artifact_registry_repository.containers.name} \
        --location=${var.region} \
        --format="value(package)" \
        --filter="createTime<$(date -d '30 days ago' -u +%Y-%m-%dT%H:%M:%SZ)" \
        | xargs -I {} gcloud artifacts docker images delete {} --delete-tags --quiet || true

      # Retain only last 3 images (if more than 3 exist)
      IMAGES=$(gcloud artifacts docker images list \
        --repository=${google_artifact_registry_repository.containers.name} \
        --location=${var.region} \
        --format="value(package)" \
        --sort-by=~createTime)
      COUNT=$(echo "$IMAGES" | wc -l)
      if [ "$COUNT" -gt 3 ]; then
        echo "$IMAGES" | tail -n +4 | xargs -I {} gcloud artifacts docker images delete {} --delete-tags --quiet || true
      fi
    EOT
  }
}
```

**Alternative (Recommended):** Use Artifact Registry native lifecycle policies (if available):

```hcl
# If Terraform supports lifecycle policies directly:
lifecycle_policy {
  retention_policy {
    # Retain last 3 images
    keep_count = 3
    # OR delete images older than 30 days
    max_age_days = 30
  }
}
```

**Validation:**

- Terraform validation: Repository storage must not exceed 0.5 GB (free tier limit)
- Alert: If storage exceeds 0.4 GB (80% of free tier), trigger cleanup

#### Cloud Storage Lifecycle Policies (Terraform State & Logs)

**Resource:** `google_storage_bucket` (for Terraform state, if used)

**Enforced Policy:**

```hcl
resource "google_storage_bucket" "terraform_state" {
  name     = "rates-${var.environment}-terraform-state"
  location = var.region

  # HARD LIMIT: Lifecycle policy
  lifecycle_rule {
    # Delete old state files (retain last 10 versions)
    condition {
      age = 90  # Delete state files older than 90 days
    }
    action {
      type = "Delete"
    }
  }

  # HARD LIMIT: Versioning (disable to reduce storage)
  versioning {
    enabled = false  # Or enable with lifecycle rule to delete old versions
  }

  # HARD LIMIT: Storage class (use STANDARD, not NEARLINE/COLDLINE)
  storage_class = "STANDARD"
}
```

**Cloud Logging Retention:**

- **Enforced:** 7-day retention (free tier default)
- **Terraform:** Cloud Logging sinks (if created) must have retention_days <= 7
- **Validation:** No log sinks with retention > 7 days

### 2.3 Quotas & API Controls

#### Explicit Quota Limits

**Cloud Run Quotas:**
| Quota Name | Limit | Justification |
|------------|-------|---------------|
| `run.googleapis.com/container-instances` (per service) | 2 | Matches max_instance_count |
| `run.googleapis.com/requests` (per service, per month) | 2,000,000 | Free tier limit |
| `run.googleapis.com/cpu` (per service, per month) | 180,000 vCPU-seconds | Free tier limit (180K vCPU-seconds) |
| `run.googleapis.com/memory` (per service, per month) | 360,000 GiB-seconds | Free tier limit |

**Cloud Build Quotas:**
| Quota Name | Limit | Justification |
|------------|-------|---------------|
| `cloudbuild.googleapis.com/builds` (per day) | 120 build-minutes | Free tier limit |
| `cloudbuild.googleapis.com/builds` (concurrent) | 1 | Prevent parallel builds from consuming quota |

**Firestore Quotas:**
| Quota Name | Limit | Justification |
|------------|-------|---------------|
| `firestore.googleapis.com/document_reads` (per day) | 50,000 | Free tier limit |
| `firestore.googleapis.com/document_writes` (per day) | 20,000 | Free tier limit |
| `firestore.googleapis.com/document_deletes` (per day) | 20,000 | Free tier limit |

**Artifact Registry Quotas:**
| Quota Name | Limit | Justification |
|------------|-------|---------------|
| `artifactregistry.googleapis.com/storage` (per project) | 0.5 GB | Free tier limit |

**Implementation Note:** Quotas may require manual setting via `gcloud` or Organization Policies. Document in deployment runbook.

#### Disable Unused APIs

**Terraform Enforcement:**

```hcl
# Explicitly disable unused APIs to prevent accidental enablement
resource "google_project_service" "disabled_apis" {
  for_each = toset([
    "monitoring.googleapis.com",      # Rejected per ADR-009
    "cloudtrace.googleapis.com",       # Rejected per ADR-009
    "cloudprofiler.googleapis.com",    # Rejected per ADR-009
    "cloudkms.googleapis.com",        # Rejected per ADR-006
    "compute.googleapis.com",          # Rejected per ADR-001 (no VMs)
    "container.googleapis.com",        # Rejected per ADR-001 (no GKE)
    "sqladmin.googleapis.com",          # Rejected per ADR-004 (no Cloud SQL)
    "spanner.googleapis.com",          # Rejected per ADR-004 (no Spanner)
    "bigtable.googleapis.com",         # Rejected per ADR-004 (no Bigtable)
    "pubsub.googleapis.com",           # Rejected per ADR (no Pub/Sub)
    "cloudtasks.googleapis.com",      # Rejected per ADR (no Cloud Tasks)
    "cloudscheduler.googleapis.com",  # Rejected per ADR (no Cloud Scheduler)
  ])

  service = each.value
  disable_dependent_services = true
  disable_on_destroy         = true
  project                     = var.project_id
}
```

#### Restrict API Enablement

**IAM Policy:**

```hcl
# Only specific service accounts can enable APIs
resource "google_project_iam_binding" "api_enablement_restriction" {
  project = var.project_id
  role    = "roles/serviceusage.serviceUsageAdmin"

  members = [
    # Only allow specific service accounts or users
    "serviceAccount:terraform-sa@${var.project_id}.iam.gserviceaccount.com",
    # Add explicit user emails if needed
    # "user:admin@example.com",
  ]
}
```

**Organization Policy (if using Google Cloud Organization):**

```hcl
# Block API enablement at organization level
resource "google_organization_policy" "disable_api_enablement" {
  org_id     = var.organization_id
  constraint = "constraints/serviceuser.services"

  list_policy {
    deny {
      all = true  # Deny all API enablement
    }
  }
}
```

---

## 3. Budget & Alerting Strategy

### 3.1 Budget Definition

**Critical Note:** Budgets are **soft alerts only**. They inform but do not prevent spending. Hard limits (quotas, resource caps) must be enforced separately.

#### Monthly Absolute Maximum Budget

**Budget Amount:** $10.00/month  
**Justification:**

- Free tier should cover $0/month for MVP scale
- $10 provides safety margin for:
  - Minor free tier exceedances (e.g., 10% over Firestore free tier = ~$1-2)
  - Network egress (first 10 GB free, then $0.12/GB)
  - Accidental API usage
- $10 is a reasonable "circuit breaker" threshold before manual intervention

#### Alert Thresholds

**Budget Alert Configuration:**

```hcl
resource "google_billing_budget" "monthly_budget" {
  billing_account = var.billing_account_id
  display_name    = "Rates Monorepo - Monthly Budget"

  budget_filter {
    projects = ["projects/${var.project_id}"]
  }

  amount {
    specified_amount {
      currency_code = "USD"
      units         = "10"  # $10.00 absolute maximum
    }
  }

  # Alert thresholds (soft alerts - inform only)
  threshold_rules {
    threshold_percent = 0.5   # Alert at $5.00 (50% of budget)
    spend_basis      = "CURRENT_SPEND"
  }
  threshold_rules {
    threshold_percent = 0.8   # Alert at $8.00 (80% of budget)
    spend_basis      = "CURRENT_SPEND"
  }
  threshold_rules {
    threshold_percent = 1.0   # Alert at $10.00 (100% of budget)
    spend_basis      = "CURRENT_SPEND"
  }
  threshold_rules {
    threshold_percent = 1.2   # Alert at $12.00 (120% - exceeded)
    spend_basis      = "CURRENT_SPEND"
  }

  # Forecast-based alerts (predictive)
  threshold_rules {
    threshold_percent = 1.0   # Alert if forecasted to exceed $10.00
    spend_basis      = "FORECASTED_SPEND"
  }
}
```

#### Free Tier Consumption Alerts

**Additional Budgets for Free Tier Tracking:**

```hcl
# Cloud Run free tier tracking (informational)
# Free tier: 2M requests/month, 360K GiB-seconds, 180K vCPU-seconds
# Alert when approaching 80% of free tier limits

# Firestore free tier tracking (informational)
# Free tier: 50K reads/day, 20K writes/day
# Alert when approaching 80% of daily limits
```

**Implementation Note:** Free tier consumption cannot be tracked via budgets directly. Use Cloud Monitoring metrics or custom alerts (if Cloud Monitoring is enabled) or manual monitoring via Cloud Console.

### 3.2 Notification Channels

#### Email Notifications

**Configuration:**

```hcl
resource "google_monitoring_notification_channel" "email" {
  display_name = "Billing Alerts - Email"
  type         = "email"

  labels = {
    email_address = var.billing_alert_email  # e.g., "admin@example.com"
  }
}

# Attach to budget
resource "google_billing_budget" "monthly_budget" {
  # ... (budget configuration from above)

  all_updates_rule {
    monitoring_notification_channels = [
      google_monitoring_notification_channel.email.id
    ]
    disable_default_iam_recipients = false  # Also notify billing admins
  }
}
```

**Recipients:**

- Primary: Project owner email (from `var.billing_alert_email`)
- Secondary: Billing account administrators (automatic via `disable_default_iam_recipients = false`)

#### Pub/Sub Integration (Programmatic Response)

**Configuration:**

```hcl
# Pub/Sub topic for budget alerts
resource "google_pubsub_topic" "billing_alerts" {
  name = "billing-budget-alerts"
}

# Pub/Sub subscription (for automated response)
resource "google_pubsub_subscription" "billing_alerts" {
  name  = "billing-budget-alerts-sub"
  topic = google_pubsub_topic.billing_alerts.name

  # Optional: Cloud Function trigger to disable billing or shutdown resources
  # This requires Cloud Functions (not in current architecture)
  # Alternative: Use Cloud Scheduler + Cloud Run job to check budget and take action
}

# Attach Pub/Sub to budget
resource "google_billing_budget" "monthly_budget" {
  # ... (budget configuration from above)

  all_updates_rule {
    pubsub_topic = google_pubsub_topic.billing_alerts.id
  }
}
```

**Automated Response (Optional):**

- Cloud Function or Cloud Run job subscribes to Pub/Sub
- On budget threshold breach, automatically:
  - Disable Cloud Billing on project (via `gcloud billing projects unlink`)
  - OR scale Cloud Run to 0 instances
  - OR disable Cloud Build triggers
- **Warning:** Automated billing disable is destructive. Use with caution.

#### Slack/Webhook Integration (If Applicable)

**Configuration:**

```hcl
# Webhook notification channel (for Slack, Discord, etc.)
resource "google_monitoring_notification_channel" "webhook" {
  display_name = "Billing Alerts - Slack"
  type         = "webhook_tokenauth"

  labels = {
    url = var.slack_webhook_url  # Slack incoming webhook URL
  }

  sensitive_labels {
    auth_token = var.slack_webhook_token  # Optional: if using token auth
  }
}
```

---

## 4. Free Tier Enforcement Checklist

### 4.1 Operational Checks

#### Cloud Run Configuration

- [ ] **Region:** Deploy only in free-tier-eligible regions
  - **Allowed regions:** `us-central1`, `us-east1`, `us-west1`, `europe-west1`, `asia-east1`
  - **Terraform validation:** `var.region` must be in allowed list
  - **Justification:** Some regions may not qualify for free tier. Stick to documented free-tier regions.

- [ ] **Min instances:** Must be 0 (scale-to-zero)
  - **Terraform validation:** `min_instance_count == 0`
  - **Exception:** Only with explicit approval and justification

- [ ] **Max instances:** Must be <= 2
  - **Terraform validation:** `max_instance_count <= 2`
  - **Exception:** Only with explicit approval and justification

- [ ] **CPU allocation:** Must be "1" (1 vCPU)
  - **Terraform validation:** `cpu == "1"`
  - **Justification:** Lower CPU reduces cost per instance

- [ ] **Memory:** Must be <= 512Mi
  - **Terraform validation:** `memory <= "512Mi"`
  - **Justification:** Minimum for Node.js runtime, prevents over-allocation

#### Cloud Build Configuration

- [ ] **Trigger protection:** Only protected branches (main, develop)
  - **Terraform validation:** Cloud Build trigger `branch` must be in `["main", "develop"]`
  - **Justification:** Prevents accidental builds from feature branches

- [ ] **Build timeout:** Maximum 10 minutes per build
  - **Terraform validation:** `timeout <= "600s"`
  - **Justification:** Prevents stuck builds from consuming quota

- [ ] **Daily quota:** Monitor daily build minutes
  - **Alert:** If daily build minutes > 100 (80% of 120 free tier)
  - **Action:** Review build frequency and optimize build steps

#### Artifact Registry Configuration

- [ ] **Lifecycle policy:** Retain last 3 images OR delete images > 30 days old
  - **Terraform enforcement:** Lifecycle policy configured
  - **Validation:** Script checks image count and age

- [ ] **Storage monitoring:** Alert if storage > 0.4 GB (80% of 0.5 GB free tier)
  - **Action:** Trigger cleanup script

#### Firestore Configuration

- [ ] **Region:** Single region (default, free-tier eligible)
  - **Terraform validation:** No multi-region configuration
  - **Justification:** Multi-region Firestore incurs costs

- [ ] **Indexes:** Only composite indexes defined in `firebase/firestore.indexes.json`
  - **Validation:** No ad-hoc index creation
  - **Justification:** Excessive indexes increase write costs

- [ ] **Daily operation monitoring:** Alert if approaching 80% of free tier
  - **Reads:** Alert if > 40,000 reads/day
  - **Writes:** Alert if > 16,000 writes/day
  - **Deletes:** Alert if > 16,000 deletes/day

#### Cloud Logging Configuration

- [ ] **Retention:** 7 days (free tier default)
  - **Terraform validation:** No log sinks with retention > 7 days
  - **Justification:** Extended retention incurs storage costs

- [ ] **Log exclusion:** Verbose debug logs excluded in production
  - **Application-level:** Use log levels (INFO, WARN, ERROR)
  - **Cloud Logging:** Exclusion filters for verbose logs

- [ ] **Ingestion monitoring:** Alert if ingestion > 40 GB/month (80% of 50 GB free tier)
  - **Action:** Review log verbosity and reduce if needed

#### Firebase Hosting Configuration

- [ ] **Storage:** Monitor storage usage
  - **Alert:** If storage > 8 GB (80% of 10 GB free tier)
  - **Action:** Review and remove unused assets

- [ ] **Transfer:** Monitor daily transfer
  - **Alert:** If daily transfer > 288 MB (80% of 360 MB free tier)
  - **Action:** Review CDN caching and optimize assets

#### Secret Manager Configuration

- [ ] **Secret count:** Must be <= 6 (free tier limit)
  - **Terraform validation:** Count of secrets <= 6
  - **Justification:** Free tier allows 6 secrets

- [ ] **Access monitoring:** Alert if accesses > 8,000/month (80% of 10,000 free tier)
  - **Action:** Review access patterns and cache secrets if possible

#### API Enablement

- [ ] **Unused APIs disabled:** All rejected APIs (per ADR) must be disabled
  - **Terraform enforcement:** `google_project_service` with `disable = true`
  - **Validation:** Script checks enabled APIs against allowed list

- [ ] **API enablement restricted:** Only authorized service accounts can enable APIs
  - **IAM policy:** `roles/serviceusage.serviceUsageAdmin` restricted
  - **Validation:** Audit log review for unauthorized API enablement

### 4.2 Deployment Runbook Checks

#### Pre-Deployment Validation

- [ ] **Terraform plan review:** Verify all resource configurations match this document
- [ ] **Quota verification:** Confirm quotas are set correctly (may require manual `gcloud` commands)
- [ ] **Budget configuration:** Verify budget alerts are configured and tested
- [ ] **Region validation:** Confirm all resources are in free-tier-eligible regions

#### Post-Deployment Validation

- [ ] **Resource verification:** Confirm Cloud Run max_instances=2, min_instances=0
- [ ] **Lifecycle policies:** Verify Artifact Registry lifecycle policy is active
- [ ] **Budget alerts:** Test budget alert notifications (trigger test alert)
- [ ] **Quota monitoring:** Verify quotas are enforced (attempt to exceed quota, confirm failure)

#### Monthly Review

- [ ] **Cost review:** Review Cloud Billing dashboard for unexpected charges
- [ ] **Free tier usage:** Check free tier consumption for each service
- [ ] **Quota usage:** Review quota utilization (approaching limits?)
- [ ] **Lifecycle cleanup:** Verify Artifact Registry cleanup is working
- [ ] **Budget alerts:** Review budget alert history (any false positives?)

### 4.3 Emergency Procedures

#### If Budget Exceeded

1. **Immediate actions:**
   - Review Cloud Billing dashboard to identify cost driver
   - Check Cloud Run instance count (scale to 0 if needed)
   - Disable Cloud Build triggers
   - Review Firestore operation counts

2. **Automated response (if configured):**
   - Pub/Sub trigger → Cloud Function → Disable Cloud Billing (destructive)
   - OR: Scale Cloud Run to 0 instances
   - OR: Disable Cloud Build triggers

3. **Investigation:**
   - Review Cloud Logging for error loops or excessive logging
   - Review Firestore query patterns for inefficient queries
   - Review network egress (unexpected data export?)

#### If Free Tier Exceeded

1. **Cloud Run:** Requests will fail (503) if quota exceeded. Review traffic patterns.
2. **Firestore:** Operations will fail if quota exceeded. Review query patterns.
3. **Cloud Build:** Builds will fail if quota exceeded. Review build frequency.
4. **Artifact Registry:** Storage will incur costs. Trigger cleanup immediately.

---

## 5. Free Tier Mapping & Assumptions

### 5.1 Free Tier Thresholds (Concrete Metrics)

| Service               | Free Tier Limit         | Concrete Metric             | Monitoring Method                            |
| --------------------- | ----------------------- | --------------------------- | -------------------------------------------- |
| **Cloud Run**         | 2M requests/month       | 2,000,000 requests          | Cloud Run metrics (requests count)           |
| **Cloud Run**         | 360K GiB-seconds/month  | 360,000 GiB-seconds         | Cloud Run metrics (memory-seconds)           |
| **Cloud Run**         | 180K vCPU-seconds/month | 180,000 vCPU-seconds        | Cloud Run metrics (cpu-seconds)              |
| **Firestore**         | 50K reads/day           | 50,000 document reads       | Firestore metrics (document_reads)           |
| **Firestore**         | 20K writes/day          | 20,000 document writes      | Firestore metrics (document_writes)          |
| **Firestore**         | 20K deletes/day         | 20,000 document deletes     | Firestore metrics (document_deletes)         |
| **Firebase Hosting**  | 10 GB storage           | 10,000 MB storage           | Firebase Hosting metrics (storage_bytes)     |
| **Firebase Hosting**  | 360 MB/day transfer     | 360 MB/day                  | Firebase Hosting metrics (bytes_transferred) |
| **Firebase Auth**     | 50K MAU                 | 50,000 monthly active users | Firebase Auth metrics (active_users)         |
| **Secret Manager**    | 6 secrets               | 6 secret versions           | Secret Manager API (list secrets)            |
| **Secret Manager**    | 10K accesses/month      | 10,000 access operations    | Secret Manager metrics (access_count)        |
| **Artifact Registry** | 0.5 GB storage          | 500 MB storage              | Artifact Registry metrics (storage_bytes)    |
| **Cloud Build**       | 120 build-min/day       | 120 build-minutes           | Cloud Build metrics (build_minutes)          |
| **Cloud Logging**     | 50 GB ingestion/month   | 50,000 MB ingestion         | Cloud Logging metrics (ingested_bytes)       |
| **Cloud Logging**     | 7-day retention         | 7 days                      | Cloud Logging configuration (retention_days) |

### 5.2 Free Tier Limitations & Assumptions

#### Region Restrictions

- **Assumption:** Free tier applies only to specific regions (e.g., `us-central1`, `us-east1`).
- **Risk:** Deploying to non-free-tier regions may incur costs immediately.
- **Mitigation:** Terraform validation restricts regions to free-tier-eligible list.

#### Policy Changes

- **Assumption:** GCP free tier policies may change. Google reserves the right to modify free tier limits.
- **Risk:** Free tier limits may be reduced or removed.
- **Mitigation:** Monitor GCP announcements. Budget alerts provide early warning if costs appear.

#### Usage Patterns

- **Assumption:** Free tier applies to "normal" usage patterns. Abuse or excessive usage may be throttled or charged.
- **Risk:** Sudden traffic spikes may be interpreted as abuse.
- **Mitigation:** Cloud Run max_instances=2 caps scaling. Quotas enforce hard limits.

#### Billing Account Requirement

- **Assumption:** Free tier requires a billing account to be linked (even if $0 is charged).
- **Risk:** If billing account is removed, services may be disabled.
- **Mitigation:** Ensure billing account remains linked. Monitor billing account status.

#### Free Tier Not Guaranteed

- **Assumption:** Free tier is a "best effort" offering. Google does not guarantee free tier availability.
- **Risk:** Free tier may be unavailable due to capacity or policy changes.
- **Mitigation:** Budget alerts provide early warning. Hard limits (quotas) prevent unbounded spending.

---

## 6. Terraform Implementation Examples

### 6.1 Cloud Run with Hard Limits

```hcl
# Example: Cloud Run service with all hard limits enforced
resource "google_cloud_run_v2_service" "auth_app_api" {
  name     = "rates-${var.environment}-api-${var.region}"
  location = var.region

  template {
    scaling {
      max_instance_count = 2   # HARD LIMIT
      min_instance_count = 0   # REQUIRED
    }

    max_instance_request_concurrency = 80
    timeout                          = "30s"

    containers {
      resources {
        cpu_idle = true
        cpu      = "1"
        memory   = "512Mi"
      }
    }
  }

  # Validation (Terraform 1.5+)
  lifecycle {
    precondition {
      condition     = var.max_instances <= 2
      error_message = "max_instances must be <= 2 to stay within cost guardrails"
    }
    precondition {
      condition     = var.min_instances == 0
      error_message = "min_instances must be 0 to enable scale-to-zero"
    }
  }
}
```

### 6.2 Artifact Registry with Lifecycle Policy

```hcl
# Example: Artifact Registry with lifecycle cleanup
resource "google_artifact_registry_repository" "containers" {
  name      = "rates-${var.environment}-containers"
  location  = var.region
  format    = "DOCKER"
}

# Lifecycle cleanup (via null_resource)
resource "null_resource" "artifact_cleanup" {
  triggers = {
    repository = google_artifact_registry_repository.containers.name
  }

  provisioner "local-exec" {
    command = <<-EOT
      # Retain last 3 images, delete older ones
      gcloud artifacts docker images list \
        --repository=${google_artifact_registry_repository.containers.name} \
        --location=${var.region} \
        --format="value(package)" \
        --sort-by=~createTime \
        | tail -n +4 \
        | xargs -I {} gcloud artifacts docker images delete {} --delete-tags --quiet || true
    EOT
  }
}
```

### 6.3 Budget with Alerts

```hcl
# Example: Budget configuration with multiple alert thresholds
resource "google_billing_budget" "monthly_budget" {
  billing_account = var.billing_account_id
  display_name    = "Rates Monorepo - Monthly Budget"

  budget_filter {
    projects = ["projects/${var.project_id}"]
  }

  amount {
    specified_amount {
      currency_code = "USD"
      units         = "10"
    }
  }

  threshold_rules {
    threshold_percent = 0.5
    spend_basis       = "CURRENT_SPEND"
  }
  threshold_rules {
    threshold_percent = 0.8
    spend_basis       = "CURRENT_SPEND"
  }
  threshold_rules {
    threshold_percent = 1.0
    spend_basis       = "CURRENT_SPEND"
  }

  all_updates_rule {
    monitoring_notification_channels = [
      google_monitoring_notification_channel.email.id
    ]
    pubsub_topic = google_pubsub_topic.billing_alerts.id
  }
}
```

---

## 7. Document Governance

**Change Process:**

1. Any deviation from these guardrails requires formal approval
2. Changes must be approved by Lead Google Cloud Architect & FinOps Specialist
3. Terraform configurations must reference this document
4. All changes must maintain fail-safe principles (hard limits > soft alerts)

**Review Cycle:**

- This document is locked for Terraform implementation phase
- Monthly review of cost guardrails effectiveness
- Quarterly review of free tier limits and GCP policy changes
- All amendments must maintain fail-safe cost control

---

## 8. Summary

**Key Principles:**

1. **Hard limits > Soft alerts:** Quotas and resource caps prevent spending; budgets inform.
2. **Fail-safe design:** System stops scaling/running rather than allowing unbounded costs.
3. **Free tier optimization:** All configurations prioritize free tier compliance.
4. **Hidden cost awareness:** Network egress, logging, and API enablement are monitored.

**Critical Guardrails:**

- Cloud Run: max_instances=2, min_instances=0, timeout=30s
- Cloud Build: 120 build-min/day quota, protected branch triggers only
- Artifact Registry: Lifecycle policy (retain last 3 images OR 30-day retention)
- Budget: $10/month absolute maximum with multi-threshold alerts
- Quotas: Enforced at free tier limits (requests, operations, storage)

**Next Steps:**

1. Implement Terraform configurations with these guardrails
2. Set quotas via `gcloud` or Organization Policies
3. Configure budget alerts and test notifications
4. Deploy monitoring scripts for free tier consumption tracking
5. Document emergency procedures in runbook

---

**Document End**

This cost guardrails document represents the fail-safe cost control strategy for the Rates monorepo GCP deployment. All Terraform implementations must enforce these limits to prevent bill shock and maintain free tier compliance.
