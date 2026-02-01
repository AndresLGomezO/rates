#!/usr/bin/env bash

# ============================================================================
# COLORS - ANSI Color Constants
# ============================================================================
# Purpose: Centralized ANSI color definitions for styled terminal output
# Usage: Source this file to access color constants
# Dependencies: None
# ============================================================================

# Text colors
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly CYAN='\033[0;36m'

# Text styles
readonly BOLD='\033[1m'

# Reset
readonly NC='\033[0m' # No Color
