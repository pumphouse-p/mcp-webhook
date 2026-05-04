# MCP Webhook Server - Architecture

## Overview

This project provides three deployment modes for invoking webhooks via the Model Context Protocol (MCP):

```
┌─────────────────────────────────────────────────────────────┐
│                    MCP Webhook Server                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ stdio Mode   │  │  HTTP REST   │  │ MCP-over-HTTP│     │
│  │ (index.js)   │  │ (server.js)  │  │ (mcp-http.js)│     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│        │                  │                   │             │
│        │                  │                   │             │
│     stdio            HTTP REST           MCP/HTTP          │
│     stdin/           endpoints          JSON-RPC           │
│     stdout            /api/*             /mcp              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
                  External Webhooks
              (httpbin.org, custom APIs)
```

## Deployment Modes

### 1. stdio Mode (index.js)

**Purpose:** Local integration with Claude Desktop and MCP clients

**Protocol:** MCP via stdio (stdin/stdout)

**Authentication:** Optional (API key or Basic auth in tool parameters)

**Use Cases:**
- Claude Desktop integration
- Local development
- CLI tools

**Container:** `localhost/mcp-webhook:latest`

**Start:**
```bash
npm start
# or
echo '{}' | podman run -i localhost/mcp-webhook:latest
```

### 2. HTTP REST Mode (server.js)

**Purpose:** Simple HTTP API for webhook invocation

**Protocol:** Plain HTTP/JSON

**Authentication:** Optional (Bearer token or Basic auth)

**Use Cases:**
- Quick testing with curl
- Simple HTTP clients
- Non-MCP integrations

**Container:** `localhost/mcp-webhook:http`

**Endpoints:**
- `POST /api/webhook/post`
- `POST /api/webhook/get`
- `POST /api/webhook/put`
- `POST /api/webhook/delete`
- `GET /health`

**Start:**
```bash
npm run start:http
# or
podman run -p 3000:3000 localhost/mcp-webhook:http
```

### 3. MCP-over-HTTP Mode (mcp-http.js) ⭐ Recommended

**Purpose:** Production-ready MCP server over HTTP

**Protocol:** MCP JSON-RPC over HTTP with SSE

**Authentication:** Bearer token (API key)

**Use Cases:**
- Production deployments
- MCP clients over network
- Containerized services
- Cloud deployments

**Container:** `localhost/mcp-webhook:mcp-http`

**Endpoints:**
- `POST /mcp` - MCP JSON-RPC endpoint
- `GET /health` - Health check
- `GET /` - Server info

**Start:**
```bash
npm run start:mcp-http
# or
podman run -p 3000:3000 -e MCP_AUTH_ENABLED=true -e MCP_API_KEYS=key localhost/mcp-webhook:mcp-http
```

## Component Architecture

### Common Components

All modes share these core functionalities:

```
┌─────────────────────────────────────┐
│       Webhook Handler                │
│  - URL building (path + query)       │
│  - Authentication injection          │
│    • Basic auth header               │
│    • API key (header or query)       │
│  - HTTP method execution             │
│  - Response parsing                  │
└─────────────────────────────────────┘
           │
           ▼
    External HTTP Call
      (fetch API)
           │
           ▼
     3rd Party Webhook
   (httpbin, Slack, etc.)
```

### MCP-over-HTTP Flow (Recommended)

```
┌──────────────┐        ┌──────────────┐        ┌──────────────┐
│  MCP Client  │        │  mcp-http.js │        │   Webhook    │
│              │        │   (Express)  │        │   Endpoint   │
└──────────────┘        └──────────────┘        └──────────────┘
       │                       │                        │
       │ POST /mcp             │                        │
       │ Authorization: Bearer │                        │
       │ {jsonrpc, method,     │                        │
       │  params}              │                        │
       │──────────────────────>│                        │
       │                       │                        │
       │                       │ 1. Validate API key    │
       │                       │ 2. Create MCP Server   │
       │                       │ 3. Create Transport    │
       │                       │                        │
       │                       │ 4. Handle Request:     │
       │                       │    - initialize        │
       │                       │    - tools/list        │
       │                       │    - tools/call        │
       │                       │                        │
       │                       │ If tools/call:         │
       │                       │────────────────────────>│
       │                       │    HTTP Request         │
       │                       │<────────────────────────│
       │                       │    HTTP Response        │
       │                       │                        │
       │  SSE Response         │ 5. Cleanup:            │
       │  event: message       │    - Close transport   │
       │  data: {result}       │    - Close server      │
       │<──────────────────────│                        │
       │                       │                        │
```

### Stateless Design

The MCP-over-HTTP mode follows a **stateless** pattern:

1. Each request creates a fresh MCP Server instance
2. No session state maintained between requests
3. Transport created and destroyed per request
4. Horizontally scalable

This differs from traditional MCP implementations that maintain persistent sessions.

## Authentication Layers

### Layer 1: MCP Server Authentication

Controls access to the MCP server itself:

```
Request → API Key Check → MCP Server → Tools
   ✗            ↓
  401      Valid? → Yes → Continue
              ↓
             No
              ↓
           Return 401
```

**Configuration:**
```bash
MCP_AUTH_ENABLED=true
MCP_API_KEYS=key1,key2,key3
```

### Layer 2: Webhook Endpoint Authentication

Controls access to external webhooks being called:

```
Tool Call → Extract auth params → Build request
              ↓
         basic_auth? → Add Basic header
         api_key?    → Add API key (header/query)
              ↓
         Call webhook
```

**Supported methods:**
- Basic Authentication (username/password)
- API Key (header or query parameter)
- Custom headers

## Container Layers

```
┌─────────────────────────────────────────┐
│  Application Layer                       │
│  - index.js / server.js / mcp-http.js   │
│  - Node.js 20                            │
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│  Dependencies Layer                      │
│  - @modelcontextprotocol/sdk             │
│  - express, cors, dotenv                 │
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│  Base Image                              │
│  - Alpine Linux                          │
│  - Non-root user (uid 1001)              │
└─────────────────────────────────────────┘
```

## CI/CD Pipeline

```
┌─────────────┐
│  Git Push   │
│  to main    │
└─────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  GitHub Actions                       │
│  ┌──────────────┐  ┌──────────────┐ │
│  │ Test Jobs    │  │ Build Jobs   │ │
│  │              │  │              │ │
│  │ - stdio      │  │ - stdio      │ │
│  │ - http       │  │ - http       │ │
│  │ - mcp-http   │  │ - mcp-http   │ │
│  │              │  │              │ │
│  │ Node.js +    │  │ Container    │ │
│  │ Container    │  │ builds       │ │
│  └──────────────┘  └──────────────┘ │
└──────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│  GitHub Container Registry (ghcr.io)│
│                                      │
│  - :latest                           │
│  - :latest-http                      │
│  - :latest-mcp-http                  │
│  - :<version>                        │
│  - :<version>-http                   │
│  - :<version>-mcp-http               │
└─────────────────────────────────────┘
```

## File Structure

```
mcp-webhook/
├── index.js              # stdio mode entry point
├── server.js             # HTTP REST mode entry point
├── mcp-http.js           # MCP-over-HTTP mode entry point ⭐
├── package.json          # Dependencies and scripts
├── Containerfile         # stdio container
├── Containerfile.http    # HTTP REST container
├── Containerfile.mcp-http # MCP-over-HTTP container ⭐
├── Makefile              # Build and run commands
├── scripts/
│   ├── test-mcp-http.js  # MCP-over-HTTP test client ⭐
│   ├── test-http.sh      # HTTP REST tests
│   └── test-container.sh # Container tests
├── .github/
│   └── workflows/
│       ├── container.yml # Build and publish
│       └── test.yml      # Test all modes
└── docs/
    ├── MCP-HTTP-README.md    # MCP-over-HTTP guide ⭐
    ├── QUICK-START.md         # Quick start guide ⭐
    └── .github/
        ├── WORKFLOWS.md       # CI/CD documentation ⭐
        └── ARCHITECTURE.md    # This file ⭐
```

⭐ = New files for MCP-over-HTTP implementation

## Technology Stack

| Component | Technology |
|-----------|-----------|
| Runtime | Node.js 20 |
| MCP SDK | @modelcontextprotocol/sdk 1.0.4+ |
| HTTP Server | Express 4.x |
| Container | Alpine Linux + Node 20 |
| CI/CD | GitHub Actions |
| Registry | GitHub Container Registry |
| Build Tool | Podman / Docker |

## Security Considerations

1. **Authentication:** Always enable in production
2. **HTTPS:** Deploy behind reverse proxy with SSL
3. **Rate Limiting:** Implement via reverse proxy
4. **API Keys:** Use strong, random keys (256-bit)
5. **Network:** Restrict access with firewall rules
6. **Logging:** Monitor for suspicious activity
7. **Updates:** Keep dependencies updated

## Performance Characteristics

| Metric | stdio | HTTP REST | MCP-over-HTTP |
|--------|-------|-----------|---------------|
| Latency | Low | Low | Low |
| Scalability | N/A | High | High |
| Concurrency | 1 | Unlimited | Unlimited |
| State | Stateful | Stateless | Stateless |
| Network | Local only | Network | Network |

## Recommended Deployment

For production deployments, use **MCP-over-HTTP mode** because:

1. ✅ Stateless design (horizontally scalable)
2. ✅ Bearer token authentication
3. ✅ Full MCP protocol support
4. ✅ Container-ready
5. ✅ Production-tested pattern (based on aap-mcp-server)
6. ✅ Health check endpoint
7. ✅ Prometheus-ready (extensible)
