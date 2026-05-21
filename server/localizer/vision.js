// Pluggable vision backend. Both providers do detect + OCR + localize in one
// multimodal call and return the JSON contract defined in prompt.js.

import { GoogleGenerativeAI } from "@google/generative-ai";
import Anthropic from "@anthropic-ai/sdk";
import { buildPrompt } from "./prompt.js";

const GEMINI_MODEL = "gemini-2.5-flash";
const CLAUDE_MODEL = "claude-sonnet-4-6";

function stripFences(text) {
  // Models sometimes wrap JSON in ```json fences despite instructions.
  const m = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return (m ? m[1] : text).trim();
}

function parseRegions(raw) {
  let data;
  try {
    data = JSON.parse(stripFences(raw));
  } catch (e) {
    throw new Error(`Model did not return valid JSON.\n--- raw output ---\n${raw}`);
  }
  if (!Array.isArray(data.regions)) {
    throw new Error(`JSON missing "regions" array.\n${JSON.stringify(data)}`);
  }
  return data;
}

async function viaGemini({ base64, mimeType, promptOpts }) {
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY (or GOOGLE_API_KEY) not set");
  const genAI = new GoogleGenerativeAI(key);
  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    systemInstruction: buildPrompt(promptOpts),
    generationConfig: { responseMimeType: "application/json", temperature: 0.4 },
  });
  const res = await model.generateContent([
    { inlineData: { data: base64, mimeType } },
    { text: "Localize this page. Return only the JSON object." },
  ]);
  return parseRegions(res.response.text());
}

async function viaClaude({ base64, mimeType, promptOpts }) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY not set in .env");
  const anthropic = new Anthropic({ apiKey: key });
  const res = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 4096,
    system: buildPrompt(promptOpts),
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mimeType, data: base64 } },
          { type: "text", text: "Localize this page. Return only the JSON object." },
        ],
      },
    ],
  });
  const text = res.content.map((b) => (b.type === "text" ? b.text : "")).join("");
  return parseRegions(text);
}

/**
 * @param {object} opts
 * @param {"gemini"|"claude"} opts.model
 * @param {string} opts.base64
 * @param {string} opts.mimeType
 * @param {object} opts.promptOpts  passed to buildPrompt
 * @returns {Promise<{reading_direction?: string, regions: Array}>}
 */
export async function localizePage(opts) {
  return opts.model === "claude" ? viaClaude(opts) : viaGemini(opts);
}

export { GEMINI_MODEL, CLAUDE_MODEL };
