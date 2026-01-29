#!/usr/bin/env bash

# ============================================================================
# PROMPTS - User Interaction Functions
# ============================================================================
# Purpose: Centralized user interaction and input functions
# Usage: Source this file after colors.sh and logging.sh
# Dependencies: colors.sh, logging.sh
# ============================================================================

set -euo pipefail

# ============================================================================
# Confirmation Prompt
# ============================================================================

confirm() {
    local prompt="${1:-Continue?}"
    local default="${2:-y}"
    
    if [[ "${default}" == "y" ]]; then
        prompt="${prompt} [Y/n]: "
    else
        prompt="${prompt} [y/N]: "
    fi
    
    while true; do
        read -rp "$(echo -e "${YELLOW}${prompt}${NC}")" response
        response="${response:-$default}"
        # Convert to lowercase portably (works in both bash and zsh)
        response_lower=$(echo "$response" | tr '[:upper:]' '[:lower:]')
        case "$response_lower" in
            y|yes) return 0 ;;
            n|no) return 1 ;;
            *) echo "Please answer yes or no." ;;
        esac
    done
}

# ============================================================================
# Input Prompt
# ============================================================================

prompt_input() {
    local prompt="$1"
    local default="${2:-}"
    local var_name="$3"
    local value
    
    if [[ -n "${default}" ]]; then
        read -rp "$(echo -e "${CYAN}${prompt}${NC} [${default}]: ")" value
        value="${value:-$default}"
    else
        read -rp "$(echo -e "${CYAN}${prompt}${NC}: ")" value
    fi
    
    eval "${var_name}='${value}'"
}

# ============================================================================
# Secret Input Prompt
# ============================================================================

prompt_secret() {
    local prompt="$1"
    local var_name="$2"
    local value
    
    read -srp "$(echo -e "${CYAN}${prompt}${NC}: ")" value
    echo ""
    
    eval "${var_name}='${value}'"
}

# ============================================================================
# Wait for User
# ============================================================================

wait_for_enter() {
    echo ""
    read -rp "$(echo -e "${YELLOW}Press Enter to continue...${NC}")"
}
