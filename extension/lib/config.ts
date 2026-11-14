// Tunables and constants shared by every part of the extension.

/** Sites where the paste guard and upload guard are active. */
export const CHATBOT_MATCHES = [
  "*://chatgpt.com/*",
  "*://chat.openai.com/*",
  "*://gemini.google.com/*",
  "*://claude.ai/*",
];

/**
 * N0 switch. If re-sending a file to the site turns out to be unreliable, flip this to false:
 * the upload guard then only offers "Cancel + show findings" (no "Upload anyway / clean").
 */
export const UPLOAD_REPLAY_SUPPORTED = true;

/** PDFs larger than this are let through unscanned (keeps the UI responsive). */
export const MAX_PDF_BYTES = 25 * 1024 * 1024;

/** Preview rendering for the upload guard. */
export const PREVIEW_SCALE = 1.5;
export const MAX_PREVIEW_PAGES = 3;

/** In test mode, pastes at least this long get a fake finding so the modal can be exercised. */
export const TEST_MODE_MIN_PASTE_CHARS = 40;

/**
 * X-ray dims the page with `backdrop-filter`. On sites where that misbehaves, list the hostname here
 * to use a plain dark overlay instead (page text is less readable, the revealed text still glows).
 */
export const XRAY_PLAIN_DIM_HOSTS: string[] = [];
