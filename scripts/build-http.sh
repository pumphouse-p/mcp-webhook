#!/bin/bash

set -e

IMAGE_NAME="${IMAGE_NAME:-mcp-webhook}"
IMAGE_TAG="${IMAGE_TAG:-http}"
REGISTRY="${REGISTRY:-localhost}"

echo "Building HTTP mode container image: ${REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}"

podman build \
  --file Containerfile.http \
  --tag "${REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}" \
  --tag "${REGISTRY}/${IMAGE_NAME}:http-$(date +%Y%m%d-%H%M%S)" \
  .

echo "Build complete!"
echo "Image: ${REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}"
