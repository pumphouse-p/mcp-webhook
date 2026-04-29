#!/bin/bash

set -e

IMAGE_NAME="${IMAGE_NAME:-mcp-webhook}"
IMAGE_TAG="${IMAGE_TAG:-http}"
REGISTRY="${REGISTRY:-localhost}"
PORT="${PORT:-3000}"

FULL_IMAGE="${REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}"

echo "Running MCP Webhook Server (HTTP mode)..."
echo "Access at: http://localhost:${PORT}"
echo ""

podman run \
  --rm \
  -p "${PORT}:3000" \
  --name mcp-webhook-http \
  -e PORT=3000 \
  -e HOST=0.0.0.0 \
  -e MCP_AUTH_ENABLED="${MCP_AUTH_ENABLED:-false}" \
  -e MCP_AUTH_TYPE="${MCP_AUTH_TYPE:-api_key}" \
  -e MCP_API_KEYS="${MCP_API_KEYS:-}" \
  -e MCP_USERNAME="${MCP_USERNAME:-}" \
  -e MCP_PASSWORD="${MCP_PASSWORD:-}" \
  "${FULL_IMAGE}"
