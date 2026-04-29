# Deployment Guide

This guide covers deploying the MCP Webhook Server as a web service using various methods.

## Deployment Modes

The MCP Webhook Server supports two deployment modes:

1. **stdio mode** (default) - For use with MCP clients like Claude Desktop
2. **HTTP mode** - Web service with REST API and MCP-over-HTTP support

## Quick Start - HTTP Mode

### Local Development

```bash
# Run with Node.js
npm run start:http

# Or with container
./scripts/build-http.sh
./scripts/run-http.sh
```

Access at: http://localhost:3000

### Docker/Podman Compose

```bash
# Start the service
podman-compose -f compose.http.yaml up -d

# View logs
podman-compose -f compose.http.yaml logs -f

# Stop the service
podman-compose -f compose.http.yaml down
```

## Kubernetes Deployment

### Prerequisites

- Kubernetes cluster (1.25+)
- kubectl configured
- Container registry access

### Deploy

```bash
# Build and push image
podman build -f Containerfile.http -t your-registry/mcp-webhook:http .
podman push your-registry/mcp-webhook:http

# Update deployment with your image
sed -i 's|localhost/mcp-webhook:http|your-registry/mcp-webhook:http|' deploy/kubernetes/deployment.yaml

# Deploy to Kubernetes
kubectl apply -f deploy/kubernetes/deployment.yaml

# Check status
kubectl get pods -l app=mcp-webhook
kubectl get svc mcp-webhook
```

### Update Secrets

```bash
# Update API keys
kubectl create secret generic mcp-webhook-secrets \
  --from-literal=api-keys=your-secret-key-1,your-secret-key-2 \
  --from-literal=username=admin \
  --from-literal=password=secure-password \
  --dry-run=client -o yaml | kubectl apply -f -

# Enable authentication
kubectl patch configmap mcp-webhook-config \
  --type merge \
  -p '{"data":{"auth-enabled":"true","auth-type":"api_key"}}'

# Restart pods to pick up changes
kubectl rollout restart deployment mcp-webhook
```

### Expose with Ingress

```bash
# Update ingress host
sed -i 's|mcp-webhook.example.com|your-domain.com|' deploy/kubernetes/ingress.yaml

# Apply ingress
kubectl apply -f deploy/kubernetes/ingress.yaml

# Check ingress
kubectl get ingress mcp-webhook
```

### Auto-scaling

```bash
# Apply HPA (Horizontal Pod Autoscaler)
kubectl apply -f deploy/kubernetes/hpa.yaml

# Check scaling status
kubectl get hpa mcp-webhook
```

## Systemd Deployment

### Native (Node.js)

```bash
# Create user
sudo useradd -r -s /bin/false mcp

# Copy files
sudo mkdir -p /opt/mcp-webhook
sudo cp -r * /opt/mcp-webhook/
sudo chown -R mcp:mcp /opt/mcp-webhook

# Install dependencies
cd /opt/mcp-webhook
sudo -u mcp npm ci --only=production

# Create config
sudo mkdir -p /etc/mcp-webhook
sudo tee /etc/mcp-webhook/config.env <<EOF
PORT=3000
HOST=0.0.0.0
MCP_AUTH_ENABLED=true
MCP_AUTH_TYPE=api_key
MCP_API_KEYS=your-secret-key-here
EOF
sudo chmod 600 /etc/mcp-webhook/config.env

# Install service
sudo cp deploy/systemd/mcp-webhook.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable mcp-webhook
sudo systemctl start mcp-webhook

# Check status
sudo systemctl status mcp-webhook
sudo journalctl -u mcp-webhook -f
```

### Containerized (Podman)

```bash
# Create config
sudo mkdir -p /etc/mcp-webhook
sudo tee /etc/mcp-webhook/container.env <<EOF
MCP_AUTH_ENABLED=true
MCP_AUTH_TYPE=api_key
MCP_API_KEYS=your-secret-key-here
EOF
sudo chmod 600 /etc/mcp-webhook/container.env

# Build image
sudo podman build -f Containerfile.http -t localhost/mcp-webhook:http .

# Install service
sudo cp deploy/systemd/mcp-webhook-container.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable mcp-webhook-container
sudo systemctl start mcp-webhook-container

# Check status
sudo systemctl status mcp-webhook-container
sudo journalctl -u mcp-webhook-container -f
```

## Nginx Reverse Proxy

### Installation

```bash
# Install Nginx
sudo dnf install nginx  # Fedora/RHEL
# or
sudo apt install nginx  # Ubuntu/Debian

# Copy configuration
sudo cp deploy/nginx/mcp-webhook.conf /etc/nginx/conf.d/

# Update domain and SSL paths
sudo nano /etc/nginx/conf.d/mcp-webhook.conf

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### SSL/TLS with Let's Encrypt

```bash
# Install certbot
sudo dnf install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d mcp-webhook.example.com

# Auto-renewal is handled by certbot timer
sudo systemctl status certbot-renew.timer
```

## Cloud Deployments

### AWS ECS/Fargate

```bash
# Push to ECR
aws ecr get-login-password --region us-east-1 | \
  podman login --username AWS --password-stdin 123456789.dkr.ecr.us-east-1.amazonaws.com

podman tag localhost/mcp-webhook:http \
  123456789.dkr.ecr.us-east-1.amazonaws.com/mcp-webhook:http

podman push 123456789.dkr.ecr.us-east-1.amazonaws.com/mcp-webhook:http

# Create task definition and service (use AWS Console or CLI)
```

### Google Cloud Run

```bash
# Build and push to GCR
gcloud builds submit --tag gcr.io/PROJECT-ID/mcp-webhook

# Deploy
gcloud run deploy mcp-webhook \
  --image gcr.io/PROJECT-ID/mcp-webhook \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars MCP_AUTH_ENABLED=true,MCP_AUTH_TYPE=api_key \
  --set-env-vars MCP_API_KEYS=secret-key
```

### Azure Container Instances

```bash
# Push to ACR
az acr build --registry myregistry \
  --image mcp-webhook:http \
  --file Containerfile.http .

# Deploy
az container create \
  --resource-group myResourceGroup \
  --name mcp-webhook \
  --image myregistry.azurecr.io/mcp-webhook:http \
  --dns-name-label mcp-webhook \
  --ports 3000 \
  --environment-variables \
    PORT=3000 \
    MCP_AUTH_ENABLED=true \
    MCP_AUTH_TYPE=api_key \
  --secure-environment-variables \
    MCP_API_KEYS=secret-key
```

## Monitoring

### Prometheus Metrics

Add a metrics endpoint (future enhancement):

```javascript
// In server.js
if (req.url === '/metrics') {
  // Return Prometheus metrics
}
```

### Health Checks

```bash
# Kubernetes liveness probe
curl http://service:3000/health

# Returns: {"status":"healthy","mode":"http"}
```

### Logging

Logs are written to stderr and can be collected by:
- systemd journal: `journalctl -u mcp-webhook -f`
- Kubernetes: `kubectl logs -f deployment/mcp-webhook`
- Docker/Podman: `podman logs -f mcp-webhook-http`

## Performance Tuning

### Horizontal Scaling

**Kubernetes:**
```bash
# Manual scaling
kubectl scale deployment mcp-webhook --replicas=5

# Auto-scaling (HPA already configured)
kubectl get hpa mcp-webhook
```

**Systemd (multiple instances):**
```bash
# Create multiple services
for i in {1..3}; do
  sudo cp /etc/systemd/system/mcp-webhook.service \
    /etc/systemd/system/mcp-webhook@$i.service
  
  # Update port in each service file
  sudo sed -i "s/PORT=3000/PORT=300$i/" \
    /etc/systemd/system/mcp-webhook@$i.service
done

# Start all instances
sudo systemctl daemon-reload
for i in {1..3}; do
  sudo systemctl enable --now mcp-webhook@$i
done
```

### Load Balancing

Configure Nginx upstream (already in deploy/nginx/mcp-webhook.conf):

```nginx
upstream mcp_webhook {
    least_conn;
    server 127.0.0.1:3000;
    server 127.0.0.1:3001;
    server 127.0.0.1:3002;
}
```

## Security Hardening

### Enable Authentication

```bash
# Generate secure API key
openssl rand -base64 32

# Set environment variable
export MCP_AUTH_ENABLED=true
export MCP_AUTH_TYPE=api_key
export MCP_API_KEYS=generated-key-here
```

### Firewall Rules

```bash
# Allow only specific IPs
sudo firewall-cmd --permanent --add-rich-rule='
  rule family="ipv4"
  source address="10.0.0.0/8"
  port protocol="tcp" port="3000" accept'

sudo firewall-cmd --reload
```

### Network Policies (Kubernetes)

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: mcp-webhook-policy
spec:
  podSelector:
    matchLabels:
      app: mcp-webhook
  policyTypes:
  - Ingress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: allowed-namespace
    ports:
    - protocol: TCP
      port: 3000
```

## Backup and Disaster Recovery

### Configuration Backup

```bash
# Backup secrets and configs
kubectl get secret mcp-webhook-secrets -o yaml > backup-secrets.yaml
kubectl get configmap mcp-webhook-config -o yaml > backup-config.yaml

# Or for systemd
sudo tar czf mcp-webhook-backup.tar.gz \
  /etc/mcp-webhook/ \
  /etc/systemd/system/mcp-webhook*.service
```

### Container Registry

Always tag and push multiple versions:

```bash
podman tag localhost/mcp-webhook:http registry.example.com/mcp-webhook:v1.0.0
podman tag localhost/mcp-webhook:http registry.example.com/mcp-webhook:latest
podman push registry.example.com/mcp-webhook:v1.0.0
podman push registry.example.com/mcp-webhook:latest
```

## Troubleshooting

### Check Service Status

```bash
# Systemd
sudo systemctl status mcp-webhook
sudo journalctl -u mcp-webhook -n 100

# Kubernetes
kubectl get pods -l app=mcp-webhook
kubectl logs -l app=mcp-webhook --tail=100

# Container
podman logs mcp-webhook-http
```

### Test Endpoints

```bash
# Health check
curl http://localhost:3000/health

# Info endpoint
curl http://localhost:3000/

# Test webhook POST
curl -X POST http://localhost:3000/api/webhook/post \
  -H "Content-Type: application/json" \
  -d '{"url":"https://webhook.site/test","payload":{"test":true}}'
```

### Common Issues

**Port already in use:**
```bash
# Find process
sudo lsof -i :3000
# or
sudo ss -tlnp | grep 3000

# Kill and restart
sudo systemctl restart mcp-webhook
```

**Authentication failures:**
```bash
# Verify environment variables
env | grep MCP_

# Check logs for auth errors
sudo journalctl -u mcp-webhook | grep -i auth
```

See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for more details.
