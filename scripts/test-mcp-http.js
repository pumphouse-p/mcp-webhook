#!/usr/bin/env node

/**
 * Test client for MCP-over-HTTP server (stateless)
 * Tests the MCP protocol over HTTP with Bearer token authentication
 */

const SERVER_URL = process.env.SERVER_URL || "http://localhost:3000";
const API_KEY = process.env.API_KEY || "test-key";

async function mcpRequest(method, params = {}) {
  const body = {
    jsonrpc: "2.0",
    method,
    params,
    id: Math.floor(Math.random() * 1000000),
  };

  const response = await fetch(`${SERVER_URL}/mcp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`HTTP ${response.status}: ${error}`);
  }

  // Parse SSE response format
  const text = await response.text();

  // SSE format: "event: message\ndata: {...}\n\n"
  const lines = text.trim().split('\n');
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const jsonData = line.substring(6);
      return JSON.parse(jsonData);
    }
  }

  // Fallback: try parsing as plain JSON
  return JSON.parse(text);
}

async function main() {
  console.log("MCP-over-HTTP Test Client (Stateless)");
  console.log(`Connecting to: ${SERVER_URL}/mcp\n`);

  try {
    // Test 1: Initialize
    console.log("Test 1: Initialize connection");
    const initResult = await mcpRequest("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: {
        name: "test-client",
        version: "1.0.0",
      },
    });
    console.log("✓ Initialized successfully");
    console.log(`  Protocol version: ${initResult.result.protocolVersion}\n`);

    // Test 2: List available tools
    console.log("Test 2: List available tools");
    const toolsResult = await mcpRequest("tools/list");
    console.log(`✓ Found ${toolsResult.result.tools.length} tools:`);
    toolsResult.result.tools.forEach((tool) => {
      console.log(`  - ${tool.name}: ${tool.description}`);
    });
    console.log();

    // Test 3: Call webhook_post
    console.log("Test 3: Testing webhook_post to httpbin.org/post");
    const postResult = await mcpRequest("tools/call", {
      name: "webhook_post",
      arguments: {
        url: "https://httpbin.org/post",
        payload: {
          test: "data",
          timestamp: new Date().toISOString(),
          message: "Hello from MCP HTTP client!",
        },
        headers: {
          "X-Test-Header": "test-value",
        },
      },
    });

    console.log("✓ POST request successful");
    if (postResult.result.content && postResult.result.content[0]) {
      const response = JSON.parse(postResult.result.content[0].text);
      console.log(`  Status: ${response.status} ${response.statusText}`);
      console.log(
        `  Response preview: ${JSON.stringify(response.body, null, 2).substring(0, 200)}...`
      );
    }
    console.log();

    // Test 4: Call webhook_get
    console.log("Test 4: Testing webhook_get to httpbin.org/get");
    const getResult = await mcpRequest("tools/call", {
      name: "webhook_get",
      arguments: {
        url: "https://httpbin.org/get",
        params: {
          param1: "value1",
          param2: "value2",
        },
      },
    });

    console.log("✓ GET request successful");
    if (getResult.result.content && getResult.result.content[0]) {
      const response = JSON.parse(getResult.result.content[0].text);
      console.log(`  Status: ${response.status} ${response.statusText}`);
      console.log(`  Query params received:`, response.body.args);
    }
    console.log();

    // Test 5: Call webhook_put
    console.log("Test 5: Testing webhook_put to httpbin.org/put");
    const putResult = await mcpRequest("tools/call", {
      name: "webhook_put",
      arguments: {
        url: "https://httpbin.org/put",
        payload: {
          update: "data",
          modified: new Date().toISOString(),
        },
      },
    });

    console.log("✓ PUT request successful");
    if (putResult.result.content && putResult.result.content[0]) {
      const response = JSON.parse(putResult.result.content[0].text);
      console.log(`  Status: ${response.status} ${response.statusText}`);
    }
    console.log();

    // Test 6: Call webhook_delete
    console.log("Test 6: Testing webhook_delete to httpbin.org/delete");
    const deleteResult = await mcpRequest("tools/call", {
      name: "webhook_delete",
      arguments: {
        url: "https://httpbin.org/delete",
        headers: {
          "X-Delete-Reason": "test",
        },
      },
    });

    console.log("✓ DELETE request successful");
    if (deleteResult.result.content && deleteResult.result.content[0]) {
      const response = JSON.parse(deleteResult.result.content[0].text);
      console.log(`  Status: ${response.status} ${response.statusText}`);
    }
    console.log();

    console.log("✅ All tests completed successfully!");
  } catch (error) {
    console.error("\n✗ Error:", error.message);
    if (error.cause) {
      console.error("  Cause:", error.cause);
    }
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
