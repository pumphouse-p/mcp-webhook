# Troubleshooting Guide

## Container Exits Immediately

### Symptom
When running `podman run --rm -i localhost/mcp-webhook:latest`, the container starts but exits immediately.

### Explanation
This is **expected behavior** for stdio-based MCP servers. The server is designed to run as a child process managed by an MCP client (like Claude Desktop). When stdin closes, the server exits gracefully.

### Solutions

#### For Use with Claude Desktop (Recommended)
Claude Desktop manages the process lifecycle and keeps stdin open. Configure normally:

```json
{
  "mcpServers": {
    "webhook": {
      "command": "podman",
      "args": ["run", "--rm", "-i", "localhost/mcp-webhook:latest"]
    }
  }
}
```

The container will stay running as long as Claude Desktop is connected.

#### For Testing
To test that the container works, pipe input to it:

```bash
# Test with echo (will process and exit)
echo '{}' | podman run --rm -i localhost/mcp-webhook:latest

# Keep container running with cat
cat | podman run --rm -i localhost/mcp-webhook:latest
# Press Ctrl+D to exit
```

#### For Interactive Testing
Use an interactive shell to keep stdin open:

```bash
# Start container with stdin from your terminal
podman run --rm -i localhost/mcp-webhook:latest < /dev/stdin
```

#### For Background Daemon (Not Recommended)
If you need the container to run as a background service (unusual for stdio-based servers):

```bash
# Use a named pipe to keep stdin open
mkfifo /tmp/mcp-input
podman run --rm -i localhost/mcp-webhook:latest < /tmp/mcp-input &

# To stop: remove the named pipe
rm /tmp/mcp-input
```

**Note:** Running stdio-based servers as daemons defeats their purpose. Consider using HTTP-based alternatives if you need a long-running webhook service.

## Container Authentication Issues

### Symptom
Authentication errors when making webhook calls even though credentials are set.

### Solution
Ensure environment variables are passed correctly:

```bash
podman run --rm -i \
  -e MCP_AUTH_ENABLED=true \
  -e MCP_AUTH_TYPE=api_key \
  -e MCP_API_KEYS=your-key \
  localhost/mcp-webhook:latest
```

Verify they're set inside the container:

```bash
echo 'exit' | podman run --rm -i \
  -e MCP_AUTH_ENABLED=true \
  --entrypoint sh \
  localhost/mcp-webhook:latest \
  -c 'env | grep MCP_'
```

## Permission Errors

### Symptom
Permission denied errors when running container.

### Solution
The container runs as non-root user (UID 1001). This is a security feature and should not cause issues for stdio-based operation. If you encounter permission problems:

```bash
# Check container user
podman run --rm localhost/mcp-webhook:latest id
# Should output: uid=1001(mcp) gid=1001(mcp)
```

For volume mounts (usually not needed for stdio servers):

```bash
# Ensure proper ownership
chown -R 1001:1001 /path/to/volume
```

## Node.js or npm Errors

### Symptom
Module not found or dependency errors.

### Solution
Rebuild the container to ensure all dependencies are installed:

```bash
# Clean rebuild
podman rmi localhost/mcp-webhook:latest
make build
```

Verify dependencies are installed:

```bash
podman run --rm localhost/mcp-webhook:latest \
  ls -la /app/node_modules | head -20
```

## Container Build Failures

### Symptom
Build fails with errors about missing files or network issues.

### Common Causes

**Missing package-lock.json:**
```bash
npm install  # Regenerate package-lock.json
make build
```

**Network issues during npm install:**
```bash
# Build with custom npm registry
podman build \
  --build-arg NPM_REGISTRY=https://registry.npmjs.org \
  -f Containerfile \
  -t localhost/mcp-webhook:latest .
```

**Podman version issues:**
```bash
# Ensure Podman 4.0+
podman --version

# Update Podman if needed (Fedora/RHEL)
sudo dnf update podman
```

## Claude Desktop Integration Issues

### Symptom
MCP server not showing up in Claude Desktop or connection errors.

### Solutions

**Check config file location:**
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Linux: `~/.config/Claude/claude_desktop_config.json`  
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

**Verify JSON syntax:**
```bash
# Validate JSON
cat ~/Library/Application\ Support/Claude/claude_desktop_config.json | jq .
```

**Check container is accessible:**
```bash
# Test manually
echo '{}' | podman run --rm -i localhost/mcp-webhook:latest 2>&1
```

**Check Claude Desktop logs:**
- macOS: `~/Library/Logs/Claude/`
- Linux: `~/.config/Claude/logs/`
- Windows: `%APPDATA%\Claude\logs\`

### Symptom
Container works in terminal but not from Claude Desktop.

### Solution
Ensure the full path to podman is specified:

```bash
# Find podman location
which podman
# Usually /usr/bin/podman

# Use full path in config
{
  "mcpServers": {
    "webhook": {
      "command": "/usr/bin/podman",
      "args": ["run", "--rm", "-i", "localhost/mcp-webhook:latest"]
    }
  }
}
```

## Webhook Call Failures

### Symptom
Webhook requests fail with network or timeout errors.

### Solutions

**DNS issues in container:**
```bash
# Test DNS resolution
podman run --rm localhost/mcp-webhook:latest \
  nslookup google.com
```

**Network connectivity:**
```bash
# Ensure container can reach internet
podman run --rm localhost/mcp-webhook:latest \
  wget -O- https://httpbin.org/get
```

**SSL/TLS certificate issues:**
```bash
# The alpine image includes ca-certificates
# Rebuild if you suspect cert issues
make build
```

**Firewall blocking outbound connections:**
```bash
# Check Podman network
podman network ls
podman network inspect podman

# Try with host network (less secure)
podman run --rm -i --network=host localhost/mcp-webhook:latest
```

## Performance Issues

### Symptom
Slow response times or high memory usage.

### Solutions

**Check container resources:**
```bash
# Monitor container stats
podman stats --no-stream

# Limit resources if needed
podman run --rm -i \
  --memory=256m \
  --cpus=1 \
  localhost/mcp-webhook:latest
```

**Reduce image size:**
```bash
# Current size
podman images localhost/mcp-webhook

# The image is already optimized (~150MB)
# Further optimization requires removing dependencies
```

## Getting Help

If you're still experiencing issues:

1. **Check the logs:** Container stderr contains startup messages
2. **Verify the basics:** Ensure Node.js version, Podman version are compatible
3. **Test without container:** Try running with Node.js directly to isolate container issues
4. **Check examples:** Review QUICKSTART.md and CONTAINER.md for working examples

### Diagnostic Commands

```bash
# System info
podman info
podman version
node --version
npm --version

# Container inspection
podman inspect localhost/mcp-webhook:latest

# Test basic functionality
echo '{"test": true}' | podman run --rm -i localhost/mcp-webhook:latest 2>&1 | head -5

# Check environment
podman run --rm localhost/mcp-webhook:latest env
```
