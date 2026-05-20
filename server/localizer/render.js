// Typesetter v2. Geometry comes from the CV bubble detector; the LLM only tells
// us the text + type + reading order. Each dialogue line is snapped onto its real
// bubble, the bubble interior is erased, and English is centered + auto-sized.
import sharp from "sharp";
import { detectBubbles } from "./detect.js";

function escapeXml(s) {
  return s
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function wrapToWidth(text, fontSize, innerW) {
  const maxChars = Math.max(1, Math.floor(innerW / (fontSize * 0.52)));
  const words = text.replace(/\n/g, " ").split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length <= maxChars || !line) line = candidate;
    else { lines.push(line); line = word; }
  }
  if (line) lines.push(line);
  return lines;
}

// Largest font size that fits. Ellipses expose less usable area than rectangles.
function fitText(text, boxW, boxH, shape) {
  const f = shape === "ellipse" ? 0.7 : 0.86;
  const innerW = boxW * f, innerH = boxH * f;
  const start = Math.min(54, Math.max(11, Math.floor(boxH * 0.42)));
  for (let fs = start; fs >= 9; fs--) {
    const lines = wrapToWidth(text, fs, innerW);
    const lineH = fs * 1.18;
    const longest = Math.max(...lines.map((l) => l.length));
    if (longest * fs * 0.52 <= innerW && lines.length * lineH <= innerH) return { fontSize: fs, lines, lineH };
  }
  const fs = 9;
  return { fontSize: fs, lines: wrapToWidth(text, fs, innerW), lineH: fs * 1.18 };
}

// overlap area as a fraction of the smaller rect (used to match a line to a bubble)
function overlapFrac(a, b) {
  const x1 = Math.max(a.x, b.x), y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.w, b.x + b.w), y2 = Math.min(a.y + a.h, b.y + b.h);
  const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  return inter / Math.min(a.w * a.h, b.w * b.h);
}

function eraseSvg(box, shape) {
  if (shape === "ellipse") {
    const cx = box.x + box.w / 2, cy = box.y + box.h / 2;
    return `<ellipse cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" rx="${(box.w / 2).toFixed(1)}" ry="${(box.h / 2).toFixed(1)}" fill="white"/>`;
  }
  return `<rect x="${box.x.toFixed(1)}" y="${box.y.toFixed(1)}" width="${box.w.toFixed(1)}" height="${box.h.toFixed(1)}" fill="white"/>`;
}

function textSvg(region, box, shape) {
  if (!region.translation) return "";
  const { fontSize, lines, lineH } = fitText(region.translation, box.w, box.h, shape);
  const cx = box.x + box.w / 2;
  const startY = box.y + box.h / 2 - ((lines.length - 1) * lineH) / 2;
  const weight = region.type === "narration" ? "500" : "650";
  const italic = region.type === "thought" ? `font-style="italic"` : "";
  const tspans = lines
    .map((l, i) => `<tspan x="${cx.toFixed(1)}" y="${(startY + i * lineH).toFixed(1)}">${escapeXml(l)}</tspan>`)
    .join("");
  return `<text text-anchor="middle" dominant-baseline="middle" font-family="Arial, 'Comic Sans MS', sans-serif" font-size="${fontSize}" font-weight="${weight}" ${italic} fill="black">${tspans}</text>`;
}

// SFX never gets a fill — keep the art, lay onomatopoeia over it with a white halo.
function sfxSvg(region, box) {
  if (!region.translation) return "";
  const fs = Math.max(20, Math.min(64, box.h * 0.7));
  const cx = box.x + box.w / 2, cy = box.y + box.h / 2;
  return `<text x="${cx.toFixed(1)}" y="${cy.toFixed(1)}" text-anchor="middle" dominant-baseline="middle" font-family="Arial Black, Arial, sans-serif" font-size="${fs.toFixed(0)}" font-weight="900" fill="black" stroke="white" stroke-width="${(fs * 0.16).toFixed(1)}" paint-order="stroke">${escapeXml(region.translation)}</text>`;
}

function llmBox(region, W, H) {
  const [ymin, xmin, ymax, xmax] = region.bbox;
  return { x: (xmin / 1000) * W, y: (ymin / 1000) * H, w: ((xmax - xmin) / 1000) * W, h: ((ymax - ymin) / 1000) * H };
}

export async function renderPage(inputBuffer, regions) {
  const img = sharp(inputBuffer);
  const { width: W, height: H } = await img.metadata();
  const bubbles = await detectBubbles(inputBuffer);
  const used = new Set();
  const parts = [];

  for (const region of regions) {
    const guess = llmBox(region, W, H);
    if (guess.w < 4 || guess.h < 4) continue;

    if (region.type === "sfx") {
      parts.push(sfxSvg(region, guess)); // no detection, no erase
      continue;
    }

    // Snap to the best-overlapping detected bubble; fall back to the LLM box.
    let best = null, bestScore = 0.15;
    bubbles.forEach((b, i) => {
      if (used.has(i)) return;
      const s = overlapFrac(guess, b);
      if (s > bestScore) { bestScore = s; best = { b, i }; }
    });

    const box = best ? best.b : guess;
    const shape = best ? best.b.shape : "rect";
    if (best) used.add(best.i);

    parts.push(eraseSvg(box, shape));
    parts.push(textSvg(region, box, shape));
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${parts.join("")}</svg>`;
  return img.composite([{ input: Buffer.from(svg), top: 0, left: 0 }]).png().toBuffer();
}
