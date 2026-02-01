#!/usr/bin/env bash

# ============================================================================
# APP IMAGE BUILD
# ============================================================================
# Purpose: Build app nginx Docker image from static assets
# Usage: Source this file after logging.sh
# Dependencies: logging.sh
# ============================================================================

set -euo pipefail

# ============================================================================
# Build App Docker Image
# ============================================================================

build_app_image() {
    local project_root="$1"
    local image_name="$2"
    local log_file="$3"
    local force_rebuild="${4:-0}"
    
    print_step "Building app image..."
    
    # Verify dist exists
    if [[ ! -d "${project_root}/apps/app/dist" ]]; then
        print_error "apps/app/dist directory does not exist. Run build_app_assets first."
        return 1
    fi
    
    # Create temporary Dockerfile for app
    local app_dockerfile="${project_root}/.Dockerfile.app"
    cat > "${app_dockerfile}" <<'EOF'
FROM nginx:alpine
COPY apps/app/dist /usr/share/nginx/html
RUN rm /etc/nginx/conf.d/default.conf
COPY <<'NGINX_CONF' /etc/nginx/conf.d/default.conf
server {
    listen 8080;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html =404;
    }
    
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
NGINX_CONF
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
EOF
    
    # Build app image
    local docker_build_args="--platform linux/amd64"
    if [[ "${force_rebuild}" == "1" ]]; then
        docker_build_args+=" --no-cache"
    fi
    
    if docker build ${docker_build_args} -t "${image_name}" \
        -f "${app_dockerfile}" \
        "${project_root}" >> "${log_file}" 2>&1; then
        print_success "App image built successfully"
        rm -f "${app_dockerfile}"
        return 0
    else
        print_error "App image build failed"
        print_info "Check ${log_file} for details"
        rm -f "${app_dockerfile}"
        return 1
    fi
}
