# Container Documentation

This document provides detailed information about using the MCP Webhook Server in containerized environments.

## Container Image Details

- **Base Image**: `node:20-alpine`
- **Size**: ~150MB
- **Security**: Non-root user, read-only filesystem support, minimal capabilities
- **Architecture**: Multi-platform support (linux/amd64, linux/arm64)

## Building

### Using Makefile (Recommended)

```bash
# Build with defaults
make build

# Build for specific registry
make build REGISTRY=quay.io/myuser

# Build with custom tag
make build IMAGE_TAG=v1.0.0
```

### Using Scripts

```bash
# Build with defaults
./scripts/build.sh

# Build with environment variables
IMAGE_NAME=mcp-webhook \
IMAGE_TAG=latest \
REGISTRY=localhost \
./scripts/build.sh
```

### Manual Build

```bash
podman build -f Containerfile -t localhost/mcp-webhook:latest .
```

## Running

### Important: Understanding stdio-based Servers

MCP servers communicate over stdio (standard input/output). The container will **exit immediately** if stdin closes. This is **expected behavior**.

The container is designed to run as a child process managed by MCP clients (like Claude Desktop), which keep stdin open. For standalone testing, see the Troubleshooting section.

### Basic Usage

**With Claude Desktop (Recommended):**
Configure in Claude Desktop - it will manage the process lifecycle correctly.

**For testing:**
```bash
# Pipe input to keep stdin open
echo '{}' | podman run --rm -i localhost/mcp-webhook:latest

# Or use cat for interactive testing
cat | podman run --rm -i localhost/mcp-webhook:latest
```

**Without authentication:**
```bash
# Note: Container exits when stdin closes (this is correct!)
podman run --rm -i localhost/mcp-webhook:latest

# Run with API key authentication
podman run --rm -i \
  -e MCP_AUTH_ENABLED=true \
  -e MCP_AUTH_TYPE=api_key \
  -e MCP_API_KEYS=secret-key \
  localhost/mcp-webhook:latest

# Run with basic authentication
podman run --rm -i \
  -e MCP_AUTH_ENABLED=true \
  -e MCP_AUTH_TYPE=basic \
  -e MCP_USERNAME=admin \
  -e MCP_PASSWORD=password \
  localhost/mcp-webhook:latest
```

### Using with Claude Desktop

Configure Claude Desktop to use the containerized MCP server:

```json
{
  "mcpServers": {
    "webhook": {
      "command": "podman",
      "args": [
        "run",
        "--rm",
        "-i",
        "--name", "mcp-webhook-claude",
        "localhost/mcp-webhook:latest"
      ],
      "env": {
        "MCP_AUTH_ENABLED": "true",
        "MCP_AUTH_TYPE": "api_key",
        "MCP_API_KEYS": "your-secret-key-here"
      }
    }
  }
}
```

### Using Podman Compose

Create a `compose.override.yaml` for local settings:

```yaml
services:
  mcp-webhook:
    environment:
      - MCP_AUTH_ENABLED=true
      - MCP_AUTH_TYPE=api_key
      - MCP_API_KEYS=my-local-key
```

Then run:

```bash
podman-compose up -d
```

## Publishing

### GitHub Container Registry (GHCR)

```bash
# Login
echo $GITHUB_TOKEN | podman login ghcr.io -u USERNAME --password-stdin

# Build and tag
podman build -f Containerfile -t ghcr.io/username/mcp-webhook:latest .

# Push
podman push ghcr.io/username/mcp-webhook:latest
```

### Docker Hub

```bash
# Login
podman login docker.io

# Build and tag
podman build -f Containerfile -t docker.io/username/mcp-webhook:latest .

# Push
podman push docker.io/username/mcp-webhook:latest
```

### Quay.io

```bash
# Login
podman login quay.io

# Build and tag
podman build -f Containerfile -t quay.io/username/mcp-webhook:latest .

# Push
podman push quay.io/username/mcp-webhook:latest
```

### Using the Publish Script

```bash
# Publish to Docker Hub
REGISTRY=docker.io/username ./scripts/publish.sh

# Publish with latest tag
REGISTRY=quay.io/username PUSH_LATEST=true ./scripts/publish.sh

# Publish specific version
IMAGE_TAG=v1.0.0 REGISTRY=ghcr.io/username ./scripts/publish.sh
```

## Security Considerations

### Container Security Features

1. **Non-root user**: Container runs as user `mcp` (UID 1001)
2. **Read-only filesystem**: Application directory is read-only
3. **Minimal capabilities**: All Linux capabilities dropped
4. **No new privileges**: Security option enabled
5. **Alpine base**: Minimal attack surface

### Best Practices

1. **Always use authentication** when exposing to network
2. **Use secrets management** for credentials (not environment variables in production)
3. **Scan images** regularly for vulnerabilities
4. **Pin base image versions** in production
5. **Use specific tags** instead of `latest` in production

### Scanning for Vulnerabilities

```bash
# Using Trivy
trivy image localhost/mcp-webhook:latest

# Using Podman's built-in scanner
podman scan localhost/mcp-webhook:latest
```

## Troubleshooting

### Container won't start

Check logs:
```bash
podman logs mcp-webhook
```

### Permission issues

Ensure the container runs as non-root:
```bash
podman run --rm localhost/mcp-webhook:latest id
# Should show: uid=1001(mcp) gid=1001(mcp)
```

### Authentication not working

Verify environment variables are set:
```bash
podman run --rm \
  -e MCP_AUTH_ENABLED=true \
  localhost/mcp-webhook:latest \
  printenv | grep MCP_
```

### stdio communication issues

Ensure `-i` (interactive) flag is used:
```bash
podman run --rm -i localhost/mcp-webhook:latest
```

## CI/CD Integration

### GitHub Actions

The project includes automated workflows:
- Build and test on every push
- Publish to GHCR on main branch
- Tag-based releases

### GitLab CI

Example `.gitlab-ci.yml`:

```yaml
build:
  image: quay.io/podman/stable
  script:
    - podman build -f Containerfile -t $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA .
    - podman push $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA
```

## Multi-Architecture Builds

Build for multiple architectures:

```bash
podman build \
  --platform linux/amd64,linux/arm64 \
  -f Containerfile \
  -t localhost/mcp-webhook:multi-arch .
```

## Advanced Configuration

### Using with Kubernetes

Example deployment:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mcp-webhook
spec:
  replicas: 1
  selector:
    matchLabels:
      app: mcp-webhook
  template:
    metadata:
      labels:
        app: mcp-webhook
    spec:
      containers:
      - name: mcp-webhook
        image: localhost/mcp-webhook:latest
        stdin: true
        env:
        - name: MCP_AUTH_ENABLED
          value: "true"
        - name: MCP_AUTH_TYPE
          value: "api_key"
        - name: MCP_API_KEYS
          valueFrom:
            secretKeyRef:
              name: mcp-secrets
              key: api-keys
        securityContext:
          runAsNonRoot: true
          runAsUser: 1001
          readOnlyRootFilesystem: true
          allowPrivilegeEscalation: false
          capabilities:
            drop:
            - ALL
```

### Using with systemd

Create a systemd unit file:

```ini
[Unit]
Description=MCP Webhook Server
After=network.target

[Service]
Type=simple
User=mcp-user
Environment="MCP_AUTH_ENABLED=true"
Environment="MCP_AUTH_TYPE=api_key"
Environment="MCP_API_KEYS=secret"
ExecStart=/usr/bin/podman run --rm -i --name mcp-webhook localhost/mcp-webhook:latest
Restart=always

[Install]
WantedBy=multi-user.target
```
