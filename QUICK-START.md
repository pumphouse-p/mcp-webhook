# Quick Start Guide - MCP Webhook Server

Choose your deployment mode based on your use case:

## 🎯 Which Mode Should I Use?

| Mode | Use Case | Best For |
|------|----------|----------|
| **MCP-over-HTTP** | Production deployments, MCP clients over network | ✅ Recommended |
| **stdio** | Claude Desktop local integration | Desktop apps |
| **HTTP REST** | Simple webhook testing with curl | Quick testing |

## 🚀 Quick Start: MCP-over-HTTP (Recommended)

### Local Development

```bash
# Install dependencies
npm install

# Run without authentication (development)
npm run start:mcp-http

# Run with authentication (production)
MCP_AUTH_ENABLED=true MCP_API_KEYS=your-secret-key npm run start:mcp-http
```

### Test It

```bash
# Test all webhook tools
API_KEY=your-secret-key node scripts/test-mcp-http.js

# Or test with curl
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Authorization: Bearer your-secret-key" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "webhook_post",
      "arguments": {
        "url": "https://httpbin.org/post",
        "payload": {"message": "Hello World"}
      }
    },
    "id": 1
  }'
```

### Container Deployment

```bash
# Build container
make build-mcp-http

# Run with authentication
make run-mcp-http MCP_AUTH_ENABLED=true MCP_API_KEYS=production-key

# Or with podman directly
podman run -d \
  -p 3000:3000 \
  -e MCP_AUTH_ENABLED=true \
  -e MCP_API_KEYS=production-key \
  localhost/mcp-webhook:mcp-http
```

## 📦 Container from GitHub Registry

```bash
# Pull latest
podman pull ghcr.io/pumphouse-p/mcp-webhook:latest-mcp-http

# Run it
podman run -d \
  -p 3000:3000 \
  -e MCP_AUTH_ENABLED=true \
  -e MCP_API_KEYS=your-key \
  ghcr.io/pumphouse-p/mcp-webhook:latest-mcp-http
```

## 🔧 Configuration

Create a `.env` file:

```bash
# Server configuration
PORT=3000
HOST=0.0.0.0

# Authentication (highly recommended for production)
MCP_AUTH_ENABLED=true
MCP_API_KEYS=key1,key2,key3
```

## 📝 Available Tools

All tools support authentication and custom headers:

### webhook_post
```json
{
  "name": "webhook_post",
  "arguments": {
    "url": "https://example.com/webhook",
    "payload": {"data": "value"},
    "headers": {"X-Custom": "header"},
    "basic_auth": {"username": "user", "password": "pass"}
  }
}
```

### webhook_get
```json
{
  "name": "webhook_get",
  "arguments": {
    "url": "https://example.com/api",
    "params": {"page": "1", "limit": "10"},
    "api_key": {"key": "abc123", "location": "header", "name": "X-API-Key"}
  }
}
```

### webhook_put
```json
{
  "name": "webhook_put",
  "arguments": {
    "url": "https://example.com/resource/123",
    "payload": {"status": "updated"}
  }
}
```

### webhook_delete
```json
{
  "name": "webhook_delete",
  "arguments": {
    "url": "https://example.com/resource/123",
    "headers": {"X-Reason": "cleanup"}
  }
}
```

## 🛡️ Production Checklist

- [ ] Enable authentication: `MCP_AUTH_ENABLED=true`
- [ ] Use strong API keys: `MCP_API_KEYS=<random-256-bit-key>`
- [ ] Deploy behind HTTPS reverse proxy (nginx, traefik)
- [ ] Set up rate limiting
- [ ] Configure firewall rules
- [ ] Monitor logs
- [ ] Set up health check monitoring
- [ ] Use specific version tags, not `latest`

## 📚 More Information

- [MCP-HTTP-README.md](MCP-HTTP-README.md) - Complete MCP-over-HTTP documentation
- [API.md](API.md) - REST API reference
- [DEPLOYMENT.md](DEPLOYMENT.md) - Production deployment guide
- [.github/WORKFLOWS.md](.github/WORKFLOWS.md) - CI/CD workflows

## 🔗 Quick Links

**Endpoints:**
- MCP: `POST http://localhost:3000/mcp`
- Health: `GET http://localhost:3000/health`
- Info: `GET http://localhost:3000/`

**Authentication:**
- Header: `Authorization: Bearer <api-key>`
- Required for production deployments

**Test Tools:**
- `scripts/test-mcp-http.js` - Full test suite
- `make test-mcp-http` - Run tests via Makefile

## ⚡ Quick Commands

```bash
# Development
npm install && npm run start:mcp-http

# Testing
make test-mcp-http

# Container build
make build-mcp-http

# Container run
make run-mcp-http MCP_AUTH_ENABLED=true MCP_API_KEYS=test-key

# View logs
podman logs -f mcp-webhook-mcp-http
```

## 🆘 Troubleshooting

**Server won't start:**
```bash
# Check if port is already in use
lsof -i :3000

# Use different port
PORT=3001 npm run start:mcp-http
```

**Authentication fails:**
```bash
# Verify API key is correct
echo $MCP_API_KEYS

# Test without auth first
MCP_AUTH_ENABLED=false npm run start:mcp-http
```

**Container issues:**
```bash
# Check container logs
podman logs mcp-webhook-mcp-http

# Rebuild from scratch
podman rmi localhost/mcp-webhook:mcp-http
make build-mcp-http
```
