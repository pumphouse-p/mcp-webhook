# Logging Examples - Real Output

This document shows real logging output from the MCP Webhook Server in different configurations.

## Example 1: Production Logging (INFO Level, No Body Logging)

**Configuration:**
```bash
LOG_LEVEL=INFO
LOG_REQUESTS=true
LOG_RESPONSES=true
LOG_BODIES=false
LOG_PRETTY=false
```

**Output:**
```json
{"timestamp":"2026-05-04T18:29:20Z","level":"INFO","message":"MCP Webhook Server starting","mode":"HTTP/Stateless","host":"0.0.0.0","port":3008,"authentication":"disabled","apiKeys":0,"logLevel":"DEBUG","requestLogging":true,"responseLogging":true,"bodyLogging":true}
{"timestamp":"2026-05-04T18:29:20Z","level":"INFO","message":"Server listening","host":"0.0.0.0","port":3008,"endpoints":["/mcp","/health","/"]}
{"timestamp":"2026-05-04T18:29:22Z","level":"INFO","message":"HTTP Request","requestId":"req_1714851362392_x1y2z3abc","method":"POST","path":"/mcp","headers":{"content-type":"application/json","user-agent":"Node.js","authorization":"[REDACTED]","accept":"application/json, text/event-stream"}}
{"timestamp":"2026-05-04T18:29:22Z","level":"INFO","message":"Authentication","requestId":"req_1714851362392_x1y2z3abc","success":true,"reason":"valid_credentials"}
{"timestamp":"2026-05-04T18:29:22Z","level":"INFO","message":"HTTP Response","requestId":"req_1714851362392_x1y2z3abc","method":"POST","path":"/mcp","statusCode":200,"duration":"5ms"}
{"timestamp":"2026-05-04T18:29:22Z","level":"INFO","message":"HTTP Request","requestId":"req_1714851362401_d4e5f6ghi","method":"POST","path":"/mcp"}
{"timestamp":"2026-05-04T18:29:22Z","level":"INFO","message":"Authentication","requestId":"req_1714851362401_d4e5f6ghi","success":true}
{"timestamp":"2026-05-04T18:29:22Z","level":"INFO","message":"Tool Execution","requestId":"req_1714851362401_d4e5f6ghi","tool":"webhook_post"}
{"timestamp":"2026-05-04T18:29:22Z","level":"INFO","message":"Webhook request completed","requestId":"req_1714851362401_d4e5f6ghi","method":"POST","url":"https://httpbin.org/post","status":200,"statusText":"OK","duration":"234ms"}
{"timestamp":"2026-05-04T18:29:22Z","level":"INFO","message":"Tool Result","requestId":"req_1714851362401_d4e5f6ghi","tool":"webhook_post","statusCode":200,"duration":"241ms","success":true}
{"timestamp":"2026-05-04T18:29:22Z","level":"INFO","message":"HTTP Response","requestId":"req_1714851362401_d4e5f6ghi","statusCode":200,"duration":"244ms"}
```

**Analysis:** Clean, parseable logs suitable for log aggregation systems. Each request has a unique ID for tracking.

---

## Example 2: Development Logging (DEBUG Level, Pretty Print)

**Configuration:**
```bash
LOG_LEVEL=DEBUG
LOG_REQUESTS=true
LOG_RESPONSES=true
LOG_BODIES=true
LOG_PRETTY=true
```

**Output:**
```json
{
  "timestamp": "2026-05-04T18:29:22Z",
  "level": "INFO",
  "message": "HTTP Request",
  "requestId": "req_1714851362401_d4e5f6ghi",
  "method": "POST",
  "path": "/mcp",
  "headers": {
    "content-type": "application/json",
    "user-agent": "Node.js",
    "authorization": "[REDACTED]",
    "accept": "application/json, text/event-stream"
  },
  "body": "{\"jsonrpc\":\"2.0\",\"method\":\"tools/call\",\"params\":{\"name\":\"webhook_post\",\"arguments\":{\"url\":\"https://httpbin.org/post\",\"payload\":{\"test\":\"data\",\"timestamp\":\"2026-05-04T18:29:22.399Z\",\"message\":\"Hello from MCP HTTP client!\"},\"headers\":{\"X-Test-Header\":\"test-value\"}}},\"id\":558391}"
}
{
  "timestamp": "2026-05-04T18:29:22Z",
  "level": "INFO",
  "message": "Authentication",
  "requestId": "req_1714851362401_d4e5f6ghi",
  "success": true,
  "reason": "valid_credentials"
}
{
  "timestamp": "2026-05-04T18:29:22Z",
  "level": "DEBUG",
  "message": "MCP Request",
  "requestId": "req_1714851362401_d4e5f6ghi",
  "mcpMethod": "tools/call",
  "params": "{\"name\":\"webhook_post\",\"arguments\":{\"url\":\"https://httpbin.org/post\",\"payload\":{\"test\":\"data\",\"timestamp\":\"2026-05-04T18:29:22.399Z\",\"message\":\"Hello from MCP HTTP client!\"},\"headers\":{\"X-Test-Header\":\"test-value\"}}}"
}
{
  "timestamp": "2026-05-04T18:29:22Z",
  "level": "INFO",
  "message": "Tool Execution",
  "requestId": "req_1714851362401_d4e5f6ghi",
  "tool": "webhook_post",
  "arguments": "{\"url\":\"https://httpbin.org/post\",\"payload\":{\"test\":\"data\",\"timestamp\":\"2026-05-04T18:29:22.399Z\",\"message\":\"Hello from MCP HTTP client!\"},\"headers\":{\"X-Test-Header\":\"test-value\"}}"
}
{
  "timestamp": "2026-05-04T18:29:22Z",
  "level": "DEBUG",
  "message": "Webhook request starting",
  "requestId": "req_1714851362401_d4e5f6ghi",
  "method": "POST",
  "url": "https://httpbin.org/post",
  "hasPayload": true,
  "hasAuth": false
}
{
  "timestamp": "2026-05-04T18:29:22Z",
  "level": "INFO",
  "message": "Webhook request completed",
  "requestId": "req_1714851362401_d4e5f6ghi",
  "method": "POST",
  "url": "https://httpbin.org/post",
  "status": 200,
  "statusText": "OK",
  "duration": "234ms"
}
{
  "timestamp": "2026-05-04T18:29:22Z",
  "level": "INFO",
  "message": "Tool Result",
  "requestId": "req_1714851362401_d4e5f6ghi",
  "tool": "webhook_post",
  "statusCode": 200,
  "duration": "241ms",
  "success": true
}
```

**Analysis:** Maximum verbosity for debugging. Shows request/response bodies and internal flow.

---

## Example 3: Failed Authentication

**Configuration:**
```bash
LOG_LEVEL=INFO
MCP_AUTH_ENABLED=true
MCP_API_KEYS=valid-key
```

**Request with invalid key:**
```json
{
  "timestamp": "2026-05-04T18:30:15Z",
  "level": "INFO",
  "message": "HTTP Request",
  "requestId": "req_1714851415000_abc123",
  "method": "POST",
  "path": "/mcp"
}
{
  "timestamp": "2026-05-04T18:30:15Z",
  "level": "WARN",
  "message": "Authentication",
  "requestId": "req_1714851415000_abc123",
  "success": false,
  "reason": "Invalid API key"
}
{
  "timestamp": "2026-05-04T18:30:15Z",
  "level": "WARN",
  "message": "HTTP Response",
  "requestId": "req_1714851415000_abc123",
  "method": "POST",
  "path": "/mcp",
  "statusCode": 401,
  "duration": "2ms"
}
```

**Analysis:** Failed auth attempts logged at WARN level for security monitoring.

---

## Example 4: Webhook Failure

**Webhook returns 500 error:**

```json
{
  "timestamp": "2026-05-04T18:31:00Z",
  "level": "INFO",
  "message": "Tool Execution",
  "requestId": "req_1714851460000_xyz789",
  "tool": "webhook_post"
}
{
  "timestamp": "2026-05-04T18:31:00Z",
  "level": "INFO",
  "message": "Webhook request completed",
  "requestId": "req_1714851460000_xyz789",
  "method": "POST",
  "url": "https://example.com/broken",
  "status": 500,
  "statusText": "Internal Server Error",
  "duration": "156ms"
}
{
  "timestamp": "2026-05-04T18:31:00Z",
  "level": "WARN",
  "message": "Tool Result",
  "requestId": "req_1714851460000_xyz789",
  "tool": "webhook_post",
  "statusCode": 500,
  "duration": "158ms",
  "success": false
}
```

**Network error:**

```json
{
  "timestamp": "2026-05-04T18:31:30Z",
  "level": "ERROR",
  "message": "Webhook request failed",
  "requestId": "req_1714851490000_err123",
  "method": "POST",
  "url": "https://unreachable.example.com",
  "duration": "5002ms",
  "error": {
    "name": "FetchError",
    "message": "request to https://unreachable.example.com failed, reason: connect ETIMEDOUT",
    "stack": "FetchError: request to https://unreachable.example.com failed..."
  }
}
```

---

## Example 5: Request Tracking Across Lifecycle

**Follow a single request through its entire lifecycle:**

```bash
# Filter logs by request ID
cat server.log | jq 'select(.requestId == "req_1714851362401_d4e5f6ghi")'
```

**Output:**
```json
{"timestamp":"2026-05-04T18:29:22Z","level":"INFO","message":"HTTP Request","requestId":"req_1714851362401_d4e5f6ghi","method":"POST","path":"/mcp"}
{"timestamp":"2026-05-04T18:29:22Z","level":"INFO","message":"Authentication","requestId":"req_1714851362401_d4e5f6ghi","success":true}
{"timestamp":"2026-05-04T18:29:22Z","level":"DEBUG","message":"MCP Request","requestId":"req_1714851362401_d4e5f6ghi","mcpMethod":"tools/call"}
{"timestamp":"2026-05-04T18:29:22Z","level":"INFO","message":"Tool Execution","requestId":"req_1714851362401_d4e5f6ghi","tool":"webhook_post"}
{"timestamp":"2026-05-04T18:29:22Z","level":"DEBUG","message":"Webhook request starting","requestId":"req_1714851362401_d4e5f6ghi","method":"POST","url":"https://httpbin.org/post"}
{"timestamp":"2026-05-04T18:29:22Z","level":"INFO","message":"Webhook request completed","requestId":"req_1714851362401_d4e5f6ghi","status":200,"duration":"234ms"}
{"timestamp":"2026-05-04T18:29:22Z","level":"DEBUG","message":"MCP Response","requestId":"req_1714851362401_d4e5f6ghi","mcpMethod":"tools/call","duration":"241ms"}
{"timestamp":"2026-05-04T18:29:22Z","level":"INFO","message":"Tool Result","requestId":"req_1714851362401_d4e5f6ghi","tool":"webhook_post","statusCode":200,"duration":"241ms","success":true}
{"timestamp":"2026-05-04T18:29:22Z","level":"INFO","message":"HTTP Response","requestId":"req_1714851362401_d4e5f6ghi","statusCode":200,"duration":"244ms"}
```

**Timeline:**
1. HTTP Request received (0ms)
2. Authentication successful (0ms)
3. MCP Request parsed (0ms)
4. Tool execution started (0ms)
5. Webhook request started (0ms)
6. Webhook request completed (234ms)
7. MCP Response sent (241ms)
8. Tool result logged (241ms)
9. HTTP Response sent (244ms)

**Total duration:** 244ms

---

## Example 6: Credential Redaction

**Tool call with authentication:**

```json
{
  "timestamp": "2026-05-04T18:32:00Z",
  "level": "INFO",
  "message": "Tool Execution",
  "requestId": "req_1714851520000_sec123",
  "tool": "webhook_post",
  "arguments": "{\"url\":\"https://api.example.com\",\"payload\":{\"data\":\"value\"},\"basic_auth\":{\"username\":\"[REDACTED]\",\"password\":\"[REDACTED]\"},\"api_key\":{\"key\":\"[REDACTED]\",\"location\":\"header\",\"name\":\"X-API-Key\"}}"
}
```

**Analysis:** Credentials are automatically redacted to prevent leaking secrets in logs.

---

## Performance Metrics Extraction

### Average Response Time

```bash
cat server.log | jq -r 'select(.message == "HTTP Response") | .duration' | sed 's/ms//' | awk '{sum+=$1; count++} END {print "Average:", sum/count "ms"}'
```

### Request Count by Tool

```bash
cat server.log | jq -r 'select(.message == "Tool Execution") | .tool' | sort | uniq -c
```

**Output:**
```
    245 webhook_post
    189 webhook_get
     67 webhook_put
     23 webhook_delete
```

### Success Rate

```bash
cat server.log | jq 'select(.message == "Tool Result")' | jq -s '[.[] | .success] | group_by(.) | map({success: .[0], count: length})'
```

**Output:**
```json
[
  {"success": true, "count": 512},
  {"success": false, "count": 12}
]
```

### Failed Requests

```bash
cat server.log | jq 'select(.message == "Tool Result" and .success == false)'
```

---

## Log Aggregation Examples

### Elasticsearch Query

```json
{
  "query": {
    "bool": {
      "must": [
        {"term": {"level": "ERROR"}},
        {"range": {"timestamp": {"gte": "now-1h"}}}
      ]
    }
  }
}
```

### Splunk Query

```spl
index=mcp_webhook level=ERROR earliest=-1h
| stats count by error.name
```

### Datadog Query

```
service:mcp-http level:ERROR @requestId:*
```

---

## Monitoring Alerts

### Alert on High Error Rate

```bash
# Alert if error rate > 5% in last 5 minutes
ERROR_COUNT=$(cat server.log | jq 'select(.level == "ERROR")' | wc -l)
TOTAL_COUNT=$(cat server.log | jq 'select(.message == "HTTP Request")' | wc -l)
ERROR_RATE=$(echo "scale=2; $ERROR_COUNT / $TOTAL_COUNT * 100" | bc)

if (( $(echo "$ERROR_RATE > 5" | bc -l) )); then
  echo "ALERT: Error rate is ${ERROR_RATE}%"
fi
```

### Alert on Slow Requests

```bash
# Alert if any request takes > 5 seconds
cat server.log | jq 'select(.message == "HTTP Response" and (.duration | rtrimstr("ms") | tonumber) > 5000)' | wc -l
```
