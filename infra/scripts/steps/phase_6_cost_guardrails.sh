#!/usr/bin/env bash

# ============================================================================
# PHASE 6: COST GUARDRAILS & VERIFICATION
# ============================================================================
# Purpose: Verify all infrastructure and provide cost guidance
# Dependencies: All libraries
# ============================================================================

set -euo pipefail

phase_6_cost_guardrails() {
    print_header "PHASE 6: Cost Guardrails & Verification"
    
    cat <<EOF
This final phase verifies your infrastructure deployment and provides
cost monitoring guidance:

  • Verify all resources are deployed
  • Review budget and cost alerts
  • Provide cost optimization tips
  • Show service URLs and next steps

EOF

    wait_for_enter

    # -------------------------------------------------------------------------
    # Verification
    # -------------------------------------------------------------------------
    print_section "Infrastructure Verification"
    
    print_step "Checking state bucket..."
    if gcloud_verify_bucket "${STATE_BUCKET_NAME}"; then
        print_success "State bucket verified"
    else
        print_warning "State bucket not found"
    fi
    
    print_step "Checking Cloud Run services..."
    local services
    services=$(gcloud run services list --project="${PROJECT_ID}" --format="value(name)" 2>/dev/null || echo "")
    
    if [[ -n "${services}" ]]; then
        print_success "Found $(echo "${services}" | wc -l) Cloud Run service(s)"
        echo "${services}" | while read -r svc; do
            print_info "  • ${svc}"
        done
    else
        print_warning "No Cloud Run services found"
    fi
    
    print_step "Checking Artifact Registry repositories..."
    local repos
    repos=$(gcloud artifacts repositories list --project="${PROJECT_ID}" --location="${REGION}" --format="value(name)" 2>/dev/null || echo "")
   
    if [[ -n "${repos}" ]]; then
        print_success "Found $(echo "${repos}" | wc -l) repository(ies)"
    else
        print_warning "No Artifact Registry repositories found"
    fi

    # -------------------------------------------------------------------------
    # Cost Monitoring Guidance
    # -------------------------------------------------------------------------
    print_section "Cost Monitoring & Optimization"
    
    cat <<EOF

Cost Management Tips:
──────────────────────────────────────────────────────────────────────────

1. **Monitor Your Budget**
   - View billing: https://console.cloud.google.com/billing
   - Set up alerts at 50%, 80%, 100% of budget
   - Current budget: \$${BUDGET_AMOUNT:-10}/month

2. **Free Tier Resources**
   - Cloud Run: 2 million requests/month
   - Cloud Build: 120 build-minutes/day
   - Secret Manager: 6 active secret versions
   - Firestore: 1 GB storage, 50K reads/day

3. **Cost Optimization**
   - Delete unused container images
   - Set min instances to 0 for dev
   - Use Cloud Run concurrency effectively
   - Monitor logs for errors (avoid retry loops)

4. **Regular Cleanup**
   - Review old Cloud Build images
   - Check Secret Manager versions
   - Monitor Firestore usage

──────────────────────────────────────────────────────────────────────────
EOF

    # -------------------------------------------------------------------------
    # Next Steps
    # -------------------------------------------------------------------------
    print_section "Next Steps"
    
    cat <<'EOF'

Your infrastructure is deployed! Here's what to do next:

1. **Verify Services**
   - Check Cloud Run URLs:
     gcloud run services list --project=${PROJECT_ID}
   
   - Test API endpoints
   - Test Web App

2. **Monitor Deployment**
   - View logs:
     gcloud logging read "resource.type=cloud_run_revision" \
       --project=${PROJECT_ID} --limit=50
   
   - View Cloud Build history:
     gcloud builds list --project=${PROJECT_ID} --limit=10

3. **Continuous Deployment**
   - Push code changes to trigger builds (if CI/CD enabled)
   - Or rebuild manually:
     cd infra && ./setup.sh --phase 3  # For dev
     cd infra && ./setup.sh --phase 4  # For prod

4. **Useful Commands**
   - Re-run setup: ./setup.sh
   - View status: ./setup.sh --status
   - Jump to phase: ./setup.sh --phase N
   - Get help: ./setup.sh --help

5. **Documentation**
   - Implementation Plan: docs/IMPLEMENTATION_PLAN.md
   - Terraform Design: docs/TERRAFORM_DESIGN.md
   - Cost Guardrails: docs/COST_GUARDRAILS.md

EOF

    # -------------------------------------------------------------------------
    # Service URLs
    # -------------------------------------------------------------------------
    print_section "Service URLs"
    
    echo ""
    echo "Cloud Run Services:"
    echo "──────────────────────────────────────────────────────────────────────────"
    gcloud run services list \
        --project="${PROJECT_ID}" \
        --format="table(name,region,url)" 2>/dev/null || echo "No services found"
    echo ""

    # -------------------------------------------------------------------------
    # Completion
    # -------------------------------------------------------------------------
    CURRENT_PHASE=6
    save_configuration
    
    print_success "Phase 6 (Cost Guardrails) complete!"
    
    cat <<EOF

╔═══════════════════════════════════════════════════════════════════════╗
║                                                                       ║
║   🎉  SETUP COMPLETE!                                                 ║
║                                                                       ║
║   Your Rates infrastructure is deployed and ready to use.            ║
║                                                                       ║
╚═══════════════════════════════════════════════════════════════════════╝

EOF
    
    print_success "All phases complete! Infrastructure is ready."
    
    return 0
}
