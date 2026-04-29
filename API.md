# REST API Documentation

The MCP Webhook Server exposes REST API endpoints for calling external webhooks via HTTP.

## Base URL

```
http://localhost:3000
```

## Authentication

When `MCP_AUTH_ENABLED=true`, all requests require authentication.

### API Key Authentication

Include the API key in the `Authorization` header:

```http
Authorization: Bearer your-api-key-here
```

### Basic Authentication

Include Basic auth credentials:

```http
Authorization: Basic base64(username:password)
```

## Endpoints

### Health Check

Check server health and status.

**Endpoint:** `GET /health`

**Response:**
```json
{
  "status": "healthy",
  "mode": "http"
}
```

### Server Info

Get server information and available endpoints.

**Endpoint:** `GET /`

**Response:**
```json
{
  "name": "MCP Webhook Server",
  "version": "1.0.0",
  "endpoints": {
    "rest": {
      "post": "/api/webhook/post",
      "get": "/api/webhook/get",
      "put": "/api/webhook/put",
      "delete": "/api/webhook/delete"
    },
    "health": "/health"
  },
  "authentication": "disabled"
}
```

## REST API Endpoints

All REST endpoints accept JSON payloads and return JSON responses.

### POST Webhook

Send a POST request to an external webhook.

**Endpoint:** `POST /api/webhook/post`

**Request Body:**
```json
{
  "url": "https://example.com/webhook",
  "payload": {
    "key": "value",
    "data": "content"
  },
  "headers": {
    "X-Custom-Header": "value"
  },
  "basic_auth": {
    "username": "user",
    "password": "pass"
  },
  "api_key": {
    "key": "api-key-value",
    "location": "header",
    "name": "X-API-Key"
  }
}
```

**Parameters:**
- `url` (required): Target webhook URL
- `payload` (optional): JSON payload to send
- `headers` (optional): Custom HTTP headers
- `basic_auth` (optional): Basic authentication credentials
  - `username`: Username
  - `password`: Password
- `api_key` (optional): API key authentication
  - `key`: API key value
  - `location`: "header" or "query"
  - `name`: Header/parameter name (default: "X-API-Key" or "api_key")

**Response:**
```json
{
  "status": 200,
  "statusText": "OK",
  "headers": {
    "content-type": "application/json",
    "date": "..."
  },
  "body": {
    "response": "data"
  }
}
```

### GET Webhook

Send a GET request to an external webhook.

**Endpoint:** `POST /api/webhook/get`

**Request Body:**
```json
{
  "url": "https://api.example.com/data",
  "params": {
    "page": "1",
    "limit": "10"
  },
  "headers": {
    "Accept": "application/json"
  },
  "api_key": {
    "key": "api-key-value",
    "location": "query",
    "name": "token"
  }
}
```

**Parameters:**
- `url` (required): Target URL
- `params` (optional): Query parameters
- `headers` (optional): Custom HTTP headers
- `basic_auth` (optional): Basic authentication credentials
- `api_key` (optional): API key authentication

**Response:**
Same format as POST webhook

### PUT Webhook

Send a PUT request to an external webhook.

**Endpoint:** `POST /api/webhook/put`

**Request Body:**
```json
{
  "url": "https://api.example.com/resource/123",
  "payload": {
    "name": "Updated Name",
    "status": "active"
  }
}
```

**Parameters:**
Same as POST webhook

**Response:**
Same format as POST webhook

### DELETE Webhook

Send a DELETE request to an external webhook.

**Endpoint:** `POST /api/webhook/delete`

**Request Body:**
```json
{
  "url": "https://api.example.com/resource/123",
  "headers": {
    "X-Delete-Reason": "No longer needed"
  }
}
```

**Parameters:**
- `url` (required): Target URL
- `headers` (optional): Custom HTTP headers
- `basic_auth` (optional): Basic authentication credentials
- `api_key` (optional): API key authentication

**Response:**
Same format as POST webhook

## Error Responses

### 401 Unauthorized

Authentication failed or missing.

```json
{
  "error": "Invalid or missing API key"
}
```

### 404 Not Found

Endpoint does not exist.

```json
{
  "error": "Not found"
}
```

### 500 Internal Server Error

Server error or webhook request failed.

```json
{
  "error": "Failed to fetch: network error"
}
```

## Example Usage

### Using curl

**Simple POST request:**
```bash
curl -X POST http://localhost:3000/api/webhook/post \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://webhook.site/your-id",
    "payload": {"message": "Hello World"}
  }'
```

**With authentication:**
```bash
curl -X POST http://localhost:3000/api/webhook/post \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-key" \
  -d '{
    "url": "https://webhook.site/your-id",
    "payload": {"message": "Hello World"}
  }'
```

**GET request with query params:**
```bash
curl -X POST http://localhost:3000/api/webhook/get \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://api.example.com/users",
    "params": {"page": "1", "limit": "10"}
  }'
```

### Using JavaScript/fetch

```javascript
const response = await fetch('http://localhost:3000/api/webhook/post', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your-api-key'
  },
  body: JSON.stringify({
    url: 'https://webhook.site/your-id',
    payload: {
      event: 'user.created',
      user_id: '12345'
    }
  })
});

const result = await response.json();
console.log(result);
```

### Using Python

```python
import requests

response = requests.post(
    'http://localhost:3000/api/webhook/post',
    headers={
        'Content-Type': 'application/json',
        'Authorization': 'Bearer your-api-key'
    },
    json={
        'url': 'https://webhook.site/your-id',
        'payload': {
            'event': 'user.created',
            'user_id': '12345'
        }
    }
)

print(response.json())
```

## Rate Limiting

When deployed behind Nginx (see `deploy/nginx/mcp-webhook.conf`), API endpoints are rate-limited to:
- 10 requests per second per IP
- Burst of 20 requests

## CORS

The server includes CORS headers:
- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS`
- `Access-Control-Allow-Headers: Content-Type, Authorization`

For production, configure CORS appropriately for your domain.

## Health Monitoring

The `/health` endpoint returns:
- HTTP 200 when healthy
- JSON response with status

Use this for:
- Load balancer health checks
- Kubernetes liveness/readiness probes
- Monitoring systems

## Security Considerations

1. **Always use HTTPS in production** - Configure SSL/TLS via reverse proxy
2. **Enable authentication** - Set `MCP_AUTH_ENABLED=true`
3. **Use strong API keys** - Generate cryptographically secure keys
4. **Rate limiting** - Deploy behind Nginx or similar for rate limiting
5. **Network isolation** - Restrict access using firewall rules
6. **Monitor logs** - Track unusual patterns or failed auth attempts
