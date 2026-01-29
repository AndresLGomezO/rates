#!/usr/bin/env bash

# ============================================================================
# LOGGING - Output and Logging Functions
# ============================================================================
# Purpose: Centralized logging and output formatting functions
# Usage: Source this file after colors.sh to access logging functions
# Dependencies: colors.sh
# ============================================================================

set -euo pipefail

# Get the script directory for log file location
readonly LOGGING_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
readonly LOG_FILE="${LOG_FILE:-${LOGGING_SCRIPT_DIR}/.setup.log}"

# ============================================================================
# Core Logging Function
# ============================================================================

log() {
    local timestamp
    timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[${timestamp}] $*" >> "${LOG_FILE}"
}

# ============================================================================
# Formatted Output Functions
# ============================================================================

print_header() {
    echo ""
    echo -e "${BLUE}╔══════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║${NC} ${BOLD}$1${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    log "HEADER: $1"
}

print_section() {
    echo ""
    echo -e "${CYAN}────────────────────────────────────────────────────────────────────────${NC}"
    echo -e "${CYAN}  $1${NC}"
    echo -e "${CYAN}────────────────────────────────────────────────────────────────────────${NC}"
    echo ""
    log "SECTION: $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
    log "SUCCESS: $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1" >&2
    log "ERROR: $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
    log "WARNING: $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
    log "INFO: $1"
}

print_step() {
    echo -e "${BOLD}→${NC} $1"
    log "STEP: $1"
}
