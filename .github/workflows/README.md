# GitHub Actions Workflows

This repository includes automated CI/CD workflows for building, testing, and publishing both deployment modes.

## Workflows

### 1. Test Workflow (`test.yml`)

Runs on every push and pull request to test both deployment modes.

**Jobs:**
- `test-stdio` - Tests stdio mode with Node.js
- `test-http` - Tests HTTP mode with Node.js  
- `container-stdio` - Tests stdio container build
- `container-http` - Tests HTTP container build

**What it tests:**
- Server startup
- Authentication modes
- Health endpoints
- Webhook API calls
- Container builds

### 2. Container Build & Publish Workflow (`container.yml`)

Builds and publishes container images to GitHub Container Registry (GHCR).

**Triggers:**
- Push to `main` branch
- Git tags matching `v*`
- Pull requests (build only, no push)
- Manual workflow dispatch

**Jobs:**
- Builds both stdio and HTTP containers in parallel
- Pushes to `ghcr.io/pumphouse-p/mcp-webhook`

## Published Container Images

### stdio Mode (MCP Client)

**Image:** `ghcr.io/pumphouse-p/mcp-webhook:latest`

**Tags:**
- `latest` - Latest main branch build
- `main` - Main branch builds
- `v1.0.0` - Semantic version tags
- `v1.0` - Major.minor version
- `v1` - Major version
- `main-abc123` - Branch + commit SHA

**Usage:**
```bash
# Pull from GHCR
podman pull ghcr.io/pumphouse-p/mcp-webhook:latest

# Run
echo '{}' | podman run --rm -i ghcr.io/pumphouse-p/mcp-webhook:latest
```

**Claude Desktop config:**
```json
{
  "mcpServers": {
    "webhook": {
      "command": "podman",
      "args": [
        "run",
        "--rm",
        "-i",
        "ghcr.io/pumphouse-p/mcp-webhook:latest"
      ]
    }
  }
}
```

### HTTP Mode (Web Service)

**Image:** `ghcr.io/pumphouse-p/mcp-webhook:latest-http`

**Tags:**
- `latest-http` - Latest main branch build
- `main-http` - Main branch builds
- `v1.0.0-http` - Semantic version tags
- `v1.0-http` - Major.minor version
- `v1-http` - Major version
- `main-abc123-http` - Branch + commit SHA

**Usage:**
```bash
# Pull from GHCR
podman pull ghcr.io/pumphouse-p/mcp-webhook:latest-http

# Run HTTP server
podman run --rm -p 3000:3000 ghcr.io/pumphouse-p/mcp-webhook:latest-http

# Access at http://localhost:3000
```

**Kubernetes:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mcp-webhook
spec:
  template:
    spec:
      containers:
      - name: mcp-webhook
        image: ghcr.io/pumphouse-p/mcp-webhook:latest-http
        ports:
        - containerPort: 3000
```

**Docker Compose:**
```yaml
services:
  mcp-webhook:
    image: ghcr.io/pumphouse-p/mcp-webhook:latest-http
    ports:
      - "3000:3000"
    environment:
      - MCP_AUTH_ENABLED=true
      - MCP_API_KEYS=your-key
```

## Pull Access

Container images are public and can be pulled without authentication:

```bash
# stdio mode
podman pull ghcr.io/pumphouse-p/mcp-webhook:latest

# HTTP mode
podman pull ghcr.io/pumphouse-p/mcp-webhook:latest-http
```

## Release Process

### Creating a Release

1. **Tag a version:**
   ```bash
   git tag -a v1.0.0 -m "Release v1.0.0"
   git push origin v1.0.0
   ```

2. **GitHub Actions automatically:**
   - Builds both stdio and HTTP containers
   - Tags with version numbers
   - Pushes to GHCR
   - Creates multiple version tags (v1.0.0, v1.0, v1)

3. **Published images:**
   - `ghcr.io/pumphouse-p/mcp-webhook:v1.0.0`
   - `ghcr.io/pumphouse-p/mcp-webhook:v1.0.0-http`
   - Plus major and minor version tags

### Version Tagging Strategy

- `latest` / `latest-http` - Always points to main branch
- `v1.0.0` / `v1.0.0-http` - Exact version
- `v1.0` / `v1.0-http` - Latest patch in 1.0.x
- `v1` / `v1-http` - Latest minor in 1.x.x

## Troubleshooting

### Workflow Failures

**Check workflow runs:**
```bash
# View recent runs
gh run list

# View specific run
gh run view <run-id>

# View logs
gh run view <run-id> --log
```

**Common issues:**

1. **Container build fails:**
   - Check Containerfile syntax
   - Verify dependencies in package.json
   - Test build locally first

2. **Tests fail:**
   - Run tests locally: `npm test`
   - Check for port conflicts
   - Verify network connectivity

3. **Push fails:**
   - Ensure GITHUB_TOKEN has packages:write permission
   - Check repository settings > Actions > Workflow permissions

### Local Testing

Test workflows locally with [act](https://github.com/nektos/act):

```bash
# Install act
brew install act  # macOS
# or
sudo dnf install act  # Fedora

# Run test workflow
act -j test-stdio
act -j test-http

# Run container build workflow
act -j build-and-push
```

## Security

### Image Signing

Images are not currently signed. To add signing:

1. Enable [Sigstore](https://www.sigstore.dev/) signing
2. Use [cosign](https://github.com/sigstore/cosign) in workflow
3. Verify signatures before deployment

### Vulnerability Scanning

Add to workflow:

```yaml
- name: Scan for vulnerabilities
  uses: aquasecurity/trivy-action@master
  with:
    image-ref: ghcr.io/pumphouse-p/mcp-webhook:latest-http
    format: 'sarif'
    output: 'trivy-results.sarif'
```

## Monitoring

### Workflow Status Badge

Add to README.md:

```markdown
[![Container Build](https://github.com/pumphouse-p/mcp-webhook/actions/workflows/container.yml/badge.svg)](https://github.com/pumphouse-p/mcp-webhook/actions/workflows/container.yml)
[![Tests](https://github.com/pumphouse-p/mcp-webhook/actions/workflows/test.yml/badge.svg)](https://github.com/pumphouse-p/mcp-webhook/actions/workflows/test.yml)
```

### Registry Usage

View published packages:
- https://github.com/pumphouse-p/mcp-webhook/pkgs/container/mcp-webhook

## Contributing

When contributing, ensure:
1. Tests pass locally
2. Workflows pass in PR
3. Container builds successfully
4. Documentation updated if needed

## Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [GitHub Container Registry](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)
- [Docker Build Push Action](https://github.com/marketplace/actions/build-and-push-docker-images)
