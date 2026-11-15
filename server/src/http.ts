/** Fastify app: /health, /api/safe-fetch (Bearer auth), and the MCP endpoint at /mcp. */
import Fastify, { type FastifyInstance } from "fastify";
import { config } from "./config.js";
import { safeFetch } from "./safeFetch.js";
import { checkAction, type CheckRequest } from "./checkAction.js";
import { handleMcpRequest } from "./mcp.js";

export function createApp(): FastifyInstance {
  const app = Fastify({ logger: true });

  // Bearer auth for everything except /health. Empty key = dev mode (warned at startup).
  app.addHook("onRequest", async (req, reply) => {
    const path = req.url.split("?")[0];
    if (path === "/health") return;
    if (!config.apiKey) return;
    if (req.headers.authorization !== `Bearer ${config.apiKey}`) {
      await reply.code(401).send({ error: "unauthorized" });
    }
  });

  app.get("/health", async () => ({ ok: true }));

  app.post("/api/safe-fetch", async (req, reply) => {
    const url = (req.body as { url?: unknown } | undefined)?.url;
    if (typeof url !== "string" || !url) {
      return reply.code(400).send({ error: "body must be { url: string }" });
    }
    try {
      return await safeFetch(url);
    } catch (err) {
      req.log.error({ err }, "safe-fetch failed");
      return reply.code(502).send({ error: `could not fetch ${url}` });
    }
  });

  app.post("/api/check-action", async (req, reply) => {
    const body = req.body as Partial<CheckRequest> | undefined;
    if (!body || typeof body.tool !== "string" || typeof body.input !== "object" || !body.input) {
      return reply.code(400).send({ error: "body must be { tool: string, input: object }" });
    }
    try {
      return await checkAction({ tool: body.tool, input: body.input });
    } catch (err) {
      req.log.error({ err }, "check-action failed");
      // Fail open: a checker error must not block the agent.
      return { allow: true, reason: "check-action error; allowed" };
    }
  });

  // MCP Streamable HTTP. Hand the raw Node req/res to the SDK transport.
  for (const method of ["POST", "GET", "DELETE"] as const) {
    app.route({
      method,
      url: "/mcp",
      handler: async (req, reply) => {
        reply.hijack();
        await handleMcpRequest(req.raw, reply.raw, req.body);
      },
    });
  }

  return app;
}
