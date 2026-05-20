// Generates placeholder English manga pages per genre into /public/pages/<set>.
// Stand-in for real licensed/creator content. Run: npm run gen
import sharp from "sharp";
import { mkdir } from "node:fs/promises";

const W = 760, H = 1100;
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function bubble(cx, cy, rx, ry, lines, { fs = 26, italic = false } = {}) {
  const startY = cy - ((lines.length - 1) * fs * 1.25) / 2;
  const tspans = lines
    .map((l, i) => `<tspan x="${cx}" y="${(startY + i * fs * 1.25).toFixed(0)}">${esc(l)}</tspan>`)
    .join("");
  return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="white" stroke="black" stroke-width="3"/>
    <text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="middle" font-family="Arial, sans-serif"
      font-size="${fs}" font-weight="600" ${italic ? 'font-style="italic"' : ""} fill="black">${tspans}</text>`;
}

function sfx(x, y, text, rot, color = "#111") {
  return `<text x="${x}" y="${y}" text-anchor="middle" font-family="Arial Black, Arial, sans-serif"
    font-size="72" font-weight="900" fill="${color}" stroke="white" stroke-width="4" paint-order="stroke"
    transform="rotate(${rot} ${x} ${y})">${esc(text)}</text>`;
}

function panel(x, y, w, h, bg) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${bg}" stroke="black" stroke-width="4"/>`;
}

// Each set: array of pages; each page = array of svg-fragment builders.
const SETS = {
  cooking: [
    () => [
      panel(20, 20, 720, 520, "#fff7ed"),
      panel(20, 555, 720, 525, "#fffbeb"),
      bubble(220, 150, 175, 95, ["The broth...", "it's not ready yet."]),
      sfx(560, 360, "SIZZLE", -8, "#ea580c"),
      bubble(540, 760, 185, 95, ["One more bowl", "before midnight!"]),
    ],
    () => [
      panel(20, 20, 720, 340, "#fffbeb"),
      panel(20, 375, 720, 340, "#fff7ed"),
      panel(20, 730, 720, 350, "#fffbeb"),
      bubble(230, 130, 180, 80, ["Taste it.", "Don't be shy."]),
      bubble(530, 500, 180, 90, ["...This is", "my father's recipe."]),
      sfx(380, 900, "SLURP", 6, "#d97706"),
    ],
    () => [
      panel(20, 20, 720, 1060, "#fff7ed"),
      bubble(380, 180, 250, 110, ["A line out the door,", "in the rain.", "Word's getting around."], { fs: 24 }),
      sfx(220, 620, "BUBBLE", -12, "#f59e0b"),
      bubble(500, 880, 200, 95, ["Then we'd better", "not run out."]),
    ],
    () => [
      panel(20, 20, 720, 520, "#fffbeb"),
      panel(20, 555, 720, 525, "#fff7ed"),
      bubble(380, 230, 230, 120, ["So you're the new", "owner of this stall.", "Interesting."], { fs: 24 }),
      bubble(380, 800, 240, 110, ["Let's see if your", "ramen can beat mine."]),
    ],
  ],
  action: [
    () => [
      panel(20, 20, 720, 700, "#0f172a"),
      panel(20, 735, 720, 345, "#111827"),
      bubble(230, 150, 185, 90, ["Where is he?", "The warlord."]),
      sfx(520, 420, "CLANG", -10, "#22d3ee"),
      bubble(500, 870, 195, 95, ["Cross the breakwater.", "He won't follow."]),
    ],
    () => [
      panel(20, 20, 720, 340, "#111827"),
      panel(20, 375, 720, 705, "#0f172a"),
      bubble(230, 140, 180, 80, ["Draw your blade."]),
      sfx(400, 640, "SLASH", 8, "#06b6d4"),
      bubble(540, 920, 175, 90, ["Too slow.", "You're already done."]),
    ],
    () => [
      panel(20, 20, 720, 1060, "#0b1220"),
      sfx(380, 320, "BOOM", -6, "#8b5cf6"),
      bubble(380, 620, 250, 120, ["The tide's coming in.", "Fight, or drown", "with the rest of them."], { fs: 23 }),
      sfx(560, 900, "CRASH", 12, "#22d3ee"),
    ],
    () => [
      panel(20, 20, 720, 520, "#0f172a"),
      panel(20, 555, 720, 525, "#111827"),
      bubble(380, 230, 230, 110, ["I sank with my clan.", "I climbed back up", "for one reason."], { fs: 23, italic: true }),
      bubble(380, 800, 240, 110, ["To put you under", "the same waves."]),
    ],
  ],
};

async function build() {
  for (const [set, pages] of Object.entries(SETS)) {
    const dir = `public/pages/${set}`;
    await mkdir(dir, { recursive: true });
    for (let i = 0; i < pages.length; i++) {
      const frags = pages[i]().join("\n  ");
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <rect width="${W}" height="${H}" fill="#e7e5e4"/>
  ${frags}
</svg>`;
      await sharp(Buffer.from(svg)).png().toFile(`${dir}/p${i + 1}.png`);
    }
    console.log(`✓ ${set}: ${pages.length} pages`);
  }
}
build();
