// The localization brain. This is where "native tone" lives — the technically
// easy step that is the actual product differentiator.

export const TARGET_LANGUAGES = {
  en: "English",
  fil: "Filipino (Tagalog)",
  es: "Spanish",
  fr: "French",
};

/**
 * Build the system instruction for the vision model. We ask it to do
 * detection + OCR + localization in a single pass and return strict JSON
 * with normalized bounding boxes so we can typeset the result back.
 *
 * @param {object} opts
 * @param {string} opts.targetLang  key from TARGET_LANGUAGES
 * @param {Record<string,string>} [opts.glossary]  source term -> fixed translation
 * @param {Record<string,string>} [opts.voices]    character name -> speech-style note
 */
export function buildPrompt({ targetLang = "en", glossary = {}, voices = {} }) {
  const langName = TARGET_LANGUAGES[targetLang] || targetLang;

  const glossaryBlock = Object.keys(glossary).length
    ? `\nGLOSSARY (translate these consistently, every time):\n` +
      Object.entries(glossary)
        .map(([k, v]) => `  - "${k}" -> "${v}"`)
        .join("\n")
    : "";

  const voiceBlock = Object.keys(voices).length
    ? `\nCHARACTER VOICES (match each character's speech style):\n` +
      Object.entries(voices)
        .map(([k, v]) => `  - ${k}: ${v}`)
        .join("\n")
    : "";

  return `You are a senior manga/manhwa localization editor, not a literal translator.
Your job: read a single comic page image and produce a publication-quality ${langName} localization.

WORK IN ONE PASS:
1. Find every region containing text: speech bubbles, thought bubbles, narration boxes, and sound effects (SFX).
2. Read the original text exactly (handle vertical Japanese and stacked Korean).
3. Localize it the way an official ${langName} release would read — natural, in-character, emotionally true. NOT word-for-word.

LOCALIZATION RULES:
- Sound like a real ${langName} release, never like machine translation.
- Preserve emotional tone and subtext over literal wording.
- Keep lines short enough to fit inside the original bubble.
- Adapt slang, idioms, and jokes to land naturally in ${langName}.
- Keep character personality consistent across bubbles on the page.
- For SFX, give a natural ${langName} onomatopoeia (e.g. ドキドキ -> "thump thump"), and set type to "sfx".
- Reading order: right-to-left, top-to-bottom for manga; left-to-right for manhwa/webtoon.${glossaryBlock}${voiceBlock}

OUTPUT — return ONLY valid JSON, no markdown fences, this exact shape:
{
  "reading_direction": "rtl" | "ltr",
  "regions": [
    {
      "bbox": [ymin, xmin, ymax, xmax],   // integers 0-1000, normalized to image size
      "type": "speech" | "thought" | "narration" | "sfx",
      "original": "the source text exactly as written",
      "translation": "the localized ${langName} line",
      "voice_note": "short reason for any non-literal choice, or \\"\\" if literal"
    }
  ]
}
Order regions in natural reading order. If a region has no readable text, omit it.`;
}
