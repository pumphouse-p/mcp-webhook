.PHONY: build build-http build-mcp-http publish run run-http run-mcp-http clean test test-http test-mcp-http help demo

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
	@echo "HTTP mode (plain REST API):"
	@echo "  build-http     - Build the HTTP container image"
	@echo "  run-http       - Run HTTP server container"
	@echo "  test-http      - Test HTTP endpoints"
	@echo ""
	@echo "MCP-over-HTTP mode (recommended):"
	@echo "  build-mcp-http - Build the MCP-over-HTTP container"
	@echo "  run-mcp-http   - Run MCP-over-HTTP server container"
	@echo "  test-mcp-http  - Test MCP-over-HTTP functionality"
	@echo ""
	@echo "General:"
	@echo "  publish     - Push container to registry"
	@echo "  clean       - Remove local container images"
	@echo "  help        - Show this help"
	@echo ""
	@echo "Environment variables:"
	@echo "  IMAGE_NAME     - Container image name (default: mcp-webhook)"
	@echo "  IMAGE_TAG      - Container image tag (default: latest)"
	@echo "  REGISTRY       - Container registry (default: localhost)"
	@echo "  PORT           - HTTP server port (default: 3000)"
	@echo "  MCP_AUTH_ENABLED - Enable authentication (default: false)"
	@echo "  MCP_API_KEYS   - Comma-separated API keys"
	@echo ""
	@echo "Examples:"
	@echo "  make build"
	@echo "  make build-mcp-http"
	@echo "  make run-mcp-http MCP_AUTH_ENABLED=true MCP_API_KEYS=my-key"
	@echo "  make test-mcp-http SERVER_URL=http://localhost:3000 API_KEY=my-key"
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

build-mcp-http:
	@echo "Building MCP-over-HTTP container image..."
	podman build \
		--file Containerfile.mcp-http \
		--tag $(REGISTRY)/$(IMAGE_NAME):mcp-http \
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

run-mcp-http:
	@echo "Starting MCP-over-HTTP server on port $(PORT)..."
	@echo "Access at: http://localhost:$(PORT)/mcp"
	@podman run --rm \
		-p $(PORT):3000 \
		--name mcp-webhook-mcp-http \
		-e MCP_AUTH_ENABLED=$(MCP_AUTH_ENABLED) \
		-e MCP_API_KEYS=$(MCP_API_KEYS) \
		$(REGISTRY)/$(IMAGE_NAME):mcp-http

clean:
	@echo "Removing container images..."
	podman rmi $(REGISTRY)/$(IMAGE_NAME):$(IMAGE_TAG) || true
	podman rmi $(REGISTRY)/$(IMAGE_NAME):http || true
	podman rmi $(REGISTRY)/$(IMAGE_NAME):mcp-http || true
	podman image prune -f

test: build
	@./scripts/test-container.sh

test-http: build-http
	@echo "Testing HTTP server..."
	@./scripts/test-http.sh

test-mcp-http:
	@echo "Testing MCP-over-HTTP..."
	@SERVER_URL=$(SERVER_URL) API_KEY=$(API_KEY) node scripts/test-mcp-http.js

demo: build
	@./scripts/demo.sh
