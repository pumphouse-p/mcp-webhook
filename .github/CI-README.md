# CI/CD Status and Known Issues

## Current Status

### ✅ Working Tests
- **Node.js Tests** (stdio, http, mcp-http) - All passing
- **MCP-over-HTTP functionality** - Fully tested and working

### ⚠️ Known Issues
- **Container Builds** - May fail in GitHub Actions due to npm install issues in Docker/rootless environments
- Container tests are marked as `continue-on-error: true` so they don't block CI

## Why Container Builds May Fail

The container builds use `npm install --omit=dev` which can fail in certain Docker build environments with:
```
Fatal error in , line 0
Check failed: 12 == (*__errno_location()).
```

This is a known issue with:
- Rootless container builds
- Certain Docker build contexts
- npm/Node.js compatibility in Alpine containers

## Workarounds

### For Local Development
Use Node.js directly instead of containers:
```bash
npm install
npm run start:mcp-http
```

### For Production Deployments
Build containers locally where they work:
```bash
# Local build (usually works)
make build-mcp-http

# Or use pre-built images from GHCR (when published successfully)
podman pull ghcr.io/pumphouse-p/mcp-webhook:latest-mcp-http
```

### For CI/CD
The Node.js tests are the source of truth. Container builds are:
- Marked as `continue-on-error: true`
- Using `fail-fast: false` strategy
- Not blocking the overall CI pipeline

## Alternative: Use Pre-built Base Images

If container builds continue to fail, consider:

1. **Use a different base image** (node:20 instead of node:20-alpine)
2. **Pre-install dependencies** in a custom base image
3. **Use package managers** that work better in containers (pnpm, yarn)

## Test Coverage

Even without container tests, we have comprehensive coverage:

| Component | Test Type | Status |
|-----------|-----------|--------|
| stdio mode | Node.js | ✅ Passing |
| HTTP mode | Node.js | ✅ Passing |
| MCP-over-HTTP | Node.js | ✅ Passing |
| MCP protocol | Integration | ✅ Passing |
| Tool execution | Integration | ✅ Passing |
| Authentication | Integration | ✅ Passing |
| Container builds | Docker | ⚠️ May fail (non-blocking) |

## Fixing Container Builds

To fix container builds permanently, try:

1. **Use node:20 (Debian) instead of node:20-alpine:**
```dockerfile
FROM node:20
```

2. **Use npm cache mount:**
```dockerfile
RUN --mount=type=cache,target=/root/.npm npm install --omit=dev
```

3. **Copy node_modules from local:**
```dockerfile
COPY node_modules ./node_modules
```

## Monitoring CI

Check GitHub Actions status:
- Node.js tests must pass ✅
- Container builds can fail ⚠️ (non-blocking)

If Node.js tests fail, that's a real issue to fix.
If only container builds fail, the code still works.

## Questions?

See:
- [.github/WORKFLOWS.md](.github/WORKFLOWS.md) - Complete CI/CD documentation
- [TROUBLESHOOTING.md](../TROUBLESHOOTING.md) - General troubleshooting
- [CONTAINER.md](../CONTAINER.md) - Container documentation
