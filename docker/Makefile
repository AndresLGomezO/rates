# Makefile for Firebase Emulators Docker Commands
# Provides convenient shortcuts for common Docker operations

.PHONY: up down logs restart build clean ps status

# Default target
.DEFAULT_GOAL := help

# Variables
COMPOSE_FILE := docker/docker-compose.yml
COMPOSE := docker-compose -f $(COMPOSE_FILE)

help: ## Show this help message
	@echo "Firebase Emulators Docker Commands"
	@echo ""
	@echo "Usage: make [target]"
	@echo ""
	@echo "Targets:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-15s %s\n", $$1, $$2}'

up: ## Start emulators in detached mode
	@if [ ! -f ../.env.docker ]; then \
		echo "⚠️  .env.docker not found, creating from env.docker.example..."; \
		cp env.docker.example ../.env.docker; \
		echo "✅ Created ../.env.docker"; \
	fi
	$(COMPOSE) up -d
	@echo "Emulators starting... Check logs with 'make logs'"
	@echo "Emulator UI: http://localhost:4000"

down: ## Stop emulators
	$(COMPOSE) down
	@echo "Emulators stopped"

logs: ## View emulator logs (follow mode)
	$(COMPOSE) logs -f

restart: ## Restart emulators
	$(COMPOSE) restart
	@echo "Emulators restarted"

build: ## Rebuild Docker image
	$(COMPOSE) build --no-cache
	@echo "Docker image rebuilt"

clean: ## Stop and remove volumes (clears all data)
	$(COMPOSE) down -v
	@echo "Emulators stopped and volumes removed"

clean-all: ## Complete cleanup: remove containers, images, volumes, and networks
	@echo "🧹 Complete cleanup of Docker resources..."
	$(COMPOSE) down -v --remove-orphans || true
	@echo "Removing containers..."
	@docker ps -a --filter "name=rates-firebase-emulators" --format "{{.ID}}" | xargs -r docker rm -f 2>/dev/null || true
	@echo "Removing images..."
	@docker images --format "{{.Repository}}:{{.Tag}}" | grep -E "(rates|firebase-emulator|docker-firebase-emulators)" | xargs -r docker rmi -f 2>/dev/null || true
	@echo "Removing volumes..."
	@docker volume ls --format "{{.Name}}" | grep -E "(rates|firebase|docker)" | xargs -r docker volume rm 2>/dev/null || true
	@echo "Removing networks..."
	@docker network ls --format "{{.Name}}" | grep -E "(rates|docker)" | xargs -r docker network rm 2>/dev/null || true
	@echo "✅ Cleanup complete!"

recreate: clean-all build up ## Complete cleanup and recreate (clean-all + build + up)
	@echo "✅ Emulators recreated and started!"

ps: ## Show running containers
	$(COMPOSE) ps

status: ## Show emulator status and URLs
	@echo "Firebase Emulators Status:"
	@echo ""
	@$(COMPOSE) ps
	@echo ""
	@echo "Access URLs:"
	@echo "  Emulator UI:    http://localhost:4000"
	@echo "  Auth:           http://localhost:9099"
	@echo "  Firestore:      http://localhost:8080"
	@echo "  Storage:        http://localhost:9199"
	@echo "  Functions:      http://localhost:5001"

shell: ## Open shell in emulator container
	$(COMPOSE) exec firebase-emulators /bin/bash
