#!/bin/bash

set -e

IMAGE_NAME="${IMAGE_NAME:-mcp-webhook}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
REGISTRY="${REGISTRY:-localhost}"

echo "Building container image: ${REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}"

podman build \
  --file Containerfile \
  --tag "${REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}" \
  --tag "${REGISTRY}/${IMAGE_NAME}:$(date +%Y%m%d-%H%M%S)" \
  .

echo "Build complete!"
echo "Image: ${REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}"
