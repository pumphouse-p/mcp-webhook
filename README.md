# MCP Webhook Server

A Model Context Protocol (MCP) server that provides tools for calling external webhooks.

[![Build and Publish Container](https://github.com/username/mcp-webhook/actions/workflows/container.yml/badge.svg)](https://github.com/username/mcp-webhook/actions/workflows/container.yml)
[![Test](https://github.com/username/mcp-webhook/actions/workflows/test.yml/badge.svg)](https://github.com/username/mcp-webhook/actions/workflows/test.yml)

**Quick Links:**
- [Quick Start Guide](QUICKSTART.md) - Get up and running in minutes
- [Container Documentation](CONTAINER.md) - Detailed container deployment guide

## Features

- **webhook_post**: Send POST requests with JSON payloads
- **webhook_get**: Send GET requests with query parameters
- **webhook_put**: Send PUT requests with JSON payloads
- **webhook_delete**: Send DELETE requests

All tools support:
- Custom headers
- Webhook endpoint authentication (Basic Auth or API Key)
- Optional MCP server authentication

## Authentication

### Server Authentication (MCP Server Level)

The MCP server itself can require authentication before processing any requests. This is configured via environment variables.

#### Configuration

Create a `.env` file or set these environment variables:

```bash
# Enable server authentication
MCP_AUTH_ENABLED=true

# Choose authentication type: "api_key" or "basic"
MCP_AUTH_TYPE=api_key

# For API key authentication (supports multiple keys, comma-separated)
MCP_API_KEYS=secret-key-1,secret-key-2

# For basic authentication
MCP_USERNAME=admin
MCP_PASSWORD=secure-password
```

#### Using Server Authentication

When server authentication is enabled, all tool calls must include `server_auth`:

**API Key authentication:**
```json
{
  "url": "https://example.com/webhook",
  "server_auth": {
    "api_key": "secret-key-1"
  }
}
```

**Basic authentication:**
```json
{
  "url": "https://example.com/webhook",
  "server_auth": {
    "username": "admin",
    "password": "secure-password"
  }
}
```

### Webhook Endpoint Authentication

Authenticate to the webhook endpoints you're calling:

#### Basic Auth
Provide `basic_auth` with `username` and `password`. The server will encode credentials and add the `Authorization: Basic` header automatically.

#### API Key
Provide `api_key` with:
- `key`: Your API key value
- `location`: Either `"header"` or `"query"`
- `name`: (optional) Custom header name or query parameter name
  - Defaults to `X-API-Key` for headers
  - Defaults to `api_key` for query parameters

## Installation

```bash
npm install
```

## Usage

### Configure in Claude Desktop

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

**Without server authentication:**
```json
{
  "mcpServers": {
    "webhook": {
      "command": "node",
      "args": ["/home/devin/Projects/src/mcp-webhook/index.js"]
    }
  }
}
```

**With server authentication enabled:**
```json
{
  "mcpServers": {
    "webhook": {
      "command": "node",
      "args": ["/home/devin/Projects/src/mcp-webhook/index.js"],
      "env": {
        "MCP_AUTH_ENABLED": "true",
        "MCP_AUTH_TYPE": "api_key",
        "MCP_API_KEYS": "your-secret-key-1,your-secret-key-2"
      }
    }
  }
}
```

**With basic authentication:**
```json
{
  "mcpServers": {
    "webhook": {
      "command": "node",
      "args": ["/home/devin/Projects/src/mcp-webhook/index.js"],
      "env": {
        "MCP_AUTH_ENABLED": "true",
        "MCP_AUTH_TYPE": "basic",
        "MCP_USERNAME": "admin",
        "MCP_PASSWORD": "your-secure-password"
      }
    }
  }
}
```

### Example Tool Calls

**POST request with custom headers:**
```json
{
  "url": "https://webhook.site/your-endpoint",
  "payload": {
    "message": "Hello from MCP!",
    "timestamp": "2024-01-01T00:00:00Z"
  },
  "headers": {
    "X-Custom-Header": "value"
  }
}
```

**GET request with query parameters:**
```json
{
  "url": "https://api.example.com/data",
  "params": {
    "id": "123",
    "format": "json"
  }
}
```

**POST request with webhook Basic Auth:**
```json
{
  "url": "https://api.example.com/protected",
  "payload": {
    "data": "secure content"
  },
  "basic_auth": {
    "username": "user",
    "password": "pass"
  }
}
```

**GET request with webhook API Key in header:**
```json
{
  "url": "https://api.example.com/endpoint",
  "api_key": {
    "key": "your-api-key-here",
    "location": "header",
    "name": "X-API-Key"
  }
}
```

**GET request with webhook API Key in query parameter:**
```json
{
  "url": "https://api.example.com/endpoint",
  "api_key": {
    "key": "your-api-key-here",
    "location": "query",
    "name": "apikey"
  }
}
```

**Complete example with both server and webhook authentication:**
```json
{
  "url": "https://api.example.com/webhook",
  "payload": {
    "event": "user.created",
    "data": {
      "user_id": "12345"
    }
  },
  "server_auth": {
    "api_key": "mcp-server-key"
  },
  "api_key": {
    "key": "webhook-api-key",
    "location": "header",
    "name": "Authorization"
  }
}
```

## Security Considerations

- **Server Authentication**: When enabled, the server requires authentication for all tool calls. This adds a security layer when the MCP server is accessed by multiple clients or in shared environments.
- **Credentials Storage**: Never commit `.env` files or configuration files containing sensitive credentials to version control. Use `.gitignore` to exclude them.
- **API Keys**: Use strong, randomly generated API keys. Consider rotating them periodically.
- **Environment Variables**: When deploying, prefer environment variables over `.env` files for production credentials.

## Container Usage

The MCP Webhook server can be containerized using Podman (or Docker). Container support includes:
- Minimal Alpine-based image (~150MB)
- Non-root user execution
- Security hardening (read-only filesystem, dropped capabilities)
- Environment-based configuration

### Quick Start with Makefile

```bash
# Build the container
make build

# Test the container
make test

# Run the container
make run

# Publish to a registry
make publish REGISTRY=quay.io/myuser

# View all available commands
make help
```

### Building the Container

Build with the provided script:

```bash
./scripts/build.sh
```

Or with custom image name and registry:

```bash
IMAGE_NAME=mcp-webhook REGISTRY=quay.io/myuser ./scripts/build.sh
```

Build manually with Podman:

```bash
podman build -f Containerfile -t localhost/mcp-webhook:latest .
```

### Running the Container

Run the containerized server:

```bash
./scripts/run.sh
```

With authentication enabled:

```bash
MCP_AUTH_ENABLED=true \
MCP_AUTH_TYPE=api_key \
MCP_API_KEYS=my-secret-key \
./scripts/run.sh
```

### Publishing the Container

Publish to a container registry:

```bash
REGISTRY=quay.io/myuser ./scripts/publish.sh
```

Push with latest tag:

```bash
REGISTRY=docker.io/myuser PUSH_LATEST=true ./scripts/publish.sh
```

Supported registries:
- **Docker Hub**: `docker.io/username`
- **Quay.io**: `quay.io/username`
- **GitHub Container Registry**: `ghcr.io/username`
- **Local registry**: `localhost:5000`

### Automated Container Builds

The project includes GitHub Actions workflows for automated builds:

- **Container Build & Publish** (`.github/workflows/container.yml`):
  - Builds on push to main branch
  - Publishes to GitHub Container Registry
  - Creates version tags from git tags
  - Runs on pull requests (build only)

- **Tests** (`.github/workflows/test.yml`):
  - Tests Node.js application startup
  - Tests authentication modes
  - Validates container builds

To enable automatic publishing to GHCR, the workflows use `GITHUB_TOKEN` automatically.

For detailed container documentation, see [CONTAINER.md](CONTAINER.md).

### Using Podman Compose

Start with Podman Compose:

```bash
podman-compose up -d
```

Or with environment variables:

```bash
MCP_AUTH_ENABLED=true MCP_API_KEYS=secret podman-compose up -d
```

### Claude Desktop Configuration with Container

Use the containerized version in Claude Desktop:

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

## Development

Run the server directly with Node.js:

```bash
npm start
```

Run with authentication enabled:

```bash
MCP_AUTH_ENABLED=true MCP_AUTH_TYPE=api_key MCP_API_KEYS=test-key npm start
```

The server communicates over stdio and is designed to be used with MCP-compatible clients like Claude Desktop.
