#!/bin/bash

set -e

IMAGE_NAME="${IMAGE_NAME:-mcp-webhook}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
REGISTRY="${REGISTRY:-localhost}"

FULL_IMAGE="${REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}"

echo "Testing MCP Webhook Server container: ${FULL_IMAGE}"
echo ""

echo "Test 1: Container starts successfully"
timeout 2 podman run --rm -i "${FULL_IMAGE}" 2>&1 | grep -q "MCP Webhook Server running" && echo "✓ Pass" || echo "✗ Fail"

echo ""
echo "Test 2: Authentication disabled by default"
timeout 2 podman run --rm -i "${FULL_IMAGE}" 2>&1 | grep -q "authentication: DISABLED" && echo "✓ Pass" || echo "✗ Fail"

echo ""
echo "Test 3: Authentication can be enabled"
timeout 2 podman run --rm -i \
  -e MCP_AUTH_ENABLED=true \
  -e MCP_AUTH_TYPE=api_key \
  -e MCP_API_KEYS=test \
  "${FULL_IMAGE}" 2>&1 | grep -q "authentication: ENABLED" && echo "✓ Pass" || echo "✗ Fail"

echo ""
echo "Test 4: Container responds to stdin"
echo '{"test": "data"}' | timeout 2 podman run --rm -i "${FULL_IMAGE}" 2>&1 | head -1 | grep -q "MCP Webhook Server" && echo "✓ Pass" || echo "✗ Fail"

echo ""
echo "Test 5: Container runs as non-root user"
podman run --rm --entrypoint id "${FULL_IMAGE}" | grep -q "uid=1001(mcp)" && echo "✓ Pass" || echo "✗ Fail"

echo ""
echo "Test 6: Required files exist in container"
podman run --rm --entrypoint ls "${FULL_IMAGE}" /app/index.js > /dev/null && echo "✓ Pass" || echo "✗ Fail"

echo ""
echo "Test 7: Dependencies installed"
podman run --rm --entrypoint ls "${FULL_IMAGE}" /app/node_modules/@modelcontextprotocol > /dev/null && echo "✓ Pass" || echo "✗ Fail"

echo ""
echo "All tests completed!"
