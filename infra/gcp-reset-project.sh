#!/usr/bin/env bash

#===============================================================================
# GCP PROJECT RESET SCRIPT - Enterprise Edition
# Author: GCP PCA Architect
# Version: 2.0.0
# Description: Interactively reset a GCP project to near-initial state
#===============================================================================

set -o pipefail

#-------------------------------------------------------------------------------
# CONFIGURATION
#-------------------------------------------------------------------------------
readonly SCRIPT_VERSION="2.0.0"
readonly LOG_DIR="${HOME}/.gcp-reset-logs"
readonly PROTECTED_SERVICES=(
    "cloudresourcemanager.googleapis.com"
    "iam.googleapis.com"
    "iamcredentials.googleapis.com"
    "serviceusage.googleapis.com"
)

#-------------------------------------------------------------------------------
# COLOR DEFINITIONS
#-------------------------------------------------------------------------------
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly PURPLE='\033[0;35m'
readonly CYAN='\033[0;36m'
readonly NC='\033[0m' # No Color
readonly BOLD='\033[1m'

#-------------------------------------------------------------------------------
# GLOBAL VARIABLES
#-------------------------------------------------------------------------------
PROJECT_ID=""
DRY_RUN=false
VERBOSE=false
LOG_FILE=""
SKIP_CONFIRMATION=false
SELECTIVE_MODE=false

#-------------------------------------------------------------------------------
# UTILITY FUNCTIONS
#-------------------------------------------------------------------------------

print_banner() {
    echo -e "${PURPLE}"
    cat << 'EOF'
   ______ _____ _____    _____                _   
  / ____// ____|  __ \  |  __ \              | |  
 | |  __| |    | |__) | | |__) | ___  ___  __| |_ 
 | | |_ | |    |  ___/  |  _  / / _ \/ __|/ _ \ __|
 | |__| | |____| |      | | \ \|  __/\__ \  __/ |_ 
  \_____|\_____|_|      |_|  \_\\___||___/\___|\__|
                                                   
EOF
    echo -e "${NC}"
    echo -e "${BOLD}Version: ${SCRIPT_VERSION}${NC}"
    echo -e "${YELLOW}⚠️  GCP PROJECT HARD RESET SCRIPT${NC}"
    echo "=========================================="
}

log() {
    local level=$1
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    case $level in
        INFO)    echo -e "${BLUE}[INFO]${NC} $message" ;;
        SUCCESS) echo -e "${GREEN}[✓]${NC} $message" ;;
        WARNING) echo -e "${YELLOW}[⚠]${NC} $message" ;;
        ERROR)   echo -e "${RED}[✗]${NC} $message" ;;
        DEBUG)   [[ "$VERBOSE" == true ]] && echo -e "${CYAN}[DEBUG]${NC} $message" ;;
        STEP)    echo -e "\n${BOLD}${PURPLE}▶ $message${NC}" ;;
    esac
    
    # Write to log file
    if [[ -n "$LOG_FILE" ]]; then
        echo "[$timestamp] [$level] $message" >> "$LOG_FILE"
    fi
}

spinner() {
    local pid=$1
    local delay=0.1
    local spinstr='|/-\'
    while ps -p $pid > /dev/null 2>&1; do
        local temp=${spinstr#?}
        printf " [%c]  " "$spinstr"
        local spinstr=$temp${spinstr%"$temp"}
        sleep $delay
        printf "\b\b\b\b\b\b"
    done
    printf "    \b\b\b\b"
}

confirm() {
    local message=$1
    local response
    
    if [[ "$SKIP_CONFIRMATION" == true ]]; then
        return 0
    fi
    
    echo -e "${YELLOW}$message${NC}"
    read -p "(y/N): " response
    [[ "$response" =~ ^[Yy]$ ]]
}

check_dry_run() {
    if [[ "$DRY_RUN" == true ]]; then
        log WARNING "[DRY-RUN] Would execute: $*"
        return 1
    fi
    return 0
}

execute() {
    local cmd="$*"
    log DEBUG "Executing: $cmd"
    
    if [[ "$DRY_RUN" == true ]]; then
        log WARNING "[DRY-RUN] $cmd"
        return 0
    fi
    
    eval "$cmd"
}

#-------------------------------------------------------------------------------
# PREREQUISITE CHECKS
#-------------------------------------------------------------------------------

check_prerequisites() {
    log STEP "Checking Prerequisites"
    
    local missing_tools=()
    
    # Check required tools
    local required_tools=("gcloud" "jq" "gsutil")
    for tool in "${required_tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            missing_tools+=("$tool")
        else
            log SUCCESS "$tool is installed"
        fi
    done
    
    if [[ ${#missing_tools[@]} -gt 0 ]]; then
        log ERROR "Missing required tools: ${missing_tools[*]}"
        echo ""
        echo "Install missing tools:"
        echo "  - gcloud: https://cloud.google.com/sdk/docs/install"
        echo "  - jq: brew install jq (macOS) or apt-get install jq (Linux)"
        exit 1
    fi
    
    # Check gcloud authentication
    if ! gcloud auth list --filter="status:ACTIVE" --format="value(account)" &> /dev/null; then
        log ERROR "No active gcloud authentication found"
        echo "Run: gcloud auth login"
        exit 1
    fi
    
    local active_account=$(gcloud auth list --filter="status:ACTIVE" --format="value(account)" 2>/dev/null)
    log SUCCESS "Authenticated as: $active_account"
    
    # Create log directory
    mkdir -p "$LOG_DIR"
    LOG_FILE="${LOG_DIR}/reset-${PROJECT_ID:-unknown}-$(date '+%Y%m%d-%H%M%S').log"
    log SUCCESS "Log file: $LOG_FILE"
}

#-------------------------------------------------------------------------------
# PROJECT VALIDATION
#-------------------------------------------------------------------------------

validate_project() {
    log STEP "Validating Project Access"
    
    if ! gcloud projects describe "$PROJECT_ID" &> /dev/null; then
        log ERROR "Cannot access project: $PROJECT_ID"
        log ERROR "Check that the project exists and you have permissions"
        exit 1
    fi
    
    local project_name=$(gcloud projects describe "$PROJECT_ID" --format="value(name)")
    local project_state=$(gcloud projects describe "$PROJECT_ID" --format="value(lifecycleState)")
    
    log SUCCESS "Project found: $project_name"
    log INFO "Project state: $project_state"
    
    if [[ "$project_state" != "ACTIVE" ]]; then
        log ERROR "Project is not in ACTIVE state. Current state: $project_state"
        exit 1
    fi
    
    # Check user's role
    local user_email=$(gcloud auth list --filter="status:ACTIVE" --format="value(account)")
    local user_roles=$(gcloud projects get-iam-policy "$PROJECT_ID" \
        --flatten="bindings[].members" \
        --format="value(bindings.role)" \
        --filter="bindings.members:$user_email" 2>/dev/null | sort -u)
    
    log INFO "Your roles in this project:"
    echo "$user_roles" | while read -r role; do
        echo "  - $role"
    done
    
    if ! echo "$user_roles" | grep -qE "(roles/owner|roles/editor)"; then
        log WARNING "You may not have sufficient permissions for all operations"
    fi
}

#-------------------------------------------------------------------------------
# RESOURCE INVENTORY
#-------------------------------------------------------------------------------

show_inventory() {
    log STEP "Gathering Resource Inventory"
    
    echo ""
    echo -e "${BOLD}Current Project Resources:${NC}"
    echo "==========================================="
    
    # Services
    local service_count=$(gcloud services list --enabled --format="value(config.name)" 2>/dev/null | wc -l | tr -d ' ')
    echo -e "  ${CYAN}Enabled APIs:${NC} $service_count"
    
    # Compute resources
    local vm_count=$(gcloud compute instances list --format="value(name)" 2>/dev/null | wc -l | tr -d ' ')
    local disk_count=$(gcloud compute disks list --format="value(name)" 2>/dev/null | wc -l | tr -d ' ')
    local network_count=$(gcloud compute networks list --format="value(name)" 2>/dev/null | wc -l | tr -d ' ')
    local firewall_count=$(gcloud compute firewall-rules list --format="value(name)" 2>/dev/null | wc -l | tr -d ' ')
    local address_count=$(gcloud compute addresses list --format="value(name)" 2>/dev/null | wc -l | tr -d ' ')
    
    echo -e "  ${CYAN}Compute Instances:${NC} $vm_count"
    echo -e "  ${CYAN}Disks:${NC} $disk_count"
    echo -e "  ${CYAN}Networks:${NC} $network_count"
    echo -e "  ${CYAN}Firewall Rules:${NC} $firewall_count"
    echo -e "  ${CYAN}Static IPs:${NC} $address_count"
    
    # Storage
    local bucket_count=$(gsutil ls -p "$PROJECT_ID" 2>/dev/null | wc -l | tr -d ' ')
    echo -e "  ${CYAN}Storage Buckets:${NC} $bucket_count"
    
    # GKE
    local gke_count=$(gcloud container clusters list --format="value(name)" 2>/dev/null | wc -l | tr -d ' ')
    echo -e "  ${CYAN}GKE Clusters:${NC} $gke_count"
    
    # Cloud SQL
    local sql_count=$(gcloud sql instances list --format="value(name)" 2>/dev/null | wc -l | tr -d ' ')
    echo -e "  ${CYAN}Cloud SQL Instances:${NC} $sql_count"
    
    # Pub/Sub
    local topic_count=$(gcloud pubsub topics list --format="value(name)" 2>/dev/null | wc -l | tr -d ' ')
    local sub_count=$(gcloud pubsub subscriptions list --format="value(name)" 2>/dev/null | wc -l | tr -d ' ')
    echo -e "  ${CYAN}Pub/Sub Topics:${NC} $topic_count"
    echo -e "  ${CYAN}Pub/Sub Subscriptions:${NC} $sub_count"
    
    # Cloud Functions
    local func_count=$(gcloud functions list --format="value(name)" 2>/dev/null | wc -l | tr -d ' ')
    echo -e "  ${CYAN}Cloud Functions:${NC} $func_count"
    
    # Cloud Run
    local run_count=$(gcloud run services list --platform=managed --format="value(metadata.name)" 2>/dev/null | wc -l | tr -d ' ')
    echo -e "  ${CYAN}Cloud Run Services:${NC} $run_count"
    
    # Service Accounts
    local sa_count=$(gcloud iam service-accounts list --format="value(email)" 2>/dev/null | wc -l | tr -d ' ')
    echo -e "  ${CYAN}Service Accounts:${NC} $sa_count"
    
    # IAM Bindings
    local iam_count=$(gcloud projects get-iam-policy "$PROJECT_ID" --format=json 2>/dev/null | jq '.bindings | length')
    echo -e "  ${CYAN}IAM Bindings:${NC} $iam_count"
    
    # BigQuery
    local bq_count=$(bq ls --project_id="$PROJECT_ID" 2>/dev/null | tail -n +3 | wc -l | tr -d ' ')
    echo -e "  ${CYAN}BigQuery Datasets:${NC} $bq_count"
    
    # Secrets
    local secret_count=$(gcloud secrets list --format="value(name)" 2>/dev/null | wc -l | tr -d ' ')
    echo -e "  ${CYAN}Secrets:${NC} $secret_count"
    
    echo "==========================================="
    echo ""
}

#-------------------------------------------------------------------------------
# SERVICE CLEANUP
#-------------------------------------------------------------------------------

cleanup_services() {
    log STEP "Disabling Enabled Services"
    
    local services=$(gcloud services list --enabled --format="value(config.name)" 2>/dev/null)
    
    if [[ -z "$services" ]]; then
        log INFO "No enabled services found"
        return 0
    fi
    
    local service_array=()
    while IFS= read -r service; do
        service_array+=("$service")
    done <<< "$services"
    
    log INFO "Found ${#service_array[@]} enabled services"
    
    # Filter out protected services
    local services_to_disable=()
    for service in "${service_array[@]}"; do
        local is_protected=false
        for protected in "${PROTECTED_SERVICES[@]}"; do
            if [[ "$service" == "$protected" ]]; then
                is_protected=true
                break
            fi
        done
        
        if [[ "$is_protected" == false ]]; then
            services_to_disable+=("$service")
        else
            log WARNING "Skipping protected service: $service"
        fi
    done
    
    log INFO "Will disable ${#services_to_disable[@]} services"
    
    local failed_services=()
    local success_count=0
    
    for service in "${services_to_disable[@]}"; do
        echo -ne "  Disabling ${service}... "
        
        if check_dry_run "gcloud services disable $service"; then
            if gcloud services disable "$service" --force --quiet 2>/dev/null; then
                echo -e "${GREEN}done${NC}"
                ((success_count++))
            else
                echo -e "${RED}failed${NC}"
                failed_services+=("$service")
            fi
        fi
    done
    
    log SUCCESS "Disabled $success_count services"
    
    if [[ ${#failed_services[@]} -gt 0 ]]; then
        log WARNING "Failed to disable ${#failed_services[@]} services:"
        for service in "${failed_services[@]}"; do
            echo "  - $service"
        done
    fi
}

#-------------------------------------------------------------------------------
# IAM CLEANUP
#-------------------------------------------------------------------------------

cleanup_iam() {
    log STEP "Cleaning IAM Bindings (Preserving Owners)"
    
    local tmp_policy=$(mktemp)
    local new_policy=$(mktemp)
    
    # Get current policy
    if ! gcloud projects get-iam-policy "$PROJECT_ID" --format=json > "$tmp_policy" 2>/dev/null; then
        log ERROR "Failed to get IAM policy"
        rm -f "$tmp_policy" "$new_policy"
        return 1
    fi
    
    # Extract current bindings info
    local total_bindings=$(jq '.bindings | length' "$tmp_policy")
    local owner_binding=$(jq '.bindings[] | select(.role=="roles/owner")' "$tmp_policy")
    
    log INFO "Current IAM bindings: $total_bindings"
    
    if [[ -z "$owner_binding" ]] || [[ "$owner_binding" == "null" ]]; then
        log ERROR "No owner binding found! Cannot proceed - at least one owner must exist"
        rm -f "$tmp_policy" "$new_policy"
        return 1
    fi
    
    # Count owners
    local owner_count=$(echo "$owner_binding" | jq '.members | length')
    log INFO "Owners to preserve: $owner_count"
    
    # Create new policy with only owners
    cat > "$new_policy" << EOF
{
  "bindings": [
    $(echo "$owner_binding")
  ],
  "version": 1
}
EOF
    
    # Validate JSON
    if ! jq . "$new_policy" > /dev/null 2>&1; then
        log ERROR "Generated invalid IAM policy JSON"
        rm -f "$tmp_policy" "$new_policy"
        return 1
    fi
    
    if check_dry_run "gcloud projects set-iam-policy"; then
        log INFO "Setting new IAM policy..."
        if gcloud projects set-iam-policy "$PROJECT_ID" "$new_policy" --quiet 2>/dev/null; then
            log SUCCESS "IAM cleaned. Only owners preserved."
        else
            log ERROR "Failed to set IAM policy"
        fi
    fi
    
    rm -f "$tmp_policy" "$new_policy"
}

#-------------------------------------------------------------------------------
# RESOURCE CLEANUP FUNCTIONS
#-------------------------------------------------------------------------------

cleanup_compute_instances() {
    log INFO "Deleting Compute Engine instances..."
    
    local instances=$(gcloud compute instances list \
        --format="csv[no-heading](name,zone)" 2>/dev/null)
    
    if [[ -z "$instances" ]]; then
        log INFO "No compute instances found"
        return 0
    fi
    
    while IFS=',' read -r name zone; do
        [[ -z "$name" ]] && continue
        echo -ne "  Deleting instance ${name}... "
        if check_dry_run "gcloud compute instances delete $name"; then
            if gcloud compute instances delete "$name" --zone="$zone" --quiet 2>/dev/null; then
                echo -e "${GREEN}done${NC}"
            else
                echo -e "${RED}failed${NC}"
            fi
        fi
    done <<< "$instances"
}

cleanup_compute_disks() {
    log INFO "Deleting Compute Engine disks..."
    
    local disks=$(gcloud compute disks list \
        --format="csv[no-heading](name,zone)" 2>/dev/null)
    
    if [[ -z "$disks" ]]; then
        log INFO "No disks found"
        return 0
    fi
    
    while IFS=',' read -r name zone; do
        [[ -z "$name" ]] && continue
        echo -ne "  Deleting disk ${name}... "
        if check_dry_run "gcloud compute disks delete $name"; then
            if gcloud compute disks delete "$name" --zone="$zone" --quiet 2>/dev/null; then
                echo -e "${GREEN}done${NC}"
            else
                echo -e "${RED}failed${NC}"
            fi
        fi
    done <<< "$disks"
}

cleanup_compute_snapshots() {
    log INFO "Deleting disk snapshots..."
    
    local snapshots=$(gcloud compute snapshots list \
        --format="value(name)" 2>/dev/null)
    
    if [[ -z "$snapshots" ]]; then
        log INFO "No snapshots found"
        return 0
    fi
    
    while read -r name; do
        [[ -z "$name" ]] && continue
        echo -ne "  Deleting snapshot ${name}... "
        if check_dry_run "gcloud compute snapshots delete $name"; then
            if gcloud compute snapshots delete "$name" --quiet 2>/dev/null; then
                echo -e "${GREEN}done${NC}"
            else
                echo -e "${RED}failed${NC}"
            fi
        fi
    done <<< "$snapshots"
}

cleanup_compute_images() {
    log INFO "Deleting custom images..."
    
    local images=$(gcloud compute images list \
        --no-standard-images \
        --format="value(name)" 2>/dev/null)
    
    if [[ -z "$images" ]]; then
        log INFO "No custom images found"
        return 0
    fi
    
    while read -r name; do
        [[ -z "$name" ]] && continue
        echo -ne "  Deleting image ${name}... "
        if check_dry_run "gcloud compute images delete $name"; then
            if gcloud compute images delete "$name" --quiet 2>/dev/null; then
                echo -e "${GREEN}done${NC}"
            else
                echo -e "${RED}failed${NC}"
            fi
        fi
    done <<< "$images"
}

cleanup_firewall_rules() {
    log INFO "Deleting firewall rules..."
    
    local rules=$(gcloud compute firewall-rules list \
        --format="value(name)" 2>/dev/null)
    
    if [[ -z "$rules" ]]; then
        log INFO "No firewall rules found"
        return 0
    fi
    
    while read -r name; do
        [[ -z "$name" ]] && continue
        # Skip default rules
        if [[ "$name" == default-* ]]; then
            log WARNING "Skipping default firewall rule: $name"
            continue
        fi
        echo -ne "  Deleting firewall rule ${name}... "
        if check_dry_run "gcloud compute firewall-rules delete $name"; then
            if gcloud compute firewall-rules delete "$name" --quiet 2>/dev/null; then
                echo -e "${GREEN}done${NC}"
            else
                echo -e "${RED}failed${NC}"
            fi
        fi
    done <<< "$rules"
}

cleanup_static_ips() {
    log INFO "Releasing static IP addresses..."
    
    local addresses=$(gcloud compute addresses list \
        --format="csv[no-heading](name,region)" 2>/dev/null)
    
    if [[ -z "$addresses" ]]; then
        log INFO "No static IPs found"
        return 0
    fi
    
    while IFS=',' read -r name region; do
        [[ -z "$name" ]] && continue
        echo -ne "  Releasing IP ${name}... "
        local region_flag=""
        if [[ -n "$region" ]] && [[ "$region" != "global" ]]; then
            region_flag="--region=$region"
        elif [[ "$region" == "global" ]]; then
            region_flag="--global"
        fi
        if check_dry_run "gcloud compute addresses delete $name $region_flag"; then
            if gcloud compute addresses delete "$name" $region_flag --quiet 2>/dev/null; then
                echo -e "${GREEN}done${NC}"
            else
                echo -e "${RED}failed${NC}"
            fi
        fi
    done <<< "$addresses"
}

cleanup_vpn_tunnels() {
    log INFO "Deleting VPN tunnels..."
    
    local tunnels=$(gcloud compute vpn-tunnels list \
        --format="csv[no-heading](name,region)" 2>/dev/null)
    
    if [[ -z "$tunnels" ]]; then
        log INFO "No VPN tunnels found"
        return 0
    fi
    
    while IFS=',' read -r name region; do
        [[ -z "$name" ]] && continue
        echo -ne "  Deleting VPN tunnel ${name}... "
        if check_dry_run "gcloud compute vpn-tunnels delete $name"; then
            if gcloud compute vpn-tunnels delete "$name" --region="$region" --quiet 2>/dev/null; then
                echo -e "${GREEN}done${NC}"
            else
                echo -e "${RED}failed${NC}"
            fi
        fi
    done <<< "$tunnels"
}

cleanup_routers() {
    log INFO "Deleting Cloud Routers..."
    
    local routers=$(gcloud compute routers list \
        --format="csv[no-heading](name,region)" 2>/dev/null)
    
    if [[ -z "$routers" ]]; then
        log INFO "No Cloud Routers found"
        return 0
    fi
    
    while IFS=',' read -r name region; do
        [[ -z "$name" ]] && continue
        echo -ne "  Deleting router ${name}... "
        if check_dry_run "gcloud compute routers delete $name"; then
            if gcloud compute routers delete "$name" --region="$region" --quiet 2>/dev/null; then
                echo -e "${GREEN}done${NC}"
            else
                echo -e "${RED}failed${NC}"
            fi
        fi
    done <<< "$routers"
}

cleanup_subnets() {
    log INFO "Deleting subnets..."
    
    local subnets=$(gcloud compute networks subnets list \
        --format="csv[no-heading](name,region)" 2>/dev/null)
    
    if [[ -z "$subnets" ]]; then
        log INFO "No subnets found"
        return 0
    fi
    
    while IFS=',' read -r name region; do
        [[ -z "$name" ]] && continue
        # Skip default subnets
        if [[ "$name" == default ]]; then
            log WARNING "Skipping default subnet in $region"
            continue
        fi
        echo -ne "  Deleting subnet ${name}... "
        if check_dry_run "gcloud compute networks subnets delete $name"; then
            if gcloud compute networks subnets delete "$name" --region="$region" --quiet 2>/dev/null; then
                echo -e "${GREEN}done${NC}"
            else
                echo -e "${RED}failed${NC}"
            fi
        fi
    done <<< "$subnets"
}

cleanup_networks() {
    log INFO "Deleting VPC networks..."
    
    local networks=$(gcloud compute networks list \
        --filter="name!=default" \
        --format="value(name)" 2>/dev/null)
    
    if [[ -z "$networks" ]]; then
        log INFO "No custom networks found"
        return 0
    fi
    
    while read -r name; do
        [[ -z "$name" ]] && continue
        echo -ne "  Deleting network ${name}... "
        if check_dry_run "gcloud compute networks delete $name"; then
            if gcloud compute networks delete "$name" --quiet 2>/dev/null; then
                echo -e "${GREEN}done${NC}"
            else
                echo -e "${RED}failed${NC}"
            fi
        fi
    done <<< "$networks"
}

cleanup_gke_clusters() {
    log INFO "Deleting GKE clusters..."
    
    local clusters=$(gcloud container clusters list \
        --format="csv[no-heading](name,location)" 2>/dev/null)
    
    if [[ -z "$clusters" ]]; then
        log INFO "No GKE clusters found"
        return 0
    fi
    
    while IFS=',' read -r name location; do
        [[ -z "$name" ]] && continue
        echo -ne "  Deleting GKE cluster ${name}... "
        if check_dry_run "gcloud container clusters delete $name"; then
            # Determine if regional or zonal
            if [[ "$location" =~ ^[a-z]+-[a-z]+[0-9]+$ ]]; then
                location_flag="--region=$location"
            else
                location_flag="--zone=$location"
            fi
            if gcloud container clusters delete "$name" $location_flag --quiet 2>/dev/null; then
                echo -e "${GREEN}done${NC}"
            else
                echo -e "${RED}failed${NC}"
            fi
        fi
    done <<< "$clusters"
}

cleanup_cloud_sql() {
    log INFO "Deleting Cloud SQL instances..."
    
    local instances=$(gcloud sql instances list \
        --format="value(name)" 2>/dev/null)
    
    if [[ -z "$instances" ]]; then
        log INFO "No Cloud SQL instances found"
        return 0
    fi
    
    while read -r name; do
        [[ -z "$name" ]] && continue
        echo -ne "  Deleting SQL instance ${name}... "
        if check_dry_run "gcloud sql instances delete $name"; then
            if gcloud sql instances delete "$name" --quiet 2>/dev/null; then
                echo -e "${GREEN}done${NC}"
            else
                echo -e "${RED}failed${NC}"
            fi
        fi
    done <<< "$instances"
}

cleanup_storage_buckets() {
    log INFO "Deleting Cloud Storage buckets..."
    
    local buckets=$(gsutil ls -p "$PROJECT_ID" 2>/dev/null)
    
    if [[ -z "$buckets" ]]; then
        log INFO "No storage buckets found"
        return 0
    fi
    
    while read -r bucket; do
        [[ -z "$bucket" ]] && continue
        echo -ne "  Deleting bucket ${bucket}... "
        if check_dry_run "gsutil -m rm -r $bucket"; then
            if gsutil -m rm -r "$bucket" 2>/dev/null; then
                echo -e "${GREEN}done${NC}"
            else
                echo -e "${RED}failed${NC}"
            fi
        fi
    done <<< "$buckets"
}

cleanup_pubsub() {
    log INFO "Deleting Pub/Sub resources..."
    
    # Subscriptions first
    local subscriptions=$(gcloud pubsub subscriptions list \
        --format="value(name)" 2>/dev/null)
    
    if [[ -n "$subscriptions" ]]; then
        while read -r name; do
            [[ -z "$name" ]] && continue
            echo -ne "  Deleting subscription ${name##*/}... "
            if check_dry_run "gcloud pubsub subscriptions delete $name"; then
                if gcloud pubsub subscriptions delete "$name" --quiet 2>/dev/null; then
                    echo -e "${GREEN}done${NC}"
                else
                    echo -e "${RED}failed${NC}"
                fi
            fi
        done <<< "$subscriptions"
    fi
    
    # Then topics
    local topics=$(gcloud pubsub topics list \
        --format="value(name)" 2>/dev/null)
    
    if [[ -n "$topics" ]]; then
        while read -r name; do
            [[ -z "$name" ]] && continue
            echo -ne "  Deleting topic ${name##*/}... "
            if check_dry_run "gcloud pubsub topics delete $name"; then
                if gcloud pubsub topics delete "$name" --quiet 2>/dev/null; then
                    echo -e "${GREEN}done${NC}"
                else
                    echo -e "${RED}failed${NC}"
                fi
            fi
        done <<< "$topics"
    fi
    
    if [[ -z "$subscriptions" ]] && [[ -z "$topics" ]]; then
        log INFO "No Pub/Sub resources found"
    fi
}

cleanup_cloud_functions() {
    log INFO "Deleting Cloud Functions..."
    
    # Gen 1 functions
    local functions_v1=$(gcloud functions list \
        --format="csv[no-heading](name,region)" 2>/dev/null)
    
    if [[ -n "$functions_v1" ]]; then
        while IFS=',' read -r name region; do
            [[ -z "$name" ]] && continue
            echo -ne "  Deleting function ${name}... "
            if check_dry_run "gcloud functions delete $name"; then
                if gcloud functions delete "$name" --region="$region" --quiet 2>/dev/null; then
                    echo -e "${GREEN}done${NC}"
                else
                    echo -e "${RED}failed${NC}"
                fi
            fi
        done <<< "$functions_v1"
    else
        log INFO "No Cloud Functions found"
    fi
}

cleanup_cloud_run() {
    log INFO "Deleting Cloud Run services..."
    
    local services=$(gcloud run services list \
        --platform=managed \
        --format="csv[no-heading](metadata.name,region)" 2>/dev/null)
    
    if [[ -z "$services" ]]; then
        log INFO "No Cloud Run services found"
        return 0
    fi
    
    while IFS=',' read -r name region; do
        [[ -z "$name" ]] && continue
        echo -ne "  Deleting Cloud Run service ${name}... "
        if check_dry_run "gcloud run services delete $name"; then
            if gcloud run services delete "$name" --region="$region" --platform=managed --quiet 2>/dev/null; then
                echo -e "${GREEN}done${NC}"
            else
                echo -e "${RED}failed${NC}"
            fi
        fi
    done <<< "$services"
}

cleanup_artifact_registry() {
    log INFO "Deleting Artifact Registry repositories..."
    
    local repos=$(gcloud artifacts repositories list \
        --format="csv[no-heading](name,location)" 2>/dev/null)
    
    if [[ -z "$repos" ]]; then
        log INFO "No Artifact Registry repos found"
        return 0
    fi
    
    while IFS=',' read -r name location; do
        [[ -z "$name" ]] && continue
        echo -ne "  Deleting repo ${name}... "
        if check_dry_run "gcloud artifacts repositories delete $name"; then
            if gcloud artifacts repositories delete "$name" --location="$location" --quiet 2>/dev/null; then
                echo -e "${GREEN}done${NC}"
            else
                echo -e "${RED}failed${NC}"
            fi
        fi
    done <<< "$repos"
}

cleanup_bigquery() {
    log INFO "Deleting BigQuery datasets..."
    
    local datasets=$(bq ls --project_id="$PROJECT_ID" --format=csv 2>/dev/null | tail -n +2 | cut -d',' -f1)
    
    if [[ -z "$datasets" ]]; then
        log INFO "No BigQuery datasets found"
        return 0
    fi
    
    while read -r dataset; do
        [[ -z "$dataset" ]] && continue
        echo -ne "  Deleting dataset ${dataset}... "
        if check_dry_run "bq rm -r -f -d ${PROJECT_ID}:${dataset}"; then
            if bq rm -r -f -d "${PROJECT_ID}:${dataset}" 2>/dev/null; then
                echo -e "${GREEN}done${NC}"
            else
                echo -e "${RED}failed${NC}"
            fi
        fi
    done <<< "$datasets"
}

cleanup_secrets() {
    log INFO "Deleting Secret Manager secrets..."
    
    local secrets=$(gcloud secrets list \
        --format="value(name)" 2>/dev/null)
    
    if [[ -z "$secrets" ]]; then
        log INFO "No secrets found"
        return 0
    fi
    
    while read -r name; do
        [[ -z "$name" ]] && continue
        echo -ne "  Deleting secret ${name##*/}... "
        if check_dry_run "gcloud secrets delete $name"; then
            if gcloud secrets delete "$name" --quiet 2>/dev/null; then
                echo -e "${GREEN}done${NC}"
            else
                echo -e "${RED}failed${NC}"
            fi
        fi
    done <<< "$secrets"
}

cleanup_service_accounts() {
    log INFO "Deleting custom service accounts..."
    
    local project_number=$(gcloud projects describe "$PROJECT_ID" --format="value(projectNumber)")
    local service_accounts=$(gcloud iam service-accounts list \
        --format="value(email)" 2>/dev/null)
    
    if [[ -z "$service_accounts" ]]; then
        log INFO "No service accounts found"
        return 0
    fi
    
    while read -r email; do
        [[ -z "$email" ]] && continue
        
        # Skip Google-managed service accounts
        if [[ "$email" == *"@cloudservices.gserviceaccount.com" ]] || \
           [[ "$email" == *"@developer.gserviceaccount.com" ]] || \
           [[ "$email" == *"@appspot.gserviceaccount.com" ]] || \
           [[ "$email" == *"@cloudbuild.gserviceaccount.com" ]] || \
           [[ "$email" == "${project_number}-compute@developer.gserviceaccount.com" ]] || \
           [[ "$email" == *"@cloudcomposer-accounts.iam.gserviceaccount.com" ]]; then
            log WARNING "Skipping Google-managed SA: $email"
            continue
        fi
        
        echo -ne "  Deleting SA ${email}... "
        if check_dry_run "gcloud iam service-accounts delete $email"; then
            if gcloud iam service-accounts delete "$email" --quiet 2>/dev/null; then
                echo -e "${GREEN}done${NC}"
            else
                echo -e "${RED}failed${NC}"
            fi
        fi
    done <<< "$service_accounts"
}

cleanup_scheduler_jobs() {
    log INFO "Deleting Cloud Scheduler jobs..."
    
    local jobs=$(gcloud scheduler jobs list \
        --format="csv[no-heading](ID,LOCATION)" 2>/dev/null)
    
    if [[ -z "$jobs" ]]; then
        log INFO "No Cloud Scheduler jobs found"
        return 0
    fi
    
    while IFS=',' read -r name location; do
        [[ -z "$name" ]] && continue
        echo -ne "  Deleting scheduler job ${name}... "
        if check_dry_run "gcloud scheduler jobs delete $name"; then
            if gcloud scheduler jobs delete "$name" --location="$location" --quiet 2>/dev/null; then
                echo -e "${GREEN}done${NC}"
            else
                echo -e "${RED}failed${NC}"
            fi
        fi
    done <<< "$jobs"
}

cleanup_app_engine() {
    log INFO "Checking App Engine..."
    
    local app_info=$(gcloud app describe 2>/dev/null)
    
    if [[ -z "$app_info" ]]; then
        log INFO "No App Engine application found"
        return 0
    fi
    
    log WARNING "App Engine cannot be fully deleted, only disabled"
    log WARNING "You can delete individual services and versions"
    
    # List services
    local services=$(gcloud app services list --format="value(SERVICE)" 2>/dev/null)
    
    if [[ -n "$services" ]]; then
        while read -r service; do
            [[ -z "$service" ]] && continue
            [[ "$service" == "default" ]] && continue
            
            echo -ne "  Deleting App Engine service ${service}... "
            if check_dry_run "gcloud app services delete $service"; then
                if gcloud app services delete "$service" --quiet 2>/dev/null; then
                    echo -e "${GREEN}done${NC}"
                else
                    echo -e "${RED}failed${NC}"
                fi
            fi
        done <<< "$services"
    fi
}

#-------------------------------------------------------------------------------
# MAIN CLEANUP ORCHESTRATION
#-------------------------------------------------------------------------------

cleanup_all_resources() {
    log STEP "Deleting All Resources"
    
    # Order matters - delete dependent resources first
    
    # 1. Compute resources (order: instances -> disks -> snapshots -> images)
    cleanup_compute_instances
    cleanup_compute_disks
    cleanup_compute_snapshots
    cleanup_compute_images
    
    # 2. GKE (before VPC)
    cleanup_gke_clusters
    
    # 3. Cloud SQL
    cleanup_cloud_sql
    
    # 4. Serverless
    cleanup_cloud_functions
    cleanup_cloud_run
    cleanup_app_engine
    
    # 5. Storage
    cleanup_storage_buckets
    cleanup_artifact_registry
    
    # 6. Messaging
    cleanup_pubsub
    
    # 7. Data
    cleanup_bigquery
    
    # 8. Security
    cleanup_secrets
    cleanup_scheduler_jobs
    
    # 9. Networking (order: VPN -> routers -> firewall -> subnets -> networks)
    cleanup_vpn_tunnels
    cleanup_routers
    cleanup_firewall_rules
    cleanup_static_ips
    cleanup_subnets
    cleanup_networks
    
    # 10. IAM resources
    cleanup_service_accounts
}

#-------------------------------------------------------------------------------
# SELECTIVE CLEANUP MENU
#-------------------------------------------------------------------------------

show_cleanup_menu() {
    echo ""
    echo -e "${BOLD}Select resources to clean up:${NC}"
    echo "==========================================="
    echo "  1) Compute Engine (VMs, disks, snapshots, images)"
    echo "  2) GKE Clusters"
    echo "  3) Cloud SQL"
    echo "  4) Cloud Storage"
    echo "  5) Serverless (Functions, Run, App Engine)"
    echo "  6) Pub/Sub"
    echo "  7) BigQuery"
    echo "  8) Networking (VPC, firewall, IPs)"
    echo "  9) Security (Secrets, Service Accounts)"
    echo " 10) Artifact Registry"
    echo " 11) IAM Bindings"
    echo " 12) APIs/Services"
    echo "  A) ALL of the above"
    echo "  Q) Quit"
    echo "==========================================="
    echo ""
    read -p "Enter your choices (comma-separated, e.g., 1,3,5): " choices
    
    if [[ "$choices" =~ ^[Qq]$ ]]; then
        log INFO "Cleanup cancelled"
        exit 0
    fi
    
    if [[ "$choices" =~ ^[Aa]$ ]]; then
        cleanup_all_resources
        cleanup_iam
        cleanup_services
        return
    fi
    
    IFS=',' read -ra SELECTIONS <<< "$choices"
    
    for selection in "${SELECTIONS[@]}"; do
        selection=$(echo "$selection" | tr -d ' ')
        case $selection in
            1)  cleanup_compute_instances
                cleanup_compute_disks
                cleanup_compute_snapshots
                cleanup_compute_images
                ;;
            2)  cleanup_gke_clusters ;;
            3)  cleanup_cloud_sql ;;
            4)  cleanup_storage_buckets ;;
            5)  cleanup_cloud_functions
                cleanup_cloud_run
                cleanup_app_engine
                ;;
            6)  cleanup_pubsub ;;
            7)  cleanup_bigquery ;;
            8)  cleanup_vpn_tunnels
                cleanup_routers
                cleanup_firewall_rules
                cleanup_static_ips
                cleanup_subnets
                cleanup_networks
                ;;
            9)  cleanup_secrets
                cleanup_service_accounts
                ;;
            10) cleanup_artifact_registry ;;
            11) cleanup_iam ;;
            12) cleanup_services ;;
            *)  log WARNING "Invalid selection: $selection" ;;
        esac
    done
}

#-------------------------------------------------------------------------------
# FINAL VERIFICATION
#-------------------------------------------------------------------------------

verify_cleanup() {
    log STEP "Verifying Cleanup Results"
    
    echo ""
    echo -e "${BOLD}Post-Cleanup State:${NC}"
    echo "==========================================="
    
    echo ""
    echo -e "${CYAN}Remaining Enabled Services:${NC}"
    gcloud services list --enabled --format="table(config.name)" 2>/dev/null || echo "  Unable to list services"
    
    echo ""
    echo -e "${CYAN}Remaining IAM Bindings:${NC}"
    gcloud projects get-iam-policy "$PROJECT_ID" \
        --format="table(bindings.role,bindings.members)" 2>/dev/null || echo "  Unable to list IAM"
    
    echo ""
    echo -e "${CYAN}Remaining Compute Resources:${NC}"
    local vm_count=$(gcloud compute instances list --format="value(name)" 2>/dev/null | wc -l | tr -d ' ')
    local disk_count=$(gcloud compute disks list --format="value(name)" 2>/dev/null | wc -l | tr -d ' ')
    echo "  Instances: $vm_count"
    echo "  Disks: $disk_count"
    
    echo ""
    echo -e "${CYAN}Remaining Storage Buckets:${NC}"
    gsutil ls -p "$PROJECT_ID" 2>/dev/null || echo "  None"
    
    echo "==========================================="
}

#-------------------------------------------------------------------------------
# USAGE & HELP
#-------------------------------------------------------------------------------

show_usage() {
    cat << EOF
Usage: $(basename "$0") [OPTIONS]

Reset a GCP project to near-initial empty state.

OPTIONS:
    -p, --project PROJECT_ID    Specify project ID (interactive if not provided)
    -d, --dry-run               Show what would be deleted without making changes
    -v, --verbose               Enable verbose output
    -s, --selective             Interactive selective cleanup mode
    -y, --yes                   Skip confirmation prompts (dangerous!)
    -h, --help                  Show this help message

EXAMPLES:
    $(basename "$0")                           # Interactive mode
    $(basename "$0") -p my-project-id          # Specify project
    $(basename "$0") -p my-project -d          # Dry run
    $(basename "$0") -p my-project -s          # Selective cleanup

EOF
}

#-------------------------------------------------------------------------------
# ARGUMENT PARSING
#-------------------------------------------------------------------------------

parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -p|--project)
                PROJECT_ID="$2"
                shift 2
                ;;
            -d|--dry-run)
                DRY_RUN=true
                shift
                ;;
            -v|--verbose)
                VERBOSE=true
                shift
                ;;
            -s|--selective)
                SELECTIVE_MODE=true
                shift
                ;;
            -y|--yes)
                SKIP_CONFIRMATION=true
                shift
                ;;
            -h|--help)
                show_usage
                exit 0
                ;;
            *)
                log ERROR "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done
}

#-------------------------------------------------------------------------------
# MAIN EXECUTION
#-------------------------------------------------------------------------------

main() {
    parse_arguments "$@"
    
    print_banner
    
    # Get project ID interactively if not provided
    if [[ -z "$PROJECT_ID" ]]; then
        echo ""
        read -p "Enter the PROJECT ID to reset: " PROJECT_ID
        
        if [[ -z "$PROJECT_ID" ]]; then
            log ERROR "Project ID cannot be empty"
            exit 1
        fi
    fi
    
    # Initialize logging and check prerequisites
    check_prerequisites
    
    # Validate project access
    validate_project
    
    # Show current inventory
    show_inventory
    
    # Dry run notice
    if [[ "$DRY_RUN" == true ]]; then
        echo ""
        echo -e "${YELLOW}╔══════════════════════════════════════════════╗${NC}"
        echo -e "${YELLOW}║     🔍 DRY-RUN MODE - No changes will be made ║${NC}"
        echo -e "${YELLOW}╚══════════════════════════════════════════════╝${NC}"
        echo ""
    fi
    
    # Confirmation
    if [[ "$SKIP_CONFIRMATION" != true ]]; then
        echo ""
        echo -e "${RED}╔══════════════════════════════════════════════╗${NC}"
        echo -e "${RED}║     ⚠️  WARNING: DESTRUCTIVE OPERATION        ║${NC}"
        echo -e "${RED}║     This will DELETE most resources!         ║${NC}"
        echo -e "${RED}║     This action CANNOT be undone!            ║${NC}"
        echo -e "${RED}╚══════════════════════════════════════════════╝${NC}"
        echo ""
        read -p "Type the project ID '$PROJECT_ID' to CONFIRM: " CONFIRM
        
        if [[ "$CONFIRM" != "$PROJECT_ID" ]]; then
            log ERROR "Confirmation does not match. Aborting."
            exit 1
        fi
    fi
    
    echo ""
    log SUCCESS "Confirmation received. Proceeding with cleanup..."
    
    # Set project
    gcloud config set project "$PROJECT_ID" --quiet
    
    # Execute cleanup
    if [[ "$SELECTIVE_MODE" == true ]]; then
        show_cleanup_menu
    else
        # Full cleanup
        cleanup_all_resources
        cleanup_iam
        cleanup_services
    fi
    
    # Verify results
    verify_cleanup
    
    # Summary
    echo ""
    echo -e "${GREEN}╔══════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║        ✅ PROJECT RESET COMPLETE              ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════╝${NC}"
    echo ""
    echo "Project '$PROJECT_ID' is now in a near-empty state."
    echo "Log file: $LOG_FILE"
    echo ""
    echo -e "${CYAN}Next steps:${NC}"
    echo "  • Review the log file for any failed deletions"
    echo "  • Re-run with --selective to clean up specific resources"
    echo "  • Ready for clean Terraform apply"
    echo ""
}

# Execute main function
main "$@"