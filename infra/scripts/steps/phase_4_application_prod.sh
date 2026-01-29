#!/usr/bin/env bash

# ============================================================================
# PHASE 4: APPLICATION LAYER - PRODUCTION
# ============================================================================
# Purpose: Thin wrapper to deploy production application
# Dependencies: phase_3_application.sh
# ============================================================================

set -euo pipefail

phase_4_application_prod() {
    # Call the environment-agnostic function with prod parameters
    phase_3_application "prod" "Production"
    
    local result=$?
    
    if [[ $result -eq 0 ]]; then
        CURRENT_PHASE=4
        save_configuration
        
        print_success "Phase 4 (Application - Production) complete!"
        
        if confirm "Proceed to Phase 5 (CI/CD)?"; then
            return 0
        else
            print_info "You can resume later with: ./setup.sh --phase 5"
            return 1
        fi
    fi
    
    return $result
}
