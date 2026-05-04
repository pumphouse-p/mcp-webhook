# Reverse Proxy Configuration Guide

This guide covers deploying the MCP Webhook Server behind reverse proxies like Traefik, nginx, or Caddy.

## Common Issues and Solutions

### SSL Certificate Failures

If you're experiencing SSL certificate failures when accessing the MCP server through a reverse proxy, check these common causes:

#### 1. **Application Not Trusting Proxy** ✅ Fixed in v1.0.0+

The MCP-over-HTTP server now includes `app.set("trust proxy", true)` which is **required** when behind a reverse proxy.

**What this fixes:**
- Enables Express to read `X-Forwarded-*` headers correctly
- Allows proper IP address detection
- Fixes protocol detection (HTTP vs HTTPS)
- Ensures secure cookies work correctly

**Without this setting:**
- The app sees the proxy's IP instead of the client's IP
- The app thinks it's running on HTTP even when accessed via HTTPS
- Redirects may break
- WebSocket/SSE connections may fail

#### 2. **Outbound Webhook SSL Validation**

When the MCP server makes outbound webhook calls, it validates SSL certificates by default.

**If calling webhooks with self-signed certificates:**

```bash
# Disable SSL verification (NOT recommended for production)
NODE_TLS_REJECT_UNAUTHORIZED=0 npm run start:mcp-http
```

**Better solution - Add the CA certificate:**

```bash
# Set NODE_EXTRA_CA_CERTS to your CA bundle
NODE_EXTRA_CA_CERTS=/path/to/ca-certificates.crt npm run start:mcp-http
```

#### 3. **Proxy Protocol Mismatch**

Ensure the proxy is forwarding the correct protocol headers.

**Required headers from proxy to backend:**
- `X-Forwarded-For`: Client IP
- `X-Forwarded-Proto`: Original protocol (http/https)
- `X-Forwarded-Host`: Original host header
- `X-Real-IP`: Client IP (alternative)

## Traefik Configuration

### Basic Traefik Setup

**Docker Compose with Traefik:**

```yaml
version: '3.8'

services:
  traefik:
    image: traefik:v2.10
    command:
      - "--api.insecure=true"
      - "--providers.docker=true"
      - "--providers.docker.exposedbydefault=false"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
      - "--certificatesresolvers.myresolver.acme.tlschallenge=true"
      - "--certificatesresolvers.myresolver.acme.email=your-email@example.com"
      - "--certificatesresolvers.myresolver.acme.storage=/letsencrypt/acme.json"
    ports:
      - "80:80"
      - "443:443"
      - "8080:8080"
    volumes:
      - "/var/run/docker.sock:/var/run/docker.sock:ro"
      - "./letsencrypt:/letsencrypt"

  mcp-webhook:
    image: ghcr.io/pumphouse-p/mcp-webhook:latest-mcp-http
    environment:
      - MCP_AUTH_ENABLED=true
      - MCP_API_KEYS=${MCP_API_KEYS}
      - LOG_LEVEL=INFO
    labels:
      - "traefik.enable=true"
      # HTTP router
      - "traefik.http.routers.mcp-webhook.rule=Host(`mcp.example.com`)"
      - "traefik.http.routers.mcp-webhook.entrypoints=websecure"
      - "traefik.http.routers.mcp-webhook.tls.certresolver=myresolver"
      # Service
      - "traefik.http.services.mcp-webhook.loadbalancer.server.port=3000"
      # Headers middleware
      - "traefik.http.middlewares.mcp-headers.headers.customrequestheaders.X-Forwarded-Proto=https"
      - "traefik.http.routers.mcp-webhook.middlewares=mcp-headers"
```

### Traefik with Path Prefix

If running under a path like `https://example.com/mcp-webhook/`:

```yaml
services:
  mcp-webhook:
    # ... (same as above)
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.mcp-webhook.rule=Host(`example.com`) && PathPrefix(`/mcp-webhook`)"
      - "traefik.http.routers.mcp-webhook.entrypoints=websecure"
      - "traefik.http.routers.mcp-webhook.tls.certresolver=myresolver"
      # Strip prefix
      - "traefik.http.middlewares.mcp-strip.stripprefix.prefixes=/mcp-webhook"
      - "traefik.http.routers.mcp-webhook.middlewares=mcp-strip"
      - "traefik.http.services.mcp-webhook.loadbalancer.server.port=3000"
```

### Traefik Static Configuration File

**traefik.yml:**

```yaml
entryPoints:
  web:
    address: ":80"
    http:
      redirections:
        entryPoint:
          to: websecure
          scheme: https
  websecure:
    address: ":443"

providers:
  docker:
    exposedByDefault: false

certificatesResolvers:
  letsencrypt:
    acme:
      email: your-email@example.com
      storage: /letsencrypt/acme.json
      tlsChallenge: {}
```

**docker-compose.yml:**

```yaml
services:
  mcp-webhook:
    image: ghcr.io/pumphouse-p/mcp-webhook:latest-mcp-http
    environment:
      - MCP_AUTH_ENABLED=true
      - MCP_API_KEYS=${MCP_API_KEYS}
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.mcp.rule=Host(`mcp.yourdomain.com`)"
      - "traefik.http.routers.mcp.entrypoints=websecure"
      - "traefik.http.routers.mcp.tls.certresolver=letsencrypt"
      - "traefik.http.services.mcp.loadbalancer.server.port=3000"
```

## Nginx Configuration

### Basic Nginx Reverse Proxy

**/etc/nginx/sites-available/mcp-webhook:**

```nginx
upstream mcp-webhook {
    server localhost:3000;
}

server {
    listen 80;
    server_name mcp.example.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name mcp.example.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/mcp.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/mcp.example.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Proxy settings
    location / {
        proxy_pass http://mcp-webhook;
        proxy_http_version 1.1;
        
        # Required headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        
        # SSE support (required for MCP-over-HTTP)
        proxy_set_header Connection '';
        proxy_buffering off;
        proxy_cache off;
        chunked_transfer_encoding off;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Health check endpoint (optional)
    location /health {
        proxy_pass http://mcp-webhook/health;
        access_log off;
    }
}
```

### Nginx with Rate Limiting

```nginx
# Define rate limit zone
limit_req_zone $binary_remote_addr zone=mcp_limit:10m rate=10r/s;

server {
    listen 443 ssl http2;
    server_name mcp.example.com;

    # SSL config...

    location / {
        # Apply rate limiting
        limit_req zone=mcp_limit burst=20 nodelay;
        
        # Proxy settings (same as above)
        proxy_pass http://mcp-webhook;
        # ... (rest of headers)
    }
}
```

## Caddy Configuration

**Caddyfile:**

```caddy
mcp.example.com {
    reverse_proxy localhost:3000 {
        # Headers are automatically set by Caddy
        # Including X-Forwarded-For, X-Forwarded-Proto, etc.
        
        # SSE support
        flush_interval -1
    }
}
```

**Caddy with path prefix:**

```caddy
example.com {
    handle_path /mcp-webhook/* {
        reverse_proxy localhost:3000 {
            flush_interval -1
        }
    }
}
```

## SSL/TLS Best Practices

### 1. Use Let's Encrypt

**Traefik (automatic):**
```yaml
labels:
  - "traefik.http.routers.mcp.tls.certresolver=letsencrypt"
```

**Nginx with Certbot:**
```bash
sudo certbot --nginx -d mcp.example.com
```

**Caddy (automatic):**
```caddy
mcp.example.com {
    # Caddy automatically gets SSL certificates
    reverse_proxy localhost:3000
}
```

### 2. Force HTTPS

**Traefik:**
```yaml
labels:
  - "traefik.http.routers.mcp-http.entrypoints=web"
  - "traefik.http.routers.mcp-http.rule=Host(`mcp.example.com`)"
  - "traefik.http.middlewares.mcp-redirect.redirectscheme.scheme=https"
  - "traefik.http.routers.mcp-http.middlewares=mcp-redirect"
```

**Nginx:**
```nginx
server {
    listen 80;
    server_name mcp.example.com;
    return 301 https://$server_name$request_uri;
}
```

**Caddy (automatic):**
Caddy automatically redirects HTTP to HTTPS.

### 3. Security Headers

**Traefik:**
```yaml
labels:
  - "traefik.http.middlewares.mcp-security.headers.stsSeconds=31536000"
  - "traefik.http.middlewares.mcp-security.headers.stsIncludeSubdomains=true"
  - "traefik.http.middlewares.mcp-security.headers.contentTypeNosniff=true"
  - "traefik.http.middlewares.mcp-security.headers.browserXssFilter=true"
  - "traefik.http.routers.mcp.middlewares=mcp-security"
```

**Nginx:**
```nginx
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "DENY" always;
add_header X-XSS-Protection "1; mode=block" always;
```

## Environment Variables

**For the MCP server behind a proxy:**

```bash
# Server config
PORT=3000
HOST=0.0.0.0

# Authentication
MCP_AUTH_ENABLED=true
MCP_API_KEYS=your-production-key

# CORS (set to your proxy domain)
CORS_ORIGIN=https://mcp.example.com

# Logging
LOG_LEVEL=INFO
LOG_REQUESTS=true
LOG_RESPONSES=true
LOG_BODIES=false

# SSL for outbound webhook calls (if needed)
# NODE_EXTRA_CA_CERTS=/path/to/custom-ca.pem
```

## Testing the Setup

### 1. Test SSL Certificate

```bash
# Check certificate
curl -vI https://mcp.example.com/health

# Should see:
# * SSL certificate verify ok
# < HTTP/2 200
```

### 2. Test MCP Endpoint

```bash
curl -X POST https://mcp.example.com/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Authorization: Bearer your-api-key" \
  -d '{"jsonrpc":"2.0","method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}},"id":1}'
```

### 3. Test Headers

```bash
# Check that X-Forwarded headers are being set
curl -I https://mcp.example.com/health

# Should see X-Request-ID in response headers
```

## Troubleshooting

### Issue: 502 Bad Gateway

**Cause:** Backend server not running or not accessible

**Solution:**
```bash
# Check if MCP server is running
curl http://localhost:3000/health

# Check Docker logs
docker logs mcp-webhook

# Check network connectivity
docker network inspect bridge
```

### Issue: SSL Certificate Verification Failed

**Cause 1:** Proxy not forwarding protocol correctly

**Solution:** Ensure X-Forwarded-Proto header is set:
```yaml
# Traefik
- "traefik.http.middlewares.mcp-headers.headers.customrequestheaders.X-Forwarded-Proto=https"
```

**Cause 2:** Outbound webhooks failing SSL validation

**Solution:** Add CA certificates or disable (dev only):
```bash
NODE_EXTRA_CA_CERTS=/etc/ssl/certs/ca-certificates.crt
```

### Issue: SSE Connection Drops

**Cause:** Proxy buffering SSE responses

**Solution:**

**Traefik:** Should work by default

**Nginx:** Add these directives:
```nginx
proxy_buffering off;
proxy_cache off;
chunked_transfer_encoding off;
```

**Caddy:** Add flush interval:
```caddy
flush_interval -1
```

### Issue: CORS Errors

**Cause:** Origin mismatch

**Solution:** Set CORS_ORIGIN environment variable:
```bash
CORS_ORIGIN=https://mcp.example.com npm run start:mcp-http
```

### Issue: Authentication Fails Through Proxy

**Cause:** Authorization header not being forwarded

**Solution:** Ensure proxy forwards all headers:

**Traefik:** Should forward by default

**Nginx:**
```nginx
proxy_pass_request_headers on;
```

## Production Checklist

- [ ] SSL certificate configured and auto-renewing
- [ ] HTTPS redirect enabled
- [ ] `trust proxy` enabled in app (✅ enabled by default)
- [ ] CORS_ORIGIN set to your domain
- [ ] MCP_AUTH_ENABLED=true
- [ ] Strong API keys configured
- [ ] Rate limiting enabled
- [ ] Security headers configured
- [ ] Logging enabled (LOG_LEVEL=INFO)
- [ ] Health check endpoint accessible
- [ ] Firewall rules configured
- [ ] Monitoring/alerting set up
- [ ] Backup/disaster recovery plan

## Complete Production Example

**docker-compose.yml:**

```yaml
version: '3.8'

services:
  traefik:
    image: traefik:v2.10
    command:
      - "--providers.docker=true"
      - "--providers.docker.exposedbydefault=false"
      - "--entrypoints.websecure.address=:443"
      - "--certificatesresolvers.letsencrypt.acme.tlschallenge=true"
      - "--certificatesresolvers.letsencrypt.acme.email=admin@example.com"
      - "--certificatesresolvers.letsencrypt.acme.storage=/letsencrypt/acme.json"
    ports:
      - "443:443"
    volumes:
      - "/var/run/docker.sock:/var/run/docker.sock:ro"
      - "./letsencrypt:/letsencrypt"
    restart: unless-stopped

  mcp-webhook:
    image: ghcr.io/pumphouse-p/mcp-webhook:latest-mcp-http
    environment:
      - PORT=3000
      - HOST=0.0.0.0
      - MCP_AUTH_ENABLED=true
      - MCP_API_KEYS=${MCP_API_KEYS}
      - CORS_ORIGIN=https://mcp.example.com
      - LOG_LEVEL=INFO
      - LOG_REQUESTS=true
      - LOG_RESPONSES=true
      - LOG_BODIES=false
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.mcp.rule=Host(`mcp.example.com`)"
      - "traefik.http.routers.mcp.entrypoints=websecure"
      - "traefik.http.routers.mcp.tls.certresolver=letsencrypt"
      - "traefik.http.services.mcp.loadbalancer.server.port=3000"
      # Security headers
      - "traefik.http.middlewares.mcp-security.headers.stsSeconds=31536000"
      - "traefik.http.middlewares.mcp-security.headers.contentTypeNosniff=true"
      - "traefik.http.routers.mcp.middlewares=mcp-security"
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

**.env:**
```bash
MCP_API_KEYS=generate-a-strong-random-key-here
```

**Start:**
```bash
docker-compose up -d
```

**Monitor:**
```bash
docker-compose logs -f mcp-webhook
```
