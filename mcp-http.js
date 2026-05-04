#!/usr/bin/env node

/**
 * MCP-over-HTTP Server for Webhooks
 *
 * Implements a stateless MCP server over HTTP following the pattern from aap-mcp-server.
 * Uses Bearer token authentication and provides webhook invocation tools.
 */

import { config } from "dotenv";
import express from "express";
import cors from "cors";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { Logger, defaultLogger, generateRequestId } from "./lib/logger.js";

// Load environment variables
config();

// Configuration
const CONFIG = {
  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 3000,
  HOST: process.env.HOST || "0.0.0.0",
  AUTH_ENABLED: process.env.MCP_AUTH_ENABLED === "true",
  API_KEYS: process.env.MCP_API_KEYS?.split(",").map(k => k.trim()) || [],
};

// Helper to get timestamps
const getTimestamp = () => {
  return new Date().toISOString().split(".")[0] + "Z";
};

// Extract Bearer token from Authorization header
const extractBearerToken = (authHeader) => {
  return authHeader && authHeader.startsWith("Bearer ")
    ? authHeader.substring(7)
    : undefined;
};

// Validate API key
const validateApiKey = (apiKey) => {
  if (!CONFIG.AUTH_ENABLED) {
    return { valid: true };
  }

  if (!apiKey) {
    return { valid: false, error: "API key required" };
  }

  if (!CONFIG.API_KEYS.includes(apiKey)) {
    return { valid: false, error: "Invalid API key" };
  }

  return { valid: true };
};

// Webhook request handler
async function handleWebhookRequest(method, args, logger) {
  const { url, payload, params, headers = {}, basic_auth, api_key } = args;

  const urlObj = new URL(url);

  // Add query parameters
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      urlObj.searchParams.append(key, String(value));
    });
  }

  // Add API key to query if specified
  if (api_key && api_key.location === "query") {
    const paramName = api_key.name || "api_key";
    urlObj.searchParams.append(paramName, api_key.key);
  }

  // Build request headers
  const requestHeaders = {
    "Content-Type": "application/json",
    ...headers,
  };

  // Add Basic auth header
  if (basic_auth) {
    const credentials = `${basic_auth.username}:${basic_auth.password}`;
    const encoded = Buffer.from(credentials).toString("base64");
    requestHeaders["Authorization"] = `Basic ${encoded}`;
  }

  // Add API key to header if specified
  if (api_key && api_key.location === "header") {
    const headerName = api_key.name || "X-API-Key";
    requestHeaders[headerName] = api_key.key;
  }

  // Build fetch options
  const options = {
    method,
    headers: requestHeaders,
  };

  // Add body for POST/PUT
  if (payload && (method === "POST" || method === "PUT")) {
    options.body = JSON.stringify(payload);
  }

  // Make the request
  const startTime = Date.now();
  let responseStatus = 0;
  let responseError = null;

  try {
    logger.debug("Webhook request starting", {
      method,
      url: urlObj.toString(),
      hasPayload: !!payload,
      hasAuth: !!(basic_auth || api_key),
    });

    const response = await fetch(urlObj.toString(), options);
    const responseText = await response.text();
    const executionTime = Date.now() - startTime;
    responseStatus = response.status;

    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = responseText;
    }

    logger.info("Webhook request completed", {
      method,
      url: urlObj.toString(),
      status: response.status,
      statusText: response.statusText,
      duration: `${executionTime}ms`,
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              status: response.status,
              statusText: response.statusText,
              headers: Object.fromEntries(response.headers.entries()),
              body: responseData,
            },
            null,
            2
          ),
        },
      ],
    };
  } catch (error) {
    const executionTime = Date.now() - startTime;
    responseError = error;

    logger.error("Webhook request failed", error, {
      method,
      url: urlObj.toString(),
      duration: `${executionTime}ms`,
    });

    throw error;
  }
}

// Define webhook tool schemas
const getToolSchemas = () => {
  const webhookAuthSchema = {
    basic_auth: {
      type: "object",
      description: "Basic authentication credentials for the webhook endpoint",
      properties: {
        username: { type: "string", description: "Username for basic auth" },
        password: { type: "string", description: "Password for basic auth" },
      },
      required: ["username", "password"],
    },
    api_key: {
      type: "object",
      description: "API key authentication for the webhook endpoint",
      properties: {
        key: { type: "string", description: "The API key value" },
        location: {
          type: "string",
          enum: ["header", "query"],
          description: "Where to send the API key (header or query parameter)",
        },
        name: {
          type: "string",
          description: "The header name or query parameter name (default: 'X-API-Key' for header, 'api_key' for query)",
        },
      },
      required: ["key", "location"],
    },
  };

  return [
    {
      name: "webhook_post",
      description: "Send a POST request to a webhook URL with optional JSON payload, headers, and authentication",
      inputSchema: {
        type: "object",
        properties: {
          url: { type: "string", description: "The webhook URL to call" },
          payload: { type: "object", description: "JSON payload to send in the request body" },
          headers: { type: "object", description: "Custom headers to include in the request" },
          basic_auth: webhookAuthSchema.basic_auth,
          api_key: webhookAuthSchema.api_key,
        },
        required: ["url"],
      },
    },
    {
      name: "webhook_get",
      description: "Send a GET request to a webhook URL with optional query parameters, headers, and authentication",
      inputSchema: {
        type: "object",
        properties: {
          url: { type: "string", description: "The webhook URL to call" },
          params: { type: "object", description: "Query parameters to append to the URL" },
          headers: { type: "object", description: "Custom headers to include in the request" },
          basic_auth: webhookAuthSchema.basic_auth,
          api_key: webhookAuthSchema.api_key,
        },
        required: ["url"],
      },
    },
    {
      name: "webhook_put",
      description: "Send a PUT request to a webhook URL with optional JSON payload, headers, and authentication",
      inputSchema: {
        type: "object",
        properties: {
          url: { type: "string", description: "The webhook URL to call" },
          payload: { type: "object", description: "JSON payload to send in the request body" },
          headers: { type: "object", description: "Custom headers to include in the request" },
          basic_auth: webhookAuthSchema.basic_auth,
          api_key: webhookAuthSchema.api_key,
        },
        required: ["url"],
      },
    },
    {
      name: "webhook_delete",
      description: "Send a DELETE request to a webhook URL with optional headers and authentication",
      inputSchema: {
        type: "object",
        properties: {
          url: { type: "string", description: "The webhook URL to call" },
          headers: { type: "object", description: "Custom headers to include in the request" },
          basic_auth: webhookAuthSchema.basic_auth,
          api_key: webhookAuthSchema.api_key,
        },
        required: ["url"],
      },
    },
  ];
};

// Factory function to create MCP server instance
const createMcpServer = (logger) => {
  const server = new Server(
    {
      name: "mcp-webhook",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Handle list tools request
  server.setRequestHandler(ListToolsRequestSchema, async (request) => {
    const startTime = Date.now();

    logger.logMcpRequest("tools/list", request.params, logger.context.requestId);

    const result = {
      tools: getToolSchemas(),
    };

    const duration = Date.now() - startTime;
    logger.logMcpResponse("tools/list", result, logger.context.requestId, duration);

    return result;
  });

  // Handle call tool request
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args = {} } = request.params;
    const startTime = Date.now();
    let statusCode = 200;
    let error = null;

    try {
      logger.logToolExecution(name, args, logger.context.requestId);

      // Route to appropriate webhook method
      let result;
      switch (name) {
        case "webhook_post":
          result = await handleWebhookRequest("POST", args, logger);
          break;
        case "webhook_get":
          result = await handleWebhookRequest("GET", args, logger);
          break;
        case "webhook_put":
          result = await handleWebhookRequest("PUT", args, logger);
          break;
        case "webhook_delete":
          result = await handleWebhookRequest("DELETE", args, logger);
          break;
        default:
          throw new Error(`Unknown tool: ${name}`);
      }

      return result;
    } catch (err) {
      error = err;
      statusCode = 500;

      logger.error("Tool execution failed", err, {
        tool: name,
        requestId: logger.context.requestId,
      });

      return {
        content: [
          {
            type: "text",
            text: `Error: ${err.message}`,
          },
        ],
        isError: true,
      };
    } finally {
      const duration = Date.now() - startTime;
      logger.logToolResult(name, statusCode, logger.context.requestId, duration, error);
    }
  });

  return server;
};

// Create Express app
const app = express();

// Trust proxy - REQUIRED when behind reverse proxy (Traefik, nginx, etc.)
// This enables Express to read X-Forwarded-* headers correctly
app.set("trust proxy", true);

// Request ID middleware (first in chain)
app.use((req, res, next) => {
  req.requestId = generateRequestId();
  res.setHeader("X-Request-ID", req.requestId);
  next();
});

// Early authentication check (before body parsing)
app.use((req, res, next) => {
  // Only apply to POST requests to MCP endpoint
  if (req.method === "POST" && req.path === "/mcp") {
    const authHeader = req.headers["authorization"];

    // If auth is enabled, require Bearer token
    if (CONFIG.AUTH_ENABLED && !authHeader) {
      res.status(401).json({
        jsonrpc: "2.0",
        error: {
          code: -32000,
          message: "Unauthorized: Bearer token required",
        },
        id: null,
      });
      return;
    }
  }

  next();
});

// Parse JSON bodies
app.use(express.json());

// Enable CORS
// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN || "*",
  credentials: true,
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Accept", "X-Request-ID"],
  exposedHeaders: ["X-Request-ID"],
};
app.use(cors(corsOptions));

// Authenticate request and extract API key
const authenticateRequest = (req) => {
  const authHeader = req.headers["authorization"];
  const token = extractBearerToken(authHeader);

  const validation = validateApiKey(token);

  if (!validation.valid) {
    return {
      ok: false,
      error: validation.error,
    };
  }

  return {
    ok: true,
    apiKey: token,
  };
};

// MCP POST endpoint handler - stateless (no sessions)
const mcpPostHandler = async (req, res) => {
  const requestId = req.requestId;
  const logger = new Logger({ requestId });
  const startTime = Date.now();

  try {
    logger.logRequest(req, requestId);

    // Authenticate request
    const authResult = authenticateRequest(req);

    logger.logAuthAttempt(authResult.ok, authResult.error, requestId);

    if (!authResult.ok) {
      const errorResponse = {
        jsonrpc: "2.0",
        error: {
          code: -32000,
          message: `Unauthorized: ${authResult.error}`,
        },
        id: (req.body)?.id || null,
      };

      logger.logResponse(req, 401, errorResponse, requestId, Date.now() - startTime);

      res.status(401).json(errorResponse);
      return;
    }

    // Log MCP method being called
    if (req.body?.method) {
      logger.logMcpRequest(req.body.method, req.body.params, requestId);
    }

    // Create a fresh stateless transport for this request
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // Stateless mode
    });

    const server = createMcpServer(logger);
    await server.connect(transport);

    // Handle the request
    await transport.handleRequest(req, res, req.body);

    // Log successful response
    const duration = Date.now() - startTime;
    logger.logResponse(req, res.statusCode || 200, null, requestId, duration);

    // Clean up after request
    await transport.close();
    await server.close();
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error("MCP request handler error", error, { requestId });

    if (!res.headersSent) {
      const errorResponse = {
        jsonrpc: "2.0",
        error: {
          code: -32603,
          message: "Internal server error",
          data: error.message,
        },
        id: null,
      };

      logger.logResponse(req, 500, errorResponse, requestId, duration);

      res.status(500).json(errorResponse);
    }
  }
};

// Routes
app.post("/mcp", mcpPostHandler);

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    mode: "mcp-http",
    authentication: CONFIG.AUTH_ENABLED ? "enabled" : "disabled",
  });
});

// Info endpoint
app.get("/", (req, res) => {
  const banner = `MCP Webhook Server (HTTP)

This is a Model Context Protocol (MCP) server over HTTP.
Access it with an MCP client at: POST /mcp

Available tools:
  - webhook_post   - Send POST requests to external webhooks
  - webhook_get    - Send GET requests to external webhooks
  - webhook_put    - Send PUT requests to external webhooks
  - webhook_delete - Send DELETE requests to external webhooks

Authentication: ${CONFIG.AUTH_ENABLED ? "Bearer token required" : "Disabled"}
`;
  res.set("Content-Type", "text/plain");
  res.status(200).send(banner);
});

// Start server
async function main() {
  defaultLogger.info("MCP Webhook Server starting", {
    mode: "HTTP/Stateless",
    host: CONFIG.HOST,
    port: CONFIG.PORT,
    authentication: CONFIG.AUTH_ENABLED ? "enabled" : "disabled",
    apiKeys: CONFIG.AUTH_ENABLED ? CONFIG.API_KEYS.length : 0,
    corsOrigin: process.env.CORS_ORIGIN || "*",
    logLevel: process.env.LOG_LEVEL || "INFO",
    requestLogging: process.env.LOG_REQUESTS !== "false",
    responseLogging: process.env.LOG_RESPONSES !== "false",
    bodyLogging: process.env.LOG_BODIES === "true",
  });

  console.log("");
  console.log("═══════════════════════════════════════════════════════════");
  console.log("           MCP Webhook Server (HTTP/Stateless)");
  console.log("═══════════════════════════════════════════════════════════");
  console.log("");
  console.log("Configuration:");
  console.log(`  Host: ${CONFIG.HOST}:${CONFIG.PORT}`);
  console.log(`  Authentication: ${CONFIG.AUTH_ENABLED ? "ENABLED (API Key)" : "DISABLED"}`);
  if (CONFIG.AUTH_ENABLED) {
    console.log(`  Configured API keys: ${CONFIG.API_KEYS.length}`);
  }
  console.log(`  CORS Origin: ${process.env.CORS_ORIGIN || "*"}`);
  console.log(`  Log Level: ${process.env.LOG_LEVEL || "INFO"}`);
  console.log(`  Request Logging: ${process.env.LOG_REQUESTS !== "false" ? "Enabled" : "Disabled"}`);
  console.log(`  Response Logging: ${process.env.LOG_RESPONSES !== "false" ? "Enabled" : "Disabled"}`);
  console.log(`  Body Logging: ${process.env.LOG_BODIES === "true" ? "Enabled" : "Disabled"}`);
  console.log("");
  console.log("Available tools: 4");
  console.log("  • webhook_post");
  console.log("  • webhook_get");
  console.log("  • webhook_put");
  console.log("  • webhook_delete");
  console.log("");
  console.log("═══════════════════════════════════════════════════════════");
  console.log("");

  app.listen(CONFIG.PORT, CONFIG.HOST, () => {
    defaultLogger.info("Server listening", {
      host: CONFIG.HOST,
      port: CONFIG.PORT,
      endpoints: ["/mcp", "/health", "/"],
    });

    console.log(`Server ready on http://${CONFIG.HOST}:${CONFIG.PORT}`);
    console.log("");
    console.log("Endpoints:");
    console.log(`  • MCP: http://${CONFIG.HOST}:${CONFIG.PORT}/mcp`);
    console.log(`  • Health: http://${CONFIG.HOST}:${CONFIG.PORT}/health`);
    console.log(`  • Info: http://${CONFIG.HOST}:${CONFIG.PORT}/`);
    console.log("");
    console.log("═══════════════════════════════════════════════════════════");
    console.log("");
  });
}

// Graceful shutdown
process.on("SIGINT", async () => {
  defaultLogger.info("Received SIGINT, shutting down gracefully");
  console.log("\nShutting down server...");
  process.exit(0);
});

process.on("SIGTERM", async () => {
  defaultLogger.info("Received SIGTERM, shutting down gracefully");
  console.log("\nShutting down server...");
  process.exit(0);
});

main().catch((error) => {
  defaultLogger.error("Server startup failed", error);
  process.exit(1);
});
