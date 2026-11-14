import { defineConfig } from "wxt";

// HiddenInk Chrome extension (Manifest V3), built with WXT + React + Tailwind.
export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  manifest: {
    name: "HiddenInk",
    description:
      "Shows you the text hidden in web pages and PDFs that only an AI would read, and stops it before you paste or upload it.",
    permissions: [
      "storage", // settings (serverUrl, test mode)
      "offscreen", // PDF scanning + preview rendering happen in an offscreen document
      "activeTab", // popup talks to the current tab
    ],
    action: { default_title: "HiddenInk" },
  },
});
