# MCP-over-HTTP Implementation

This implementation follows the pattern from [ansible/aap-mcp-server](https://github.com/ansible/aap-mcp-server) to provide a **stateless** MCP server over HTTP with Bearer token authentication.

## Architecture

### Key Design Decisions

1. **Stateless Operation**: Unlike traditional SSE implementations with persistent sessions, this server creates a fresh MCP instance for each request, following the aap-mcp-server pattern
2. **Bearer Token Authentication**: Uses API key-based authentication via Bearer tokens
3. **POST-only Endpoint**: Single `/mcp` endpoint that handles all MCP JSON-RPC requests
4. **Container-First**: Designed for deployment via Podman/Docker

## Files

- **`mcp-http.js`** - Main MCP-over-HTTP server implementation
- **`Containerfile.mcp-http`** - Container definition for MCP HTTP server
- **`scripts/test-mcp-http.js`** - Test client for MCP-over-HTTP
- **Updated `Makefile`** - Build and run targets for MCP HTTP mode

## Usage

### Running Locally

**Without authentication:**
```bash
npm run start:mcp-http
```

**With authentication:**
```bash
MCP_AUTH_ENABLED=true MCP_API_KEYS=my-secret-key npm run start:mcp-http
```

### Running with Podman

**Build the container:**
```bash
make build-mcp-http
```

**Run without authentication:**
```bash
make run-mcp-http
```

**Run with authentication:**
```bash
make run-mcp-http MCP_AUTH_ENABLED=true MCP_API_KEYS=my-secret-key
```

### Testing

**Test without authentication:**
```bash
make test-mcp-http
```

**Test with authentication:**
```bash
make test-mcp-http API_KEY=my-secret-key
```

Or manually:
```bash
# Start server
MCP_AUTH_ENABLED=true MCP_API_KEYS=test-key npm run start:mcp-http

# In another terminal, run tests
API_KEY=test-key node scripts/test-mcp-http.js
```

## Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `PORT` | Server port | `3000` | No |
| `HOST` | Bind address | `0.0.0.0` | No |
| `MCP_AUTH_ENABLED` | Enable API key authentication | `false` | No |
| `MCP_API_KEYS` | Comma-separated list of valid API keys | - | If auth enabled |

### Example .env File

```bash
PORT=3000
HOST=0.0.0.0
MCP_AUTH_ENABLED=true
MCP_API_KEYS=key1,key2,key3
```

## API Reference

### Endpoint

**POST `/mcp`**

Handles all MCP JSON-RPC requests in stateless mode.

**Headers:**
- `Content-Type: application/json` (required)
- `Accept: application/json, text/event-stream` (required)
- `Authorization: Bearer <api-key>` (required if auth enabled)

**Request Body:**
Standard JSON-RPC 2.0 format:
```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "webhook_post",
    "arguments": {
      "url": "https://example.com/webhook",
      "payload": {"data": "value"}
    }
  },
  "id": 1
}
```

**Response:**
Server-Sent Events (SSE) format:
```
event: message
data: {"result": {...}, "jsonrpc": "2.0", "id": 1}
```

### Available Tools

All tools support:
- Custom headers
- Basic authentication (username/password)
- API key authentication (header or query parameter)

#### webhook_post
Send POST requests to external webhooks.

**Parameters:**
- `url` (string, required): Target webhook URL
- `payload` (object, optional): JSON payload
- `headers` (object, optional): Custom headers
- `basic_auth` (object, optional): `{username, password}`
- `api_key` (object, optional): `{key, location, name?}`

#### webhook_get
Send GET requests to external webhooks.

**Parameters:**
- `url` (string, required): Target webhook URL
- `params` (object, optional): Query parameters
- `headers` (object, optional): Custom headers
- `basic_auth` (object, optional): `{username, password}`
- `api_key` (object, optional): `{key, location, name?}`

#### webhook_put
Send PUT requests to external webhooks.

**Parameters:**
- `url` (string, required): Target webhook URL
- `payload` (object, optional): JSON payload
- `headers` (object, optional): Custom headers
- `basic_auth` (object, optional): `{username, password}`
- `api_key` (object, optional): `{key, location, name?}`

#### webhook_delete
Send DELETE requests to external webhooks.

**Parameters:**
- `url` (string, required): Target webhook URL
- `headers` (object, optional): Custom headers
- `basic_auth` (object, optional): `{username, password}`
- `api_key` (object, optional): `{key, location, name?}`

## Example Usage

### Initialize Connection

```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Authorization: Bearer my-api-key" \
  -d '{
    "jsonrpc": "2.0",
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": {"name": "my-client", "version": "1.0.0"}
    },
    "id": 1
  }'
```

### List Tools

```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Authorization: Bearer my-api-key" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/list",
    "id": 2
  }'
```

### Call webhook_post Tool

```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Authorization: Bearer my-api-key" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "webhook_post",
      "arguments": {
        "url": "https://httpbin.org/post",
        "payload": {"message": "Hello World"},
        "headers": {"X-Custom": "value"}
      }
    },
    "id": 3
  }'
```

## Comparison with Other Modes

| Feature | stdio (index.js) | HTTP REST (server.js) | MCP-over-HTTP (mcp-http.js) |
|---------|------------------|----------------------|----------------------------|
| Protocol | MCP via stdio | Plain HTTP REST | MCP over HTTP |
| Use Case | Claude Desktop | Simple HTTP clients | MCP clients over HTTP |
| Authentication | Optional | Optional (Bearer/Basic) | Optional (Bearer token) |
| Session State | Stateful | Stateless | Stateless |
| Transport | stdio | HTTP | HTTP + SSE |
| Best For | Desktop integration | cURL/Postman testing | Production MCP deployments |

## Security Considerations

1. **Always use HTTPS in production** - The Bearer tokens are sensitive
2. **Use strong API keys** - Generate cryptographically random keys
3. **Rotate keys regularly** - Implement key rotation policies
4. **Rate limiting** - Deploy behind a reverse proxy with rate limiting
5. **Network isolation** - Restrict access using firewall rules

## Troubleshooting

### Client receives SSE format instead of JSON

This is expected! The MCP-over-HTTP protocol uses Server-Sent Events format for responses. Parse the `data:` lines from the SSE response:

```javascript
const response = await fetch(url, options);
const text = await response.text();
const lines = text.split('\n');
for (const line of lines) {
  if (line.startsWith('data: ')) {
    const json = JSON.parse(line.substring(6));
    // Use the JSON response
  }
}
```

### Authentication fails

Ensure you're sending the API key in the Authorization header:
```
Authorization: Bearer your-api-key-here
```

### Container build fails

The current Containerfiles have an npm ci issue with rootless podman. Run locally with Node.js or fix the Containerfile to install dependencies before copying source files.

## References

- [ansible/aap-mcp-server](https://github.com/ansible/aap-mcp-server) - Reference implementation
- [Model Context Protocol Specification](https://spec.modelcontextprotocol.io/)
- [MCP SDK Documentation](https://github.com/modelcontextprotocol/typescript-sdk)
