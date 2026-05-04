# GitHub Actions Workflows

This repository includes automated CI/CD workflows for building, testing, and publishing container images.

## Workflows

### 1. Build and Publish Container (`container.yml`)

**Triggers:**
- Push to `main` branch
- Pull requests to `main` branch
- Git tags matching `v*`
- Manual workflow dispatch

**What it does:**
- Builds three container variants in parallel:
  - **stdio mode** (`latest`): For Claude Desktop integration
  - **HTTP mode** (`latest-http`): Plain REST API server
  - **MCP-over-HTTP mode** (`latest-mcp-http`): MCP protocol over HTTP (recommended)
- Publishes to GitHub Container Registry (ghcr.io)
- Creates version tags for releases
- Tests each container variant

**Container images published:**
```
ghcr.io/<owner>/<repo>:latest          # stdio mode
ghcr.io/<owner>/<repo>:latest-http     # HTTP REST API
ghcr.io/<owner>/<repo>:latest-mcp-http # MCP-over-HTTP (recommended)
```

**Version tags** (for git tags like `v1.2.3`):
```
ghcr.io/<owner>/<repo>:1.2.3
ghcr.io/<owner>/<repo>:1.2.3-http
ghcr.io/<owner>/<repo>:1.2.3-mcp-http
```

### 2. Test (`test.yml`)

**Triggers:**
- Push to `main` branch
- Pull requests to `main` branch

**Test jobs:**

#### `test-stdio`
- Tests stdio mode with Node.js
- Verifies server startup
- Tests authentication modes

#### `test-http`
- Tests HTTP REST API with Node.js
- Verifies health and info endpoints
- Tests webhook endpoints (POST, GET)

#### `test-mcp-http`
- Tests MCP-over-HTTP with Node.js
- Verifies MCP protocol endpoints
- Tests initialization, tool listing, and tool calls
- Runs full test suite against httpbin.org

#### `container-stdio`
- Builds stdio container
- Tests container startup

#### `container-http`
- Builds HTTP container
- Tests health endpoint
- Tests webhook functionality

#### `container-mcp-http`
- Builds MCP-over-HTTP container
- Tests health endpoint
- Tests MCP protocol
- Tests tool execution

## Testing Locally

### Test all modes with Node.js

```bash
# Test stdio mode
npm start

# Test HTTP mode
npm run start:http &
curl http://localhost:3000/health
curl -X POST http://localhost:3000/api/webhook/get \
  -H "Content-Type: application/json" \
  -d '{"url":"https://httpbin.org/get"}'
killall node

# Test MCP-over-HTTP mode
npm run start:mcp-http &
curl http://localhost:3000/health
node scripts/test-mcp-http.js
killall node
```

### Test all modes with containers

```bash
# Build all containers
make build
make build-http
make build-mcp-http

# Test stdio container
echo '{}' | podman run --rm -i localhost/mcp-webhook:latest

# Test HTTP container
make run-http &
sleep 3
curl http://localhost:3000/health
podman stop mcp-webhook-http

# Test MCP-over-HTTP container
make run-mcp-http &
sleep 3
curl http://localhost:3000/health
make test-mcp-http
podman stop mcp-webhook-mcp-http
```

## Pull Container Images

**Latest versions:**
```bash
# Stdio mode
podman pull ghcr.io/<owner>/<repo>:latest

# HTTP mode
podman pull ghcr.io/<owner>/<repo>:latest-http

# MCP-over-HTTP mode (recommended)
podman pull ghcr.io/<owner>/<repo>:latest-mcp-http
```

**Specific versions:**
```bash
podman pull ghcr.io/<owner>/<repo>:1.0.0-mcp-http
```

## Environment Variables for CI

The workflows use these environment variables:

| Variable | Description | Set in |
|----------|-------------|--------|
| `GITHUB_TOKEN` | Automatic token for GHCR | GitHub (automatic) |
| `REGISTRY` | Container registry | Workflow env (ghcr.io) |
| `IMAGE_NAME` | Repository name | Workflow env (auto) |

## Workflow Permissions

The workflows require these permissions:
- `contents: read` - Read repository content
- `packages: write` - Publish to GitHub Container Registry

These are configured in the workflow files and should work automatically for the repository.

## Manual Workflow Dispatch

The `container.yml` workflow can be triggered manually from the Actions tab:

1. Go to Actions → Build and Publish Container
2. Click "Run workflow"
3. Select branch
4. Click "Run workflow"

This is useful for testing container builds without pushing code.

## Troubleshooting

### Container build fails in CI

The stdio and HTTP containers may fail to build with npm ci errors in CI. This is a known issue with rootless container builds. The MCP-over-HTTP container should build successfully.

**Workaround:** Use the pre-built images from GHCR or build locally.

### Test fails with connection refused

Increase the `sleep` duration in the workflow file to give the server more time to start:
```yaml
sleep 3  # Increase to 5 or 10
```

### Authentication tests fail

Ensure the MCP_API_KEYS environment variable is set correctly:
```yaml
- name: Test with auth
  env:
    MCP_API_KEYS: test-key
  run: |
    # Your test commands
```

## Best Practices

1. **Always test locally first** before pushing
2. **Use MCP-over-HTTP mode** for production deployments
3. **Pin versions** in production (don't use `latest`)
4. **Monitor workflow runs** in the Actions tab
5. **Review security alerts** for dependencies
