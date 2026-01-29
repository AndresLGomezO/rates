#!/bin/bash
# ============================================================================
# Verify Nonce Secret in Builds
# ============================================================================
# This script verifies that both app and auth-app builds have the same nonce secret
# ============================================================================

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}============================================================================${NC}"
echo -e "${BLUE}Nonce Secret Verification${NC}"
echo -e "${BLUE}============================================================================${NC}"
echo ""

# Check app build
echo -e "${BLUE}Checking app build...${NC}"
APP_SECRET=$(grep -roh 'VITE_NONCE_SECRET:"[^"]*"' apps/app/dist/assets/*.js 2>/dev/null | head -1 | grep -o '"[^"]*"' | tr -d '"' || echo "")

if [ -z "${APP_SECRET}" ]; then
    echo -e "${RED}✗ App build: Nonce secret NOT FOUND${NC}"
else
    echo -e "${GREEN}✓ App build: Nonce secret found${NC}"
    echo "  Length: ${#APP_SECRET} chars"
    echo "  First 16 chars: ${APP_SECRET:0:16}..."
    echo "  Last 16 chars: ...${APP_SECRET: -16}"
fi

echo ""

# Check auth-app build
echo -e "${BLUE}Checking auth-app build...${NC}"
AUTH_APP_SECRET=$(grep -roh 'VITE_NONCE_SECRET:"[^"]*"' apps/auth-app/dist/assets/*.js 2>/dev/null | head -1 | grep -o '"[^"]*"' | tr -d '"' || echo "")

if [ -z "${AUTH_APP_SECRET}" ]; then
    echo -e "${RED}✗ Auth-app build: Nonce secret NOT FOUND${NC}"
    echo -e "${YELLOW}  This is the problem! Auth-app needs to be rebuilt with the nonce secret.${NC}"
else
    echo -e "${GREEN}✓ Auth-app build: Nonce secret found${NC}"
    echo "  Length: ${#AUTH_APP_SECRET} chars"
    echo "  First 16 chars: ${AUTH_APP_SECRET:0:16}..."
    echo "  Last 16 chars: ...${AUTH_APP_SECRET: -16}"
fi

echo ""

# Compare secrets
if [ -n "${APP_SECRET}" ] && [ -n "${AUTH_APP_SECRET}" ]; then
    if [ "${APP_SECRET}" = "${AUTH_APP_SECRET}" ]; then
        echo -e "${GREEN}✓ Secrets MATCH - Both apps use the same nonce secret${NC}"
    else
        echo -e "${RED}✗ Secrets DO NOT MATCH${NC}"
        echo -e "${RED}  This will cause 'Invalid nonce signature' errors${NC}"
        echo ""
        echo "App secret (first 32 chars):     ${APP_SECRET:0:32}..."
        echo "Auth-app secret (first 32 chars): ${AUTH_APP_SECRET:0:32}..."
    fi
elif [ -z "${AUTH_APP_SECRET}" ]; then
    echo -e "${RED}✗ Auth-app build is missing the nonce secret${NC}"
    echo -e "${YELLOW}  Solution: Rebuild auth-app with the nonce secret${NC}"
    echo ""
    echo "To fix:"
    echo "  1. Run: ./deploy-dev.sh"
    echo "  2. Select option to build auth-app client"
    echo "  3. Or manually set VITE_NONCE_SECRET in apps/auth-app/.env and rebuild"
elif [ -z "${APP_SECRET}" ]; then
    echo -e "${RED}✗ App build is missing the nonce secret${NC}"
    echo -e "${YELLOW}  Solution: Rebuild app with the nonce secret${NC}"
fi

echo ""
echo -e "${BLUE}============================================================================${NC}"
