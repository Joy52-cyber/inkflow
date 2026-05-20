# Inkflow

**AI manga localization and reading platform for indie creators.**

Upload raw Japanese or Korean pages. Inkflow reads the text, localizes it into
natural English, typesets it back into the speech bubbles, and publishes it as a
readable chapter. Not piracy: a tool creators use to translate and publish globally.

## How it works

1. **Detect + OCR + localize** in one multimodal call (Claude / Gemini): finds text
   regions, reads vertical Japanese / Korean, and localizes with publication tone.
2. **Snap to real bubbles** with a CV detector (`server/localizer/detect.js`): the LLM
   owns language, computer vision owns geometry. Each line is placed on the actual
   white speech bubble, the source text is erased, and English is centered + auto-fit.
3. **Preview, then publish**: a localized chapter is saved as a draft; you review the
   result and publish it into the reader.

## Stack

- **Frontend:** Vite + React + React Router + Tailwind v4 (dark, mobile-first reader)
- **Backend:** Express (`server/`), localization pipeline + uploads API
- **Imaging:** sharp (compositing, typesetting, bubble detection)
- **AI:** Anthropic Claude (default) or Google Gemini

## Run locally

```bash
npm install
cp .env.example .env      # fill in ANTHROPIC_API_KEY
npm run gen               # generate sample genre pages
npm run server            # API on :3001
npm run dev               # app on :5174
```

Open http://localhost:5174.

## Features

- Browse by genre (Cooking, Action), genre pages, manga detail, chapter list
- Reader: vertical-scroll + page mode, keyboard nav, continue-reading (localStorage)
- **Localize:** upload JP/KO pages, preview the English result, publish as a chapter

## Roadmap

- **Phase 2 (in progress):** Postgres tables, creator accounts, admin review,
  drafts vs published chapters
- **Phase 3:** search, trending, creator profiles
