#!/bin/bash

set -e

IMAGE_NAME="${IMAGE_NAME:-mcp-webhook}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
REGISTRY="${REGISTRY:-localhost}"

FULL_IMAGE="${REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}"

echo "Running MCP Webhook Server in container..."

podman run \
  --rm \
  -i \
  --name mcp-webhook \
  -e MCP_AUTH_ENABLED="${MCP_AUTH_ENABLED:-false}" \
  -e MCP_AUTH_TYPE="${MCP_AUTH_TYPE:-api_key}" \
  -e MCP_API_KEYS="${MCP_API_KEYS:-}" \
  -e MCP_USERNAME="${MCP_USERNAME:-}" \
  -e MCP_PASSWORD="${MCP_PASSWORD:-}" \
  "${FULL_IMAGE}"
