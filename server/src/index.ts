/** Bootstrap: launch the browser, start the HTTP server, shut down cleanly. */
import { config } from "./config.js";
import { createApp } from "./http.js";
import { getBrowser, closeBrowser } from "./browser.js";

async function main() {
  if (!config.apiKey) {
    console.warn("[hiddenink] WARNING: HIDDENINK_API_KEY is empty — /api is UNAUTHENTICATED (dev only).");
  }
  await getBrowser(); // warm the browser so the first request is fast
  const app = createApp();
  await app.listen({ port: config.port, host: "0.0.0.0" });

  const shutdown = async () => {
    await app.close();
    await closeBrowser();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
