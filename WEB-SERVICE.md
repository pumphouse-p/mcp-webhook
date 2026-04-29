# Web Service Deployment Summary

The MCP Webhook Server has been extended with full web service capabilities, supporting both the original stdio mode (for MCP clients) and a new HTTP/REST API mode for web deployments.

## Deployment Modes

### stdio Mode (Original)
- For use with MCP clients like Claude Desktop
- Communicates over standard input/output
- Container: `mcp-webhook:latest`
- See: [CONTAINER.md](CONTAINER.md)

### HTTP Mode (New)
- Standalone web service with REST API
- HTTP endpoints for webhook operations
- Container: `mcp-webhook:http`
- This document

## HTTP Mode Features

### REST API Endpoints
- `POST /api/webhook/post` - Send POST requests to webhooks
- `POST /api/webhook/get` - Send GET requests to webhooks
- `POST /api/webhook/put` - Send PUT requests to webhooks
- `POST /api/webhook/delete` - Send DELETE requests to webhooks
- `GET /health` - Health check endpoint
- `GET /` - Server information

### Authentication
- API Key (Bearer token)
- Basic Auth (username/password)
- Optional - disabled by default

### Features
- CORS enabled for cross-origin requests
- JSON request/response format
- Comprehensive error handling
- Health checks for load balancers
- Security hardening (non-root, read-only filesystem)

## Quick Start

### Local Development

**Node.js:**
```bash
npm run start:http
# Server runs on http://localhost:3000
```

**Container:**
```bash
# Build
./scripts/build-http.sh

# Run
./scripts/run-http.sh

# Or use Makefile
make build-http
make run-http
```

### Testing

```bash
# Automated tests
make test-http

# Manual test
curl http://localhost:3000/health
curl http://localhost:3000/

# Test webhook POST
curl -X POST http://localhost:3000/api/webhook/post \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://webhook.site/your-id",
    "payload": {"message": "Hello from REST API"}
  }'
```

## Production Deployment

### Pre-built Images

Use pre-built images from GitHub Container Registry:

```bash
# Pull the latest HTTP image
podman pull ghcr.io/pumphouse-p/mcp-webhook:latest-http

# Run it
podman run --rm -p 3000:3000 ghcr.io/pumphouse-p/mcp-webhook:latest-http
```

### Docker/Podman Compose

**With pre-built image:**
```yaml
services:
  mcp-webhook:
    image: ghcr.io/pumphouse-p/mcp-webhook:latest-http
    ports:
      - "3000:3000"
```

**Or build locally:**
```bash
# Start services
podman-compose -f compose.http.yaml up -d

# View logs
podman-compose -f compose.http.yaml logs -f

# Stop services
podman-compose -f compose.http.yaml down
```

**Configuration** (`compose.http.yaml`):
- Port 3000 exposed
- Health checks configured
- Environment-based config
- Security hardened (read-only, no new privileges)

### Kubernetes

**Deploy:**
```bash
# Apply all manifests
kubectl apply -f deploy/kubernetes/

# Or individually
kubectl apply -f deploy/kubernetes/deployment.yaml
kubectl apply -f deploy/kubernetes/ingress.yaml
kubectl apply -f deploy/kubernetes/hpa.yaml
```

**Features:**
- 3 replicas by default
- Horizontal Pod Autoscaler (2-10 pods)
- Liveness and readiness probes
- Resource limits configured
- Secrets management for auth
- Ingress with SSL/TLS support

**Scaling:**
```bash
# Manual scaling
kubectl scale deployment mcp-webhook --replicas=5

# Auto-scaling is automatic via HPA
kubectl get hpa mcp-webhook
```

### Systemd (Linux Servers)

**Native Node.js:**
```bash
sudo cp deploy/systemd/mcp-webhook.service /etc/systemd/system/
sudo systemctl enable --now mcp-webhook
```

**Containerized:**
```bash
sudo cp deploy/systemd/mcp-webhook-container.service /etc/systemd/system/
sudo systemctl enable --now mcp-webhook-container
```

**Management:**
```bash
sudo systemctl status mcp-webhook
sudo systemctl restart mcp-webhook
sudo journalctl -u mcp-webhook -f
```

### Nginx Reverse Proxy

**Setup:**
```bash
sudo cp deploy/nginx/mcp-webhook.conf /etc/nginx/conf.d/
sudo nano /etc/nginx/conf.d/mcp-webhook.conf  # Update domain
sudo nginx -t
sudo systemctl reload nginx
```

**Features:**
- SSL/TLS termination
- Load balancing
- Rate limiting (10 req/s per IP)
- Security headers
- WebSocket/SSE support (for future use)

## Cloud Deployments

### AWS ECS/Fargate
See [DEPLOYMENT.md](DEPLOYMENT.md#aws-ecsfargate)

### Google Cloud Run
See [DEPLOYMENT.md](DEPLOYMENT.md#google-cloud-run)

### Azure Container Instances
See [DEPLOYMENT.md](DEPLOYMENT.md#azure-container-instances)

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | HTTP server port |
| `HOST` | `0.0.0.0` | Bind address |
| `MCP_AUTH_ENABLED` | `false` | Enable authentication |
| `MCP_AUTH_TYPE` | `api_key` | Auth type: `api_key` or `basic` |
| `MCP_API_KEYS` | - | Comma-separated API keys |
| `MCP_USERNAME` | - | Basic auth username |
| `MCP_PASSWORD` | - | Basic auth password |

### Authentication Example

**API Key:**
```bash
MCP_AUTH_ENABLED=true \
MCP_AUTH_TYPE=api_key \
MCP_API_KEYS=key1,key2,key3 \
npm run start:http
```

**Basic Auth:**
```bash
MCP_AUTH_ENABLED=true \
MCP_AUTH_TYPE=basic \
MCP_USERNAME=admin \
MCP_PASSWORD=secure-password \
npm run start:http
```

## API Usage Examples

### Simple POST

```bash
curl -X POST http://localhost:3000/api/webhook/post \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://webhook.site/test",
    "payload": {
      "event": "user.created",
      "user_id": "12345"
    }
  }'
```

### With Authentication

```bash
curl -X POST http://localhost:3000/api/webhook/post \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-key" \
  -d '{
    "url": "https://api.example.com/webhook",
    "payload": {"data": "secure"}
  }'
```

### With Webhook Authentication

```bash
curl -X POST http://localhost:3000/api/webhook/post \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://api.example.com/webhook",
    "payload": {"data": "content"},
    "api_key": {
      "key": "webhook-api-key",
      "location": "header",
      "name": "X-API-Key"
    }
  }'
```

### JavaScript/Node.js

```javascript
const response = await fetch('http://localhost:3000/api/webhook/post', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your-api-key'
  },
  body: JSON.stringify({
    url: 'https://webhook.site/test',
    payload: {
      event: 'test.event',
      timestamp: new Date().toISOString()
    }
  })
});

const result = await response.json();
console.log(result);
```

### Python

```python
import requests

response = requests.post(
    'http://localhost:3000/api/webhook/post',
    headers={
        'Content-Type': 'application/json',
        'Authorization': 'Bearer your-api-key'
    },
    json={
        'url': 'https://webhook.site/test',
        'payload': {
            'event': 'test.event',
            'data': 'content'
        }
    }
)

print(response.json())
```

## Monitoring

### Health Checks

```bash
# Simple check
curl http://localhost:3000/health

# Response
{
  "status": "healthy",
  "mode": "http"
}
```

### Logs

**Node.js:**
```bash
# Output to stdout/stderr
npm run start:http 2>&1 | tee server.log
```

**Container:**
```bash
podman logs mcp-webhook-http
podman logs -f mcp-webhook-http  # Follow
```

**Kubernetes:**
```bash
kubectl logs -f deployment/mcp-webhook
kubectl logs -l app=mcp-webhook --tail=100
```

**Systemd:**
```bash
sudo journalctl -u mcp-webhook -f
sudo journalctl -u mcp-webhook --since "1 hour ago"
```

## Performance

### Benchmarking

```bash
# Using Apache Bench
ab -n 1000 -c 10 http://localhost:3000/health

# Using wrk
wrk -t4 -c100 -d30s http://localhost:3000/health
```

### Resource Usage

**Typical usage per instance:**
- CPU: 50-100m (0.05-0.1 cores)
- Memory: 100-200 MB
- Network: Depends on webhook traffic

**Recommended production limits:**
- CPU request: 100m, limit: 500m
- Memory request: 128Mi, limit: 512Mi

## Security

### Best Practices

1. **Always use HTTPS in production**
   - Configure SSL/TLS via reverse proxy (Nginx)
   - Use Let's Encrypt for free certificates

2. **Enable authentication**
   ```bash
   MCP_AUTH_ENABLED=true
   MCP_AUTH_TYPE=api_key
   MCP_API_KEYS=$(openssl rand -base64 32)
   ```

3. **Use strong API keys**
   ```bash
   # Generate secure key
   openssl rand -base64 32
   ```

4. **Rate limiting**
   - Deploy behind Nginx with rate limits
   - Or use cloud provider WAF

5. **Network isolation**
   - Firewall rules
   - Kubernetes Network Policies
   - Private VPC/subnet

6. **Monitor and audit**
   - Enable logging
   - Monitor failed authentication attempts
   - Set up alerts for unusual patterns

### Container Security

- Runs as non-root user (UID 1001)
- Read-only root filesystem
- All capabilities dropped
- No new privileges
- Minimal attack surface (Alpine base)

## Troubleshooting

### Server won't start

```bash
# Check port availability
sudo lsof -i :3000

# Check logs
podman logs mcp-webhook-http
```

### Connection refused

```bash
# Verify server is listening
sudo ss -tlnp | grep 3000

# Test locally first
curl http://127.0.0.1:3000/health
```

### Authentication failures

```bash
# Verify environment variables
env | grep MCP_

# Test without auth first
MCP_AUTH_ENABLED=false npm run start:http
```

### Webhook calls failing

```bash
# Test webhook directly
curl -v https://webhook.site/test

# Check DNS resolution
nslookup webhook.site

# Check SSL certificates
curl -v https://webhook.site/test
```

See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for more help.

## Documentation

- [README.md](README.md) - Project overview
- [API.md](API.md) - Complete REST API reference
- [DEPLOYMENT.md](DEPLOYMENT.md) - Detailed deployment instructions
- [CONTAINER.md](CONTAINER.md) - Container usage guide
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - Common issues and solutions
- [QUICKSTART.md](QUICKSTART.md) - Quick start guide

## What's Next

### Enhancements
- [ ] MCP-over-HTTP (SSE) support
- [ ] WebSocket transport
- [ ] Prometheus metrics endpoint
- [ ] Request/response logging
- [ ] Retry logic with exponential backoff
- [ ] Async webhook calls
- [ ] Batch operations
- [ ] Webhook signature verification

### Contributing
Contributions welcome! See the repository for guidelines.

## Support

For issues or questions:
- Check documentation first
- Review troubleshooting guide
- Test with httpbin.org or webhook.site
- Open an issue on GitHub
