#!/bin/bash

set -e

IMAGE_NAME="${IMAGE_NAME:-mcp-webhook}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
REGISTRY="${REGISTRY:-localhost}"

FULL_IMAGE="${REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}"

echo "Publishing container image: ${FULL_IMAGE}"

if [[ "${REGISTRY}" != "localhost" ]]; then
  echo "Logging in to registry..."
  podman login "${REGISTRY}"
fi

podman push "${FULL_IMAGE}"

echo "Successfully pushed ${FULL_IMAGE}"

if [[ -n "${PUSH_LATEST}" ]]; then
  echo "Also pushing as latest..."
  podman tag "${FULL_IMAGE}" "${REGISTRY}/${IMAGE_NAME}:latest"
  podman push "${REGISTRY}/${IMAGE_NAME}:latest"
fi

echo "Publish complete!"
