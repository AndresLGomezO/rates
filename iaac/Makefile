.PHONY: init plan apply destroy output clean help

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-15s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

init: ## Initialize Terraform and load environment
	@./scripts/init.sh

plan: ## Show Terraform execution plan
	@./scripts/load-env.sh
	@terraform plan

apply: ## Apply Terraform changes
	@./scripts/apply.sh

destroy: ## Destroy Terraform infrastructure
	@./scripts/destroy.sh

output: ## Show Terraform outputs
	@terraform output

clean: ## Clean Terraform files (state, lock, etc.)
	@echo "⚠️  This will remove Terraform state files!"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		rm -rf .terraform .terraform.lock.hcl terraform.tfstate* tfplan*; \
		echo "✓ Cleaned Terraform files"; \
	else \
		echo "❌ Clean cancelled"; \
	fi

validate: ## Validate Terraform configuration
	@./scripts/load-env.sh
	@terraform validate

fmt: ## Format Terraform files
	@terraform fmt -recursive
