.PHONY: build publish run clean help

IMAGE_NAME ?= mcp-webhook
IMAGE_TAG ?= latest
REGISTRY ?= localhost

help:
	@echo "MCP Webhook Server - Container Management"
	@echo ""
	@echo "Available targets:"
	@echo "  build    - Build the container image"
	@echo "  publish  - Push the container image to registry"
	@echo "  run      - Run the container locally"
	@echo "  clean    - Remove local container images"
	@echo "  test     - Build and test the container"
	@echo ""
	@echo "Environment variables:"
	@echo "  IMAGE_NAME - Container image name (default: mcp-webhook)"
	@echo "  IMAGE_TAG  - Container image tag (default: latest)"
	@echo "  REGISTRY   - Container registry (default: localhost)"
	@echo ""
	@echo "Examples:"
	@echo "  make build"
	@echo "  make build REGISTRY=quay.io/myuser"
	@echo "  make publish REGISTRY=docker.io/myuser"

build:
	@echo "Building container image..."
	podman build \
		--file Containerfile \
		--tag $(REGISTRY)/$(IMAGE_NAME):$(IMAGE_TAG) \
		.

publish: build
	@echo "Publishing to $(REGISTRY)..."
	@if [ "$(REGISTRY)" != "localhost" ]; then \
		podman login $(REGISTRY); \
	fi
	podman push $(REGISTRY)/$(IMAGE_NAME):$(IMAGE_TAG)

run:
	@echo "Running container..."
	podman run --rm -i \
		-e MCP_AUTH_ENABLED=$(MCP_AUTH_ENABLED) \
		-e MCP_AUTH_TYPE=$(MCP_AUTH_TYPE) \
		-e MCP_API_KEYS=$(MCP_API_KEYS) \
		-e MCP_USERNAME=$(MCP_USERNAME) \
		-e MCP_PASSWORD=$(MCP_PASSWORD) \
		$(REGISTRY)/$(IMAGE_NAME):$(IMAGE_TAG)

clean:
	@echo "Removing container images..."
	podman rmi $(REGISTRY)/$(IMAGE_NAME):$(IMAGE_TAG) || true
	podman image prune -f

test: build
	@echo "Testing container..."
	@timeout 3 podman run --rm -i $(REGISTRY)/$(IMAGE_NAME):$(IMAGE_TAG) || true
	@echo "Container test complete!"
