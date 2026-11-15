/** A single long-lived Chromium, reused across requests. */
import { readFileSync } from "node:fs";
import { chromium, type Browser } from "playwright";
import { config } from "./config.js";

let browserPromise: Promise<Browser> | null = null;

export function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    browserPromise = chromium.launch({ channel: config.browserChannel });
  }
  return browserPromise;
}

export async function closeBrowser(): Promise<void> {
  if (browserPromise) {
    const b = await browserPromise;
    await b.close();
    browserPromise = null;
  }
}

/** The core IIFE source, read once. */
export const coreIife: string = readFileSync(config.coreIifePath, "utf8");
