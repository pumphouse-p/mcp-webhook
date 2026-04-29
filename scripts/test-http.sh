#!/bin/bash

set -e

IMAGE_NAME="${IMAGE_NAME:-mcp-webhook}"
IMAGE_TAG="${IMAGE_TAG:-http}"
REGISTRY="${REGISTRY:-localhost}"
PORT="${PORT:-3000}"

FULL_IMAGE="${REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}"

echo "Testing MCP Webhook Server HTTP mode: ${FULL_IMAGE}"
echo ""

# Start server in background
echo "Starting HTTP server..."
podman run --rm -d \
  --name mcp-webhook-test-http \
  -p 127.0.0.1:${PORT}:3000 \
  "${FULL_IMAGE}" > /dev/null

# Wait for server to be ready
echo "Waiting for server to start..."
sleep 3

# Function to cleanup
cleanup() {
  echo ""
  echo "Cleaning up..."
  podman stop mcp-webhook-test-http > /dev/null 2>&1 || true
}
trap cleanup EXIT

# Run tests
echo "Test 1: Health check"
curl -sf http://127.0.0.1:${PORT}/health | grep -q "healthy" && echo "✓ Pass" || echo "✗ Fail"

echo ""
echo "Test 2: Server info endpoint"
curl -sf http://127.0.0.1:${PORT}/ | grep -q "MCP Webhook Server" && echo "✓ Pass" || echo "✗ Fail"

echo ""
echo "Test 3: POST webhook endpoint exists"
curl -sf -X POST http://127.0.0.1:${PORT}/api/webhook/post \
  -H "Content-Type: application/json" \
  -d '{"url":"https://httpbin.org/post","payload":{"test":true}}' | grep -q "status" && echo "✓ Pass" || echo "✗ Fail"

echo ""
echo "Test 4: GET webhook endpoint exists"
curl -sf -X POST http://127.0.0.1:${PORT}/api/webhook/get \
  -H "Content-Type: application/json" \
  -d '{"url":"https://httpbin.org/get"}' | grep -q "status" && echo "✓ Pass" || echo "✗ Fail"

echo ""
echo "Test 5: 404 for unknown endpoint"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:${PORT}/unknown)
[ "$STATUS" = "404" ] && echo "✓ Pass" || echo "✗ Fail"

echo ""
echo "Test 6: CORS headers present"
curl -sf -I http://127.0.0.1:${PORT}/ | grep -q "Access-Control-Allow-Origin" && echo "✓ Pass" || echo "✗ Fail"

echo ""
echo "Test 7: Container logs show startup"
podman logs mcp-webhook-test-http 2>&1 | grep -q "MCP Webhook Server running" && echo "✓ Pass" || echo "✗ Fail"

echo ""
echo "All HTTP tests completed!"
