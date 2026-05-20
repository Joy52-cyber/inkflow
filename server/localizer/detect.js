// CV bubble detector. Speech bubbles are the near-pure-white regions of a page;
// art and toned panels are not. We find connected white blobs and keep the ones
// shaped like bubbles. This gives ACCURATE geometry — the LLM only supplies text.
import sharp from "sharp";

const WHITE = 250;       // near-pure-white only (bubbles), excludes toned panels
const MAX_DETECT_W = 720; // downscale for speed; bboxes are scaled back up

/**
 * @returns {Promise<Array<{x,y,w,h,fillRatio,shape:"ellipse"|"rect"}>>} in original-image pixels
 */
export async function detectBubbles(buffer) {
  const meta = await sharp(buffer).metadata();
  const W0 = meta.width, H0 = meta.height;
  const scale = Math.min(1, MAX_DETECT_W / W0);
  const w = Math.max(1, Math.round(W0 * scale));
  const h = Math.max(1, Math.round(H0 * scale));

  const { data } = await sharp(buffer).resize(w, h).grayscale().raw().toBuffer({ resolveWithObject: true });

  const labels = new Int32Array(w * h);
  const stack = [];
  const blobs = [];
  let label = 0;

  for (let i = 0; i < w * h; i++) {
    if (labels[i] !== 0 || data[i] < WHITE) continue;
    label++;
    let minx = w, miny = h, maxx = 0, maxy = 0, count = 0;
    stack.push(i);
    labels[i] = label;
    while (stack.length) {
      const p = stack.pop();
      const x = p % w, y = (p / w) | 0;
      count++;
      if (x < minx) minx = x;
      if (x > maxx) maxx = x;
      if (y < miny) miny = y;
      if (y > maxy) maxy = y;
      if (x > 0)     { const q = p - 1; if (labels[q] === 0 && data[q] >= WHITE) { labels[q] = label; stack.push(q); } }
      if (x < w - 1) { const q = p + 1; if (labels[q] === 0 && data[q] >= WHITE) { labels[q] = label; stack.push(q); } }
      if (y > 0)     { const q = p - w; if (labels[q] === 0 && data[q] >= WHITE) { labels[q] = label; stack.push(q); } }
      if (y < h - 1) { const q = p + w; if (labels[q] === 0 && data[q] >= WHITE) { labels[q] = label; stack.push(q); } }
    }
    const bw = maxx - minx + 1, bh = maxy - miny + 1;
    blobs.push({ minx, miny, bw, bh, fillRatio: count / (bw * bh), areaFrac: count / (w * h) });
  }

  const kept = blobs.filter(
    (b) =>
      b.areaFrac > 0.004 && b.areaFrac < 0.45 && // not a speck, not the whole page
      b.fillRatio > 0.45 &&                       // compact (bubble-like, not stringy art)
      b.bw > 22 && b.bh > 16 &&
      !(b.bw >= w - 2 && b.bh >= h - 2)
  );

  return kept.map((b) => ({
    x: b.minx / scale,
    y: b.miny / scale,
    w: b.bw / scale,
    h: b.bh / scale,
    fillRatio: b.fillRatio,
    shape: b.fillRatio > 0.82 ? "rect" : "ellipse",
  }));
}
