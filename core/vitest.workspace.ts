import { defineWorkspace } from "vitest/config";

// Two test projects:
//  - unit:    pure logic (Unicode, scorer, colors) in jsdom, fast
//  - browser: the web engine in real headless Chromium, because it needs real layout
//             (bounding rects, computed styles) that jsdom doesn't implement
export default defineWorkspace([
  {
    extends: "./vite.config.ts",
    test: { name: "unit", environment: "jsdom", include: ["test/**/*.test.ts"], exclude: ["test/browser/**"] },
  },
  {
    extends: "./vite.config.ts",
    test: {
      name: "browser",
      include: ["test/browser/**/*.test.ts"],
      browser: {
        enabled: true,
        provider: "playwright",
        name: "chromium",
        headless: true,
        // Uses the installed Google Chrome (no Playwright browser download needed).
        // Set PW_BUNDLED_CHROMIUM=1 after `pnpm exec playwright install chromium` to use that instead.
        providerOptions: { launch: process.env.PW_BUNDLED_CHROMIUM ? {} : { channel: "chrome" } },
      },
    },
  },
]);
