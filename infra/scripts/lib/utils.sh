#!/usr/bin/env bash

# ============================================================================
# UTILS - Shared Utility Functions
# ============================================================================
# Purpose: Common utility functions used across modules
# Usage: Source this file after logging.sh
# Dependencies: logging.sh
# ============================================================================

set -euo pipefail

# ============================================================================
# Command Availability Check
# ============================================================================

check_command() {
    local cmd="$1"
    local name="${2:-$1}"
    
    if command -v "${cmd}" &> /dev/null; then
        print_success "${name} is installed"
        return 0
    else
        print_error "${name} is not installed"
        return 1
    fi
}

# ============================================================================
# Run Command with Logging
# ============================================================================

run_command() {
    local description="$1"
    shift
    local command=("$@")
    
    print_step "${description}..."
    log "COMMAND: ${command[*]}"
    
    if "${command[@]}" >> "${LOG_FILE}" 2>&1; then
        print_success "${description}"
        return 0
    else
        print_error "${description} failed"
        print_info "Check ${LOG_FILE} for details"
        return 1
    fi
}

# ============================================================================
# Spinner for Long-Running Commands
# ============================================================================

spinner() {
    local pid=$1
    local delay=0.1
    local spinstr='|/-\\'
    while ps -p "$pid" > /dev/null 2>&1; do
        local temp=${spinstr#?}
        printf " [%c]  " "$spinstr"
        local spinstr=$temp${spinstr%"$temp"}
        sleep $delay
        printf "\b\b\b\b\b\b"
    done
    printf "      \b\b\b\b\b\b"
}
