# Logging Guide - MCP Webhook Server

The MCP-over-HTTP server includes comprehensive structured logging capabilities for production deployments.

## Features

- ✅ Structured JSON logging
- ✅ Request/Response tracking with unique IDs
- ✅ Configurable log levels (DEBUG, INFO, WARN, ERROR)
- ✅ MCP protocol request/response logging
- ✅ Tool execution tracking
- ✅ Authentication attempt logging
- ✅ Webhook call logging with timing
- ✅ Automatic credential redaction
- ✅ Configurable body logging
- ✅ Request correlation via X-Request-ID header

## Configuration

Configure logging via environment variables:

```bash
# Log level (DEBUG, INFO, WARN, ERROR)
LOG_LEVEL=INFO

# Enable/disable request logging (default: true)
LOG_REQUESTS=true

# Enable/disable response logging (default: true)
LOG_RESPONSES=true

# Enable/disable body logging (default: false, can be verbose)
LOG_BODIES=true

# Pretty print JSON logs (default: false)
LOG_PRETTY=true

# Maximum body length to log (default: 1000)
LOG_MAX_BODY_LENGTH=1000
```

### Complete .env Example

```bash
# Server configuration
PORT=3000
HOST=0.0.0.0

# Authentication
MCP_AUTH_ENABLED=true
MCP_API_KEYS=key1,key2,key3

# Logging configuration
LOG_LEVEL=INFO
LOG_REQUESTS=true
LOG_RESPONSES=true
LOG_BODIES=false
LOG_PRETTY=false
LOG_MAX_BODY_LENGTH=1000
```

## Log Levels

### DEBUG
Most verbose. Includes:
- All INFO level logs
- MCP protocol request/response details
- Webhook request start/completion
- Internal state changes

**Use for:** Development, troubleshooting

### INFO (Default)
Standard operational logs:
- HTTP requests/responses
- Tool executions
- Authentication attempts
- Webhook completions

**Use for:** Production monitoring

### WARN
Warnings and errors:
- Failed authentication attempts
- HTTP 4xx/5xx responses
- Tool execution failures

**Use for:** Alert monitoring

### ERROR
Critical errors only:
- Unhandled exceptions
- Server errors
- Fatal failures

**Use for:** Error tracking systems

## Log Format

### Structured JSON (Default)

```json
{
  "timestamp": "2026-05-04T18:30:15Z",
  "level": "INFO",
  "message": "HTTP Request",
  "requestId": "req_1714851015000_abc123xyz",
  "method": "POST",
  "path": "/mcp",
  "headers": {
    "content-type": "application/json",
    "user-agent": "mcp-client/1.0",
    "authorization": "[REDACTED]",
    "accept": "application/json, text/event-stream"
  }
}
```

### Pretty Print (Development)

```json
{
  "timestamp": "2026-05-04T18:30:15Z",
  "level": "INFO",
  "message": "Tool Execution",
  "requestId": "req_1714851015000_abc123xyz",
  "tool": "webhook_post",
  "arguments": "{\"url\":\"https://example.com/webhook\",\"payload\":{...},\"basic_auth\":{\"username\":\"[REDACTED]\",\"password\":\"[REDACTED]\"}}"
}
```

## Log Entry Types

### 1. HTTP Request

Logged when a request is received.

```json
{
  "timestamp": "2026-05-04T18:30:15Z",
  "level": "INFO",
  "message": "HTTP Request",
  "requestId": "req_1714851015000_abc123xyz",
  "method": "POST",
  "path": "/mcp",
  "headers": {
    "content-type": "application/json",
    "user-agent": "mcp-client/1.0",
    "authorization": "[REDACTED]"
  }
}
```

### 2. HTTP Response

Logged when a response is sent.

```json
{
  "timestamp": "2026-05-04T18:30:15Z",
  "level": "INFO",
  "message": "HTTP Response",
  "requestId": "req_1714851015000_abc123xyz",
  "method": "POST",
  "path": "/mcp",
  "statusCode": 200,
  "duration": "45ms"
}
```

### 3. Authentication

Logged for every authentication attempt.

```json
{
  "timestamp": "2026-05-04T18:30:15Z",
  "level": "INFO",
  "message": "Authentication",
  "requestId": "req_1714851015000_abc123xyz",
  "success": true,
  "reason": "valid_credentials"
}
```

**Failed authentication:**
```json
{
  "timestamp": "2026-05-04T18:30:15Z",
  "level": "WARN",
  "message": "Authentication",
  "requestId": "req_1714851015000_abc123xyz",
  "success": false,
  "reason": "Invalid API key"
}
```

### 4. MCP Request

Logged when MCP protocol request is received (DEBUG level).

```json
{
  "timestamp": "2026-05-04T18:30:15Z",
  "level": "DEBUG",
  "message": "MCP Request",
  "requestId": "req_1714851015000_abc123xyz",
  "mcpMethod": "tools/call",
  "params": "{\"name\":\"webhook_post\",\"arguments\":{...}}"
}
```

### 5. MCP Response

Logged when MCP response is sent (DEBUG level).

```json
{
  "timestamp": "2026-05-04T18:30:15Z",
  "level": "DEBUG",
  "message": "MCP Response",
  "requestId": "req_1714851015000_abc123xyz",
  "mcpMethod": "tools/list",
  "duration": "2ms",
  "result": "{\"tools\":[...]}"
}
```

### 6. Tool Execution

Logged when a tool is invoked.

```json
{
  "timestamp": "2026-05-04T18:30:15Z",
  "level": "INFO",
  "message": "Tool Execution",
  "requestId": "req_1714851015000_abc123xyz",
  "tool": "webhook_post",
  "arguments": "{\"url\":\"https://example.com\",\"payload\":{...},\"basic_auth\":{\"username\":\"[REDACTED]\",\"password\":\"[REDACTED]\"}}"
}
```

### 7. Tool Result

Logged when a tool completes.

```json
{
  "timestamp": "2026-05-04T18:30:15Z",
  "level": "INFO",
  "message": "Tool Result",
  "requestId": "req_1714851015000_abc123xyz",
  "tool": "webhook_post",
  "statusCode": 200,
  "duration": "234ms",
  "success": true
}
```

### 8. Webhook Request

Logged when making external webhook calls.

```json
{
  "timestamp": "2026-05-04T18:30:15Z",
  "level": "INFO",
  "message": "Webhook request completed",
  "requestId": "req_1714851015000_abc123xyz",
  "method": "POST",
  "url": "https://example.com/webhook",
  "status": 200,
  "statusText": "OK",
  "duration": "198ms"
}
```

### 9. Error Logs

Logged when errors occur.

```json
{
  "timestamp": "2026-05-04T18:30:15Z",
  "level": "ERROR",
  "message": "Tool execution failed",
  "requestId": "req_1714851015000_abc123xyz",
  "tool": "webhook_post",
  "error": {
    "name": "FetchError",
    "message": "request to https://example.com/webhook failed, reason: connect ECONNREFUSED",
    "stack": "FetchError: request to https://example.com/webhook failed..."
  }
}
```

## Security Features

### Automatic Credential Redaction

Sensitive data is automatically redacted from logs:

- **Authorization headers:** `[REDACTED]`
- **Basic auth credentials:** `{username: "[REDACTED]", password: "[REDACTED]"}`
- **API keys:** `{...api_key, key: "[REDACTED]"}`

Example:
```json
{
  "tool": "webhook_post",
  "arguments": {
    "url": "https://example.com",
    "basic_auth": {
      "username": "[REDACTED]",
      "password": "[REDACTED]"
    },
    "api_key": {
      "key": "[REDACTED]",
      "location": "header",
      "name": "X-API-Key"
    }
  }
}
```

### Body Truncation

Request/response bodies are truncated to prevent log overflow:

```json
{
  "body": "{\"large\":\"payload\"... (5000 more chars)"
}
```

Configure with: `LOG_MAX_BODY_LENGTH=1000`

## Request Tracking

Every request gets a unique ID for correlation:

```bash
# Request ID in log entries
"requestId": "req_1714851015000_abc123xyz"

# Also returned in response header
X-Request-ID: req_1714851015000_abc123xyz
```

Track a request through the entire lifecycle:

```bash
# Find all logs for a specific request
grep "req_1714851015000_abc123xyz" server.log | jq .
```

## Production Examples

### Example 1: Standard Production Setup

```bash
# Production logging configuration
LOG_LEVEL=INFO
LOG_REQUESTS=true
LOG_RESPONSES=true
LOG_BODIES=false          # Don't log bodies in production
LOG_PRETTY=false          # JSON for log aggregation
LOG_MAX_BODY_LENGTH=500
```

**Output:**
```json
{"timestamp":"2026-05-04T18:30:15Z","level":"INFO","message":"HTTP Request","requestId":"req_001","method":"POST","path":"/mcp"}
{"timestamp":"2026-05-04T18:30:15Z","level":"INFO","message":"Authentication","requestId":"req_001","success":true,"reason":"valid_credentials"}
{"timestamp":"2026-05-04T18:30:15Z","level":"INFO","message":"Tool Execution","requestId":"req_001","tool":"webhook_post"}
{"timestamp":"2026-05-04T18:30:15Z","level":"INFO","message":"Webhook request completed","requestId":"req_001","method":"POST","url":"https://api.example.com","status":200,"duration":"234ms"}
{"timestamp":"2026-05-04T18:30:15Z","level":"INFO","message":"Tool Result","requestId":"req_001","tool":"webhook_post","statusCode":200,"duration":"245ms","success":true}
{"timestamp":"2026-05-04T18:30:15Z","level":"INFO","message":"HTTP Response","requestId":"req_001","statusCode":200,"duration":"248ms"}
```

### Example 2: Debug Mode for Troubleshooting

```bash
# Debug logging configuration
LOG_LEVEL=DEBUG
LOG_REQUESTS=true
LOG_RESPONSES=true
LOG_BODIES=true           # Enable body logging
LOG_PRETTY=true           # Pretty print for readability
LOG_MAX_BODY_LENGTH=2000
```

**Output:** (Pretty printed for readability)
```json
{
  "timestamp": "2026-05-04T18:30:15Z",
  "level": "DEBUG",
  "message": "MCP Request",
  "requestId": "req_001",
  "mcpMethod": "tools/call",
  "params": "{\"name\":\"webhook_post\",\"arguments\":{\"url\":\"https://example.com\",\"payload\":{\"test\":\"data\"}}}"
}
```

### Example 3: Error Tracking Only

```bash
# Minimal logging - errors only
LOG_LEVEL=ERROR
LOG_REQUESTS=false
LOG_RESPONSES=false
LOG_BODIES=false
```

Only critical errors will be logged.

## Integration with Log Aggregation

### Elasticsearch/Logstash

```bash
# Run with JSON output
LOG_PRETTY=false npm run start:mcp-http 2>&1 | logstash -f logstash.conf
```

### Splunk

```bash
# Configure Splunk to read JSON logs
LOG_PRETTY=false npm run start:mcp-http 2>&1 | tee /var/log/mcp-webhook.log
```

### CloudWatch

```bash
# Use CloudWatch agent to ship logs
LOG_PRETTY=false npm run start:mcp-http
```

### Datadog

```javascript
// Datadog automatically parses JSON logs
// Configure: source:mcp-webhook service:mcp-http
```

## Monitoring Queries

### Find Failed Authentications
```bash
cat server.log | jq 'select(.message == "Authentication" and .success == false)'
```

### Find Slow Requests
```bash
cat server.log | jq 'select(.message == "HTTP Response" and (.duration | rtrimstr("ms") | tonumber) > 1000)'
```

### Count Requests by Tool
```bash
cat server.log | jq -r 'select(.message == "Tool Execution") | .tool' | sort | uniq -c
```

### Find Errors
```bash
cat server.log | jq 'select(.level == "ERROR")'
```

### Track Specific Request
```bash
REQUEST_ID="req_1714851015000_abc123xyz"
cat server.log | jq --arg rid "$REQUEST_ID" 'select(.requestId == $rid)'
```

## Best Practices

1. **Production:** Use `LOG_LEVEL=INFO` with `LOG_BODIES=false`
2. **Development:** Use `LOG_LEVEL=DEBUG` with `LOG_PRETTY=true`
3. **Troubleshooting:** Temporarily enable `LOG_BODIES=true` for specific issues
4. **Log Rotation:** Use logrotate or similar to manage log file size
5. **Monitoring:** Set up alerts on ERROR level logs
6. **Correlation:** Always use requestId for tracking
7. **Security:** Never disable credential redaction
8. **Performance:** Disable body logging in high-traffic environments

## Container Logging

When running in containers, logs go to stderr (standard practice):

```bash
# View logs
podman logs -f mcp-webhook-mcp-http

# Follow logs with jq
podman logs -f mcp-webhook-mcp-http 2>&1 | jq .

# Save logs to file
podman logs mcp-webhook-mcp-http > /var/log/mcp-webhook.log 2>&1
```

## Troubleshooting

### Logs not appearing

Check stderr redirection:
```bash
npm run start:mcp-http 2>&1 | tee server.log
```

### Too verbose

Increase log level:
```bash
LOG_LEVEL=WARN npm run start:mcp-http
```

### Can't parse JSON

Enable pretty printing:
```bash
LOG_PRETTY=true npm run start:mcp-http
```

### Missing request IDs

Request IDs are automatically generated. Check that the middleware is loaded:
```bash
grep "X-Request-ID" server.log
```
