#!/usr/bin/env node

import { config } from "dotenv";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

config();

const SERVER_AUTH_ENABLED = process.env.MCP_AUTH_ENABLED === "true";
const SERVER_AUTH_TYPE = process.env.MCP_AUTH_TYPE || "api_key";
const SERVER_API_KEYS = process.env.MCP_API_KEYS?.split(",").map(k => k.trim()) || [];
const SERVER_USERNAME = process.env.MCP_USERNAME;
const SERVER_PASSWORD = process.env.MCP_PASSWORD;

function validateServerAuth(auth) {
  if (!SERVER_AUTH_ENABLED) {
    return { valid: true };
  }

  if (!auth) {
    return { valid: false, error: "Authentication required but not provided" };
  }

  if (SERVER_AUTH_TYPE === "api_key") {
    if (!auth.api_key) {
      return { valid: false, error: "API key authentication required" };
    }
    if (!SERVER_API_KEYS.includes(auth.api_key)) {
      return { valid: false, error: "Invalid API key" };
    }
    return { valid: true };
  }

  if (SERVER_AUTH_TYPE === "basic") {
    if (!auth.username || !auth.password) {
      return { valid: false, error: "Username and password required" };
    }
    if (auth.username !== SERVER_USERNAME || auth.password !== SERVER_PASSWORD) {
      return { valid: false, error: "Invalid credentials" };
    }
    return { valid: true };
  }

  return { valid: false, error: "Invalid authentication type" };
}

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

const webhookAuthSchema = {
  basic_auth: {
    type: "object",
    description: "Basic authentication credentials for the webhook endpoint",
    properties: {
      username: {
        type: "string",
        description: "Username for basic auth",
      },
      password: {
        type: "string",
        description: "Password for basic auth",
      },
    },
    required: ["username", "password"],
  },
  api_key: {
    type: "object",
    description: "API key authentication for the webhook endpoint",
    properties: {
      key: {
        type: "string",
        description: "The API key value",
      },
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

const serverAuthSchema = SERVER_AUTH_ENABLED ? {
  server_auth: {
    type: "object",
    description: "Authentication credentials for the MCP server itself",
    properties: {
      api_key: {
        type: "string",
        description: "API key for server authentication (when using api_key auth type)",
      },
      username: {
        type: "string",
        description: "Username for server authentication (when using basic auth type)",
      },
      password: {
        type: "string",
        description: "Password for server authentication (when using basic auth type)",
      },
    },
  },
} : {};

server.setRequestHandler(ListToolsRequestSchema, async () => {
  const baseProperties = (additionalProps = {}) => ({
    ...additionalProps,
    ...serverAuthSchema,
  });

  return {
    tools: [
      {
        name: "webhook_post",
        description: "Send a POST request to a webhook URL with optional JSON payload, headers, and authentication",
        inputSchema: {
          type: "object",
          properties: baseProperties({
            url: {
              type: "string",
              description: "The webhook URL to call",
            },
            payload: {
              type: "object",
              description: "JSON payload to send in the request body",
            },
            headers: {
              type: "object",
              description: "Custom headers to include in the request",
            },
            basic_auth: webhookAuthSchema.basic_auth,
            api_key: webhookAuthSchema.api_key,
          }),
          required: SERVER_AUTH_ENABLED ? ["url", "server_auth"] : ["url"],
        },
      },
      {
        name: "webhook_get",
        description: "Send a GET request to a webhook URL with optional query parameters, headers, and authentication",
        inputSchema: {
          type: "object",
          properties: baseProperties({
            url: {
              type: "string",
              description: "The webhook URL to call",
            },
            params: {
              type: "object",
              description: "Query parameters to append to the URL",
            },
            headers: {
              type: "object",
              description: "Custom headers to include in the request",
            },
            basic_auth: webhookAuthSchema.basic_auth,
            api_key: webhookAuthSchema.api_key,
          }),
          required: SERVER_AUTH_ENABLED ? ["url", "server_auth"] : ["url"],
        },
      },
      {
        name: "webhook_put",
        description: "Send a PUT request to a webhook URL with optional JSON payload, headers, and authentication",
        inputSchema: {
          type: "object",
          properties: baseProperties({
            url: {
              type: "string",
              description: "The webhook URL to call",
            },
            payload: {
              type: "object",
              description: "JSON payload to send in the request body",
            },
            headers: {
              type: "object",
              description: "Custom headers to include in the request",
            },
            basic_auth: webhookAuthSchema.basic_auth,
            api_key: webhookAuthSchema.api_key,
          }),
          required: SERVER_AUTH_ENABLED ? ["url", "server_auth"] : ["url"],
        },
      },
      {
        name: "webhook_delete",
        description: "Send a DELETE request to a webhook URL with optional headers and authentication",
        inputSchema: {
          type: "object",
          properties: baseProperties({
            url: {
              type: "string",
              description: "The webhook URL to call",
            },
            headers: {
              type: "object",
              description: "Custom headers to include in the request",
            },
            basic_auth: webhookAuthSchema.basic_auth,
            api_key: webhookAuthSchema.api_key,
          }),
          required: SERVER_AUTH_ENABLED ? ["url", "server_auth"] : ["url"],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  const authResult = validateServerAuth(args.server_auth);
  if (!authResult.valid) {
    return {
      content: [
        {
          type: "text",
          text: `Authentication failed: ${authResult.error}`,
        },
      ],
      isError: true,
    };
  }

  try {
    switch (name) {
      case "webhook_post":
        return await handleWebhookRequest("POST", args);
      case "webhook_get":
        return await handleWebhookRequest("GET", args);
      case "webhook_put":
        return await handleWebhookRequest("PUT", args);
      case "webhook_delete":
        return await handleWebhookRequest("DELETE", args);
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

async function handleWebhookRequest(method, args) {
  const { url, payload, params, headers = {}, basic_auth, api_key } = args;

  const urlObj = new URL(url);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      urlObj.searchParams.append(key, value);
    });
  }

  if (api_key && api_key.location === "query") {
    const paramName = api_key.name || "api_key";
    urlObj.searchParams.append(paramName, api_key.key);
  }

  const requestHeaders = {
    "Content-Type": "application/json",
    ...headers,
  };

  if (basic_auth) {
    const credentials = `${basic_auth.username}:${basic_auth.password}`;
    const encoded = Buffer.from(credentials).toString("base64");
    requestHeaders["Authorization"] = `Basic ${encoded}`;
  }

  if (api_key && api_key.location === "header") {
    const headerName = api_key.name || "X-API-Key";
    requestHeaders[headerName] = api_key.key;
  }

  const options = {
    method,
    headers: requestHeaders,
  };

  if (payload && (method === "POST" || method === "PUT")) {
    options.body = JSON.stringify(payload);
  }

  const response = await fetch(urlObj.toString(), options);
  const responseText = await response.text();

  let responseData;
  try {
    responseData = JSON.parse(responseText);
  } catch {
    responseData = responseText;
  }

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
}

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error("MCP Webhook Server running on stdio");
  if (SERVER_AUTH_ENABLED) {
    console.error(`Server authentication: ENABLED (type: ${SERVER_AUTH_TYPE})`);
  } else {
    console.error("Server authentication: DISABLED");
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
