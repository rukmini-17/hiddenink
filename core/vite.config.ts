/// <reference types="vitest" />
import { defineConfig } from "vite";

// Two outputs from one entry:
//  - dist/index.js               ESM, imported by the extension via the workspace
//  - dist/hiddenink-core.iife.js  self-contained bundle exposing window.HiddenInk,
//                                 injected into pages by the eval runner (and Stage 2 server)
export default defineConfig({
  build: {
    lib: {
      entry: "src/index.ts",
      name: "HiddenInk",
      formats: ["es", "iife"],
      fileName: (format) => (format === "iife" ? "hiddenink-core.iife.js" : "index.js"),
    },
    sourcemap: true,
    emptyOutDir: true,
  },
  test: {
    environment: "jsdom",
    include: ["test/**/*.test.ts"],
  },
});
