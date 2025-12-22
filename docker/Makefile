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
