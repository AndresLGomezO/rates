#!/usr/bin/env bash

# ============================================================================
# CONFIG - Configuration Management
# ============================================================================
# Purpose: Load and save setup configuration state
# Usage: Source this file after logging.sh
# Dependencies: logging.sh
# ============================================================================

set -euo pipefail

# Get the script directory for config file location
readonly CONFIG_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
readonly CONFIG_FILE="${CONFIG_SCRIPT_DIR}/.setup.config"

# ============================================================================
# Configuration Variables
# ============================================================================
# These variables are managed by load/save functions
# They are sourced from .setup.config if it exists

PROJECT_ID="${PROJECT_ID:-}"
REGION="${REGION:-}"
BILLING_ACCOUNT_ID="${BILLING_ACCOUNT_ID:-}"
BUDGET_ALERT_EMAIL="${BUDGET_ALERT_EMAIL:-}"
CURRENT_PHASE="${CURRENT_PHASE:-0}"

# ============================================================================
# Save Configuration
# ============================================================================

save_configuration() {
    cat > "${CONFIG_FILE}" <<EOF
# Rates Infrastructure Setup Configuration
# Generated: $(date)

PROJECT_ID="${PROJECT_ID}"
REGION="${REGION}"
BILLING_ACCOUNT_ID="${BILLING_ACCOUNT_ID}"
BUDGET_ALERT_EMAIL="${BUDGET_ALERT_EMAIL}"
CURRENT_PHASE="${CURRENT_PHASE}"
EOF
    
    print_info "Configuration saved to ${CONFIG_FILE}"
    log "Configuration saved"
}

# ============================================================================
# Load Configuration
# ============================================================================

load_configuration() {
    if [[ -f "${CONFIG_FILE}" ]]; then
        # shellcheck source=/dev/null
        source "${CONFIG_FILE}"
        print_info "Loaded configuration from ${CONFIG_FILE}"
        log "Configuration loaded"
        return 0
    else
        return 1
    fi
}
