/** MCP server exposing safe_fetch(url) over Streamable HTTP at /mcp (stateless). */
import type { IncomingMessage, ServerResponse } from "node:http";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import { safeFetch } from "./safeFetch.js";

function buildServer(): McpServer {
  const server = new McpServer({ name: "hiddenink", version: "0.1.0" });

  server.registerTool(
    "safe_fetch",
    {
      title: "Safe fetch",
      description:
        "Fetch a web page safely: it is rendered server-side and everything a human cannot " +
        "see (hidden instructions aimed at AI) is removed. Returns a warning then the visible text.",
      inputSchema: { url: z.string() },
    },
    async ({ url }) => {
      const r = await safeFetch(url);
      const text = (r.warning ? r.warning + "\n\n" : "") + r.visibleText;
      return { content: [{ type: "text", text }] };
    },
  );

  return server;
}

/** Handle one JSON-RPC request in stateless mode: fresh server + transport per request. */
export async function handleMcpRequest(
  req: IncomingMessage,
  res: ServerResponse,
  body: unknown,
): Promise<void> {
  const server = buildServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  res.on("close", () => {
    void transport.close();
    void server.close();
  });
  await server.connect(transport);
  await transport.handleRequest(req, res, body);
}
