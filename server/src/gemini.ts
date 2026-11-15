/** Thin Gemini wrapper (Layer 2). Gemini has NO tools: it only reads text and returns
 *  either strict JSON (the manifest) or a short plain report (the incident note). */
import { GoogleGenAI } from "@google/genai";
import { config } from "./config.js";

let client: GoogleGenAI | null = null;

export function geminiEnabled(): boolean {
  return !!config.geminiApiKey;
}

function getClient(): GoogleGenAI {
  if (!config.geminiApiKey) throw new Error("GEMINI_API_KEY is not set");
  if (!client) client = new GoogleGenAI({ apiKey: config.geminiApiKey });
  return client;
}

// The SDK create params pass through as snake_case; cast to avoid fighting the types.
function create(params: Record<string, unknown>): Promise<unknown> {
  return (getClient().interactions as unknown as { create(p: unknown): Promise<unknown> }).create({
    model: config.geminiModel,
    ...params,
  });
}

function extractText(interaction: any): string {
  if (typeof interaction?.outputText === "string" && interaction.outputText) return interaction.outputText;
  if (typeof interaction?.output_text === "string" && interaction.output_text) return interaction.output_text;
  const parts: string[] = [];
  for (const s of interaction?.steps ?? []) {
    if (typeof s?.text === "string") parts.push(s.text);
    else if (Array.isArray(s?.content)) for (const c of s.content) if (typeof c?.text === "string") parts.push(c.text);
  }
  return parts.join("");
}

/** One structured-JSON call with a strict schema and no tools. Returns parsed JSON. */
export async function generateJson(systemInstruction: string, input: string, schema: object): Promise<any> {
  const interaction = await create({
    system_instruction: systemInstruction,
    input,
    response_format: { type: "text", mime_type: "application/json", schema },
  });
  return JSON.parse(extractText(interaction));
}

/** One plain-text call with no tools (used for the incident report). */
export async function generateText(systemInstruction: string, input: string): Promise<string> {
  const interaction = await create({ system_instruction: systemInstruction, input });
  return extractText(interaction).trim();
}
