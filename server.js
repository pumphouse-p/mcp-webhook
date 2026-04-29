#!/usr/bin/env node

import { config } from "dotenv";
import http from "http";

config();

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || "0.0.0.0";
const SERVER_AUTH_ENABLED = process.env.MCP_AUTH_ENABLED === "true";
const SERVER_AUTH_TYPE = process.env.MCP_AUTH_TYPE || "api_key";
const SERVER_API_KEYS = process.env.MCP_API_KEYS?.split(",").map(k => k.trim()) || [];
const SERVER_USERNAME = process.env.MCP_USERNAME;
const SERVER_PASSWORD = process.env.MCP_PASSWORD;

function validateHttpAuth(req) {
  if (!SERVER_AUTH_ENABLED) {
    return { valid: true };
  }

  const authHeader = req.headers.authorization;

  if (SERVER_AUTH_TYPE === "api_key") {
    const apiKey = authHeader?.replace(/^Bearer\s+/i, "");
    if (!apiKey || !SERVER_API_KEYS.includes(apiKey)) {
      return { valid: false, error: "Invalid or missing API key" };
    }
    return { valid: true };
  }

  if (SERVER_AUTH_TYPE === "basic") {
    if (!authHeader?.startsWith("Basic ")) {
      return { valid: false, error: "Basic authentication required" };
    }
    const credentials = Buffer.from(authHeader.slice(6), "base64").toString();
    const [username, password] = credentials.split(":");
    if (username !== SERVER_USERNAME || password !== SERVER_PASSWORD) {
      return { valid: false, error: "Invalid credentials" };
    }
    return { valid: true };
  }

  return { valid: false, error: "Invalid authentication type" };
}

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
    status: response.status,
    statusText: response.statusText,
    headers: Object.fromEntries(response.headers.entries()),
    body: responseData,
  };
}

async function handleRestRequest(req, res, method) {
  const authResult = validateHttpAuth(req);
  if (!authResult.valid) {
    res.writeHead(401, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: authResult.error }));
    return;
  }

  let body = "";
  req.on("data", (chunk) => {
    body += chunk.toString();
  });

  req.on("end", async () => {
    try {
      const data = body ? JSON.parse(body) : {};
      const result = await handleWebhookRequest(method, data);

      res.writeHead(result.status >= 200 && result.status < 300 ? 200 : 500, {
        "Content-Type": "application/json",
      });
      res.end(JSON.stringify(result, null, 2));
    } catch (error) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: error.message }));
    }
  });
}

const httpServer = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "healthy", mode: "http" }));
    return;
  }

  if (req.url === "/" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      name: "MCP Webhook Server",
      version: "1.0.0",
      endpoints: {
        rest: {
          post: "/api/webhook/post",
          get: "/api/webhook/get",
          put: "/api/webhook/put",
          delete: "/api/webhook/delete",
        },
        health: "/health",
      },
      authentication: SERVER_AUTH_ENABLED ? SERVER_AUTH_TYPE : "disabled",
    }));
    return;
  }

  if (req.url === "/api/webhook/post" && req.method === "POST") {
    await handleRestRequest(req, res, "POST");
    return;
  }

  if (req.url === "/api/webhook/get" && req.method === "POST") {
    await handleRestRequest(req, res, "GET");
    return;
  }

  if (req.url === "/api/webhook/put" && req.method === "POST") {
    await handleRestRequest(req, res, "PUT");
    return;
  }

  if (req.url === "/api/webhook/delete" && req.method === "POST") {
    await handleRestRequest(req, res, "DELETE");
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
});

httpServer.listen(PORT, HOST, () => {
  console.error(`MCP Webhook Server running on http://${HOST}:${PORT}`);
  console.error(`Mode: HTTP/REST API`);
  console.error(`Authentication: ${SERVER_AUTH_ENABLED ? `ENABLED (${SERVER_AUTH_TYPE})` : "DISABLED"}`);
  console.error(`Endpoints:`);
  console.error(`  REST API: http://${HOST}:${PORT}/api/webhook/{post,get,put,delete}`);
  console.error(`  Health: http://${HOST}:${PORT}/health`);
  console.error(`  Info: http://${HOST}:${PORT}/`);
});
