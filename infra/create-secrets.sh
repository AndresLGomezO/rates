#!/bin/bash
# Helper script to create secret values for dev and prod environments
# These secrets are shared by both Cloud Run services (auth-app API and app)
# Usage: ./create-secrets.sh [dev|prod|both]

set -e

PROJECT_ID="${GCP_PROJECT_ID:-dev-rates}"
ENVIRONMENT="${1:-both}"

echo "============================================================================"
echo "Creating Secret Values for Rates Infrastructure"
echo "============================================================================"
echo ""
echo "Note: These secrets are shared by both Cloud Run services:"
echo "  • auth-app API (rates-{env}-api-{region})"
echo "  • app (rates-{env}-app-{region})"
echo ""

# Function to create Firebase service account if needed
create_firebase_service_account() {
    local env=$1
    echo "📋 Step 1: Setting up Firebase service account for ${env}..." >&2
    
    # Check if service account exists
    if ! gcloud iam service-accounts describe "firebase-admin@${PROJECT_ID}.iam.gserviceaccount.com" --project="${PROJECT_ID}" &>/dev/null; then
        echo "   Creating Firebase Admin service account..." >&2
        gcloud iam service-accounts create firebase-admin \
            --display-name="Firebase Admin Service Account" \
            --project="${PROJECT_ID}" >&2
        
        echo "   Granting Firebase Admin role..." >&2
        # Use --condition=None to avoid interactive prompts when organization policies require conditions
        gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
            --member="serviceAccount:firebase-admin@${PROJECT_ID}.iam.gserviceaccount.com" \
            --role="roles/firebase.admin" \
            --condition=None \
            --project="${PROJECT_ID}" >&2 2>/dev/null || \
        gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
            --member="serviceAccount:firebase-admin@${PROJECT_ID}.iam.gserviceaccount.com" \
            --role="roles/firebase.admin" \
            --project="${PROJECT_ID}" >&2 2>/dev/null || true
    else
        echo "   ✓ Service account already exists" >&2
    fi
    
    # Create key file
    KEY_FILE="${HOME}/firebase-service-account-${env}.json"
    if [ ! -f "${KEY_FILE}" ]; then
        echo "   Creating service account key..." >&2
        gcloud iam service-accounts keys create "${KEY_FILE}" \
            --iam-account="firebase-admin@${PROJECT_ID}.iam.gserviceaccount.com" \
            --project="${PROJECT_ID}" >&2
        echo "   ✓ Key saved to: ${KEY_FILE}" >&2
    else
        echo "   ✓ Key file already exists: ${KEY_FILE}" >&2
    fi
    
    # Return only the file path to stdout
    echo "${KEY_FILE}"
}

# Function to add secrets for an environment
add_secrets_for_env() {
    local env=$1
    local secret_prefix="rates-${env}"
    
    echo ""
    echo "============================================================================"
    echo "Creating secrets for ${env} environment"
    echo "============================================================================"
    
    # Get or create Firebase service account key
    KEY_FILE=$(create_firebase_service_account "${env}")
    
    # Add Firebase service account secret
    # This secret is used by both auth-app API and app services
    echo ""
    echo "📋 Step 2: Adding Firebase service account secret..."
    echo "   (This secret is shared by auth-app API and app services)"
    if gcloud secrets versions list "${secret_prefix}-firebase-sa" --project="${PROJECT_ID}" --format="value(name)" 2>/dev/null | grep -q "versions"; then
        echo "   ⚠️  Secret already has a version. Adding new version..."
    fi
    
    gcloud secrets versions add "${secret_prefix}-firebase-sa" \
        --data-file="${KEY_FILE}" \
        --project="${PROJECT_ID}"
    echo "   ✓ Firebase service account secret added"
    
    # Generate and add nonce secret
    # This secret is used by both auth-app API and app services
    echo ""
    echo "📋 Step 3: Generating and adding nonce secret..."
    echo "   (This secret is shared by auth-app API and app services)"
    NONCE_SECRET=$(openssl rand -hex 32)
    echo -n "${NONCE_SECRET}" | gcloud secrets versions add "${secret_prefix}-nonce-secret" \
        --data-file=- \
        --project="${PROJECT_ID}"
    echo "   ✓ Nonce secret added"
    
    # Save nonce secret to a file for reference
    NONCE_FILE="${HOME}/.rates-nonce-${env}.txt"
    echo "${NONCE_SECRET}" > "${NONCE_FILE}"
    chmod 600 "${NONCE_FILE}"
    echo "   📝 Nonce secret saved to: ${NONCE_FILE}"
    
    echo ""
    echo "✅ ${env} environment secrets created successfully!"
    echo ""
}

# Main execution
case "${ENVIRONMENT}" in
    dev)
        add_secrets_for_env "dev"
        ;;
    prod)
        add_secrets_for_env "prod"
        ;;
    both|*)
        add_secrets_for_env "dev"
        add_secrets_for_env "prod"
        ;;
esac

echo "============================================================================"
echo "✅ All secrets created successfully!"
echo "============================================================================"
echo ""

# Automatically update terraform.tfvars files
update_terraform_tfvars() {
    local env=$1
    local tfvars_file="environments/application/${env}/terraform.tfvars"
    
    if [ -f "${tfvars_file}" ]; then
        echo "📝 Updating ${tfvars_file} to enable secrets..."
        # Update include_secrets from false to true
        if sed -i.bak "s/include_secrets[[:space:]]*=[[:space:]]*false/include_secrets = true/" "${tfvars_file}" 2>/dev/null; then
            rm -f "${tfvars_file}.bak"
            echo "   ✓ Updated ${tfvars_file}"
            return 0
        else
            echo "   ⚠️  Could not automatically update ${tfvars_file}"
            return 1
        fi
    else
        echo "   ⚠️  ${tfvars_file} not found, skipping update"
        return 1
    fi
}

# Update terraform.tfvars based on environment
case "${ENVIRONMENT}" in
    dev)
        update_terraform_tfvars "dev"
        ;;
    prod)
        update_terraform_tfvars "prod"
        ;;
    both|*)
        update_terraform_tfvars "dev"
        update_terraform_tfvars "prod"
        ;;
esac

echo ""
echo "============================================================================"
echo "Next Steps"
echo "============================================================================"
echo ""
echo "1. ✅ Secrets created and values added"
echo "   (These secrets are shared by both auth-app API and app services)"
echo "2. ✅ terraform.tfvars updated (include_secrets = true)"
echo ""
echo "3. Update Cloud Run services to use secrets:"
echo "   (This will update both auth-app API and app services)"
echo ""
case "${ENVIRONMENT}" in
    dev)
        echo "   cd environments/application/dev"
        echo "   terraform apply"
        ;;
    prod)
        echo "   cd environments/application/prod"
        echo "   terraform apply -var=\"deployment_approved=true\""
        ;;
    both|*)
        echo "   # For DEV:"
        echo "   cd environments/application/dev"
        echo "   terraform apply"
        echo ""
        echo "   # For PROD:"
        echo "   cd environments/application/prod"
        echo "   terraform apply -var=\"deployment_approved=true\""
        ;;
esac
echo ""
echo "4. After updating Cloud Run services, you can build and push container images:"
echo "   • Build and push auth-app API image (./apps/auth-app)"
echo "   • Build and push app image (./apps/app)"
echo "   (See the manual_steps_required output from terraform for details)"
echo ""
echo "5. The following Cloud Run services will be updated:"
case "${ENVIRONMENT}" in
    dev)
        echo "   • rates-dev-api-{region} (auth-app API)"
        echo "   • rates-dev-app-{region} (app)"
        ;;
    prod)
        echo "   • rates-prod-api-{region} (auth-app API)"
        echo "   • rates-prod-app-{region} (app)"
        ;;
    both|*)
        echo "   DEV:"
        echo "     • rates-dev-api-{region} (auth-app API)"
        echo "     • rates-dev-app-{region} (app)"
        echo "   PROD:"
        echo "     • rates-prod-api-{region} (auth-app API)"
        echo "     • rates-prod-app-{region} (app)"
        ;;
esac
echo "   (Replace {region} with your actual GCP region, e.g., us-central1)"
echo ""
