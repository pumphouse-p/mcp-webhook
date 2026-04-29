# Quick Start Guide

Get started with the MCP Webhook Server in minutes.

## Installation Methods

### Option 1: Run Directly with Node.js

```bash
# Install dependencies
npm install

# Start the server
npm start
```

### Option 2: Run with Container (Recommended)

```bash
# Build the container
make build

# Run the container
make run
```

## Basic Usage

### Without Authentication

```bash
# Direct with Node.js
npm start

# With container
podman run --rm -i localhost/mcp-webhook:latest
```

### With API Key Authentication

```bash
# Direct with Node.js
MCP_AUTH_ENABLED=true \
MCP_AUTH_TYPE=api_key \
MCP_API_KEYS=my-secret-key \
npm start

# With container
podman run --rm -i \
  -e MCP_AUTH_ENABLED=true \
  -e MCP_AUTH_TYPE=api_key \
  -e MCP_API_KEYS=my-secret-key \
  localhost/mcp-webhook:latest
```

## Configure with Claude Desktop

### Using Node.js

Edit your Claude Desktop config file:
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Linux: `~/.config/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

Add this configuration:

```json
{
  "mcpServers": {
    "webhook": {
      "command": "node",
      "args": ["/path/to/mcp-webhook/index.js"],
      "env": {
        "MCP_AUTH_ENABLED": "true",
        "MCP_AUTH_TYPE": "api_key",
        "MCP_API_KEYS": "your-secret-key"
      }
    }
  }
}
```

### Using Container

```json
{
  "mcpServers": {
    "webhook": {
      "command": "podman",
      "args": [
        "run",
        "--rm",
        "-i",
        "localhost/mcp-webhook:latest"
      ],
      "env": {
        "MCP_AUTH_ENABLED": "true",
        "MCP_AUTH_TYPE": "api_key",
        "MCP_API_KEYS": "your-secret-key"
      }
    }
  }
}
```

## Using the Tools

Once configured, you can use these tools in Claude:

### webhook_post

Send a POST request:

```json
{
  "url": "https://webhook.site/your-unique-id",
  "payload": {
    "message": "Hello from Claude!",
    "timestamp": "2024-01-01T00:00:00Z"
  }
}
```

### webhook_get

Send a GET request with query parameters:

```json
{
  "url": "https://api.example.com/users",
  "params": {
    "page": "1",
    "limit": "10"
  }
}
```

### webhook_put

Update a resource:

```json
{
  "url": "https://api.example.com/users/123",
  "payload": {
    "name": "Updated Name"
  }
}
```

### webhook_delete

Delete a resource:

```json
{
  "url": "https://api.example.com/users/123"
}
```

## Authentication Examples

### Webhook Endpoint with Basic Auth

```json
{
  "url": "https://api.example.com/secure",
  "payload": {"data": "secret"},
  "basic_auth": {
    "username": "api_user",
    "password": "api_password"
  }
}
```

### Webhook Endpoint with API Key in Header

```json
{
  "url": "https://api.example.com/data",
  "api_key": {
    "key": "sk-1234567890",
    "location": "header",
    "name": "Authorization"
  }
}
```

### Webhook Endpoint with API Key in Query

```json
{
  "url": "https://api.example.com/data",
  "api_key": {
    "key": "abc123xyz",
    "location": "query",
    "name": "token"
  }
}
```

## Testing

Test with a public webhook testing service:

1. Visit https://webhook.site and copy your unique URL
2. Use `webhook_post` to send a test request:

```json
{
  "url": "https://webhook.site/your-unique-id",
  "payload": {
    "test": "Hello World",
    "source": "MCP Webhook Server"
  }
}
```

3. Check webhook.site to see the received request

## Next Steps

- Read [README.md](README.md) for complete documentation
- See [CONTAINER.md](CONTAINER.md) for container deployment options
- Check [.env.example](.env.example) for all configuration options

## Common Issues

### Server won't start

Make sure you have Node.js 20+ installed:

```bash
node --version  # Should be v20 or higher
```

### Authentication errors

If using server authentication, ensure `server_auth` is included in tool calls:

```json
{
  "url": "https://example.com",
  "server_auth": {
    "api_key": "your-mcp-server-key"
  }
}
```

### Container issues

Ensure Podman is installed and running:

```bash
podman --version
podman info
```

## Support

For issues or questions:
- Check existing documentation
- Review example configurations
- Test with webhook.site for debugging
