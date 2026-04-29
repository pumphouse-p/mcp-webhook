.PHONY: build build-http publish run run-http clean test test-http help demo

IMAGE_NAME ?= mcp-webhook
IMAGE_TAG ?= latest
REGISTRY ?= localhost
PORT ?= 3000

help:
	@echo "MCP Webhook Server - Container Management"
	@echo ""
	@echo "Available targets:"
	@echo ""
	@echo "stdio mode (for Claude Desktop):"
	@echo "  build       - Build the stdio container image"
	@echo "  run         - Run stdio container (with stdin)"
	@echo "  test        - Test stdio container"
	@echo "  demo        - Demo stdio container behavior"
	@echo ""
	@echo "HTTP mode (web service):"
	@echo "  build-http  - Build the HTTP container image"
	@echo "  run-http    - Run HTTP server container"
	@echo "  test-http   - Test HTTP endpoints"
	@echo ""
	@echo "General:"
	@echo "  publish     - Push container to registry"
	@echo "  clean       - Remove local container images"
	@echo "  help        - Show this help"
	@echo ""
	@echo "Environment variables:"
	@echo "  IMAGE_NAME - Container image name (default: mcp-webhook)"
	@echo "  IMAGE_TAG  - Container image tag (default: latest)"
	@echo "  REGISTRY   - Container registry (default: localhost)"
	@echo "  PORT       - HTTP server port (default: 3000)"
	@echo ""
	@echo "Examples:"
	@echo "  make build"
	@echo "  make build-http"
	@echo "  make run-http PORT=8080"
	@echo "  make publish REGISTRY=quay.io/myuser"

build:
	@echo "Building stdio container image..."
	podman build \
		--file Containerfile \
		--tag $(REGISTRY)/$(IMAGE_NAME):$(IMAGE_TAG) \
		.

build-http:
	@echo "Building HTTP container image..."
	podman build \
		--file Containerfile.http \
		--tag $(REGISTRY)/$(IMAGE_NAME):http \
		.

publish: build
	@echo "Publishing to $(REGISTRY)..."
	@if [ "$(REGISTRY)" != "localhost" ]; then \
		podman login $(REGISTRY); \
	fi
	podman push $(REGISTRY)/$(IMAGE_NAME):$(IMAGE_TAG)

run:
	@echo "Running stdio container (pipe input or use Ctrl+D to exit)..."
	@cat | podman run --rm -i \
		-e MCP_AUTH_ENABLED=$(MCP_AUTH_ENABLED) \
		-e MCP_AUTH_TYPE=$(MCP_AUTH_TYPE) \
		-e MCP_API_KEYS=$(MCP_API_KEYS) \
		-e MCP_USERNAME=$(MCP_USERNAME) \
		-e MCP_PASSWORD=$(MCP_PASSWORD) \
		$(REGISTRY)/$(IMAGE_NAME):$(IMAGE_TAG)

run-http:
	@echo "Starting HTTP server on port $(PORT)..."
	@echo "Access at: http://localhost:$(PORT)"
	@podman run --rm \
		-p $(PORT):3000 \
		--name mcp-webhook-http \
		-e MCP_AUTH_ENABLED=$(MCP_AUTH_ENABLED) \
		-e MCP_AUTH_TYPE=$(MCP_AUTH_TYPE) \
		-e MCP_API_KEYS=$(MCP_API_KEYS) \
		-e MCP_USERNAME=$(MCP_USERNAME) \
		-e MCP_PASSWORD=$(MCP_PASSWORD) \
		$(REGISTRY)/$(IMAGE_NAME):http

clean:
	@echo "Removing container images..."
	podman rmi $(REGISTRY)/$(IMAGE_NAME):$(IMAGE_TAG) || true
	podman rmi $(REGISTRY)/$(IMAGE_NAME):http || true
	podman image prune -f

test: build
	@./scripts/test-container.sh

test-http: build-http
	@echo "Testing HTTP server..."
	@./scripts/test-http.sh

demo: build
	@./scripts/demo.sh
