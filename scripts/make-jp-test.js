// A more realistic raw Japanese page for testing: panels are toned (not white),
// so the white speech bubbles are isolated islands — like real manga.
import sharp from "sharp";
import { mkdir } from "node:fs/promises";

const W = 800, H = 1180;
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const FONT = "Yu Gothic, 'MS Gothic', Meiryo, sans-serif";

function bub(cx, cy, rx, ry, lines, fs = 32) {
  const y0 = cy - ((lines.length - 1) * fs * 1.25) / 2;
  const t = lines.map((l, i) => `<tspan x="${cx}" y="${(y0 + i * fs * 1.25).toFixed(0)}">${esc(l)}</tspan>`).join("");
  return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#ffffff" stroke="black" stroke-width="3"/>
    <text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="middle" font-family="${FONT}" font-size="${fs}" fill="black">${t}</text>`;
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <pattern id="tone" width="10" height="10" patternUnits="userSpaceOnUse">
      <rect width="10" height="10" fill="#b9b3a7"/>
      <circle cx="3" cy="3" r="2.2" fill="#8d877b"/>
    </pattern>
  </defs>
  <rect width="${W}" height="${H}" fill="#3a3a3a"/>

  <!-- Panel 1: toned background (gray), white bubbles -->
  <rect x="20" y="20" width="760" height="380" fill="url(#tone)" stroke="black" stroke-width="4"/>
  <circle cx="640" cy="300" r="120" fill="#9a948a"/>
  ${bub(220, 150, 165, 90, ["おはよう！", "元気だった？"])}
  ${bub(560, 320, 175, 80, ["うん、久しぶり！", "会いたかったよ。"], 28)}

  <!-- Panel 2: darker tone, narration + SFX -->
  <rect x="20" y="415" width="760" height="370" fill="#6f6a60" stroke="black" stroke-width="4"/>
  <rect x="70" y="450" width="430" height="80" fill="#ffffff" stroke="black" stroke-width="2"/>
  <text x="90" y="503" font-family="${FONT}" font-size="30" fill="black">その日、すべてが変わった。</text>
  <text x="560" y="690" text-anchor="middle" font-family="${FONT}" font-size="60" font-weight="800" fill="#1a1a1a" transform="rotate(-12 560 690)">ドキッ</text>

  <!-- Panel 3: toned, single bubble -->
  <rect x="20" y="800" width="760" height="360" fill="url(#tone)" stroke="black" stroke-width="4"/>
  <circle cx="180" cy="1080" r="110" fill="#9a948a"/>
  ${bub(440, 980, 210, 105, ["仕方ないなあ…", "手伝ってあげる！"], 30)}
</svg>`;

await mkdir("input-samples", { recursive: true });
await sharp(Buffer.from(svg)).png().toFile("input-samples/jp-test.png");
console.log("Wrote input-samples/jp-test.png");
