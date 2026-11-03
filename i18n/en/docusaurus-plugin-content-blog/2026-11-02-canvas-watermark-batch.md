---
slug: canvas-watermark-batch
title: "Watermarking images on canvas, and batch export without freezing the tab"
authors: [lxhanesser]
tags: [Engineering, Web tools]
date: 2026-11-02T20:00:00+08:00
description: A watermark is more than drawText — position, opacity, outline, and angle all affect legibility, and batch jobs freeze the browser if you are careless. Complete implementation, plus why multi-file downloads get blocked.
---

Adding a watermark sounds like "draw one line of text on the image". In practice three things dominate: **where it goes**, **what if it cannot be read**, and **how to process fifty files without freezing the tab**.

{/* truncate */}

<img src="/img/blog/canvas-watermark/fig1-layout-en.svg" alt="Watermark anchoring grid and batch pipeline: decode, draw, encode, export" width="1000" height="300" loading="lazy" />

## 1. Nine-position anchoring

Compute an anchor in canvas coordinates and let `textAlign` / `textBaseline` do the work — far shorter than a pile of `if`s:

```js
const POSITIONS = {
  'top-left': [0.05, 0.05, 'left', 'top'],
  'top-center': [0.5, 0.05, 'center', 'top'],
  'top-right': [0.95, 0.05, 'right', 'top'],
  'middle-left': [0.05, 0.5, 'left', 'middle'],
  center: [0.5, 0.5, 'center', 'middle'],
  'middle-right': [0.95, 0.5, 'right', 'middle'],
  'bottom-left': [0.05, 0.95, 'left', 'bottom'],
  'bottom-center': [0.5, 0.95, 'center', 'bottom'],
  'bottom-right': [0.95, 0.95, 'right', 'bottom'],
};

export function drawText(ctx, text, {position = 'bottom-right', size = 0.04, color = '#fff', opacity = 0.7} = {}) {
  const [rx, ry, align, baseline] = POSITIONS[position];
  const fontSize = Math.max(10, Math.round(ctx.canvas.width * size));

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  ctx.font = `600 ${fontSize}px system-ui, sans-serif`;
  ctx.fillText(text, ctx.canvas.width * rx, ctx.canvas.height * ry);
  ctx.restore();
}
```

Use a **fraction of the canvas width**, not fixed pixels: the same settings then look right at both 800 px and 4000 px.

## 2. Making it readable

White text on a light photo disappears. Two reliable fixes:

### 2.1 Outline (preferred)

```js
ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
ctx.lineWidth = Math.max(1, fontSize / 14);
ctx.lineJoin = 'round';
ctx.strokeText(text, x, y);
ctx.fillText(text, x, y);
```

Stroke first, then fill — the text survives any background.

### 2.2 Background plate

```js
const padding = fontSize * 0.4;
const metrics = ctx.measureText(text);
const w = metrics.width + padding * 2;
const h = fontSize + padding * 2;
ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
ctx.fillRect(x - w, y - h, w, h); // exact offset depends on alignment
```

A plate covers more of the image; good for extreme contrast, bad for dense screenshots.

## 3. Rotated watermarks

```js
ctx.save();
ctx.globalAlpha = 0.25;
ctx.translate(ctx.canvas.width / 2, ctx.canvas.height / 2);
ctx.rotate((-30 * Math.PI) / 180);
ctx.textAlign = 'center';
ctx.font = `700 ${Math.round(ctx.canvas.width * 0.08)}px system-ui, sans-serif`;
ctx.fillStyle = '#fff';
ctx.fillText('CONFIDENTIAL', 0, 0);
ctx.restore();
```

Louder and more intrusive. Best reserved for "internal preview" style marking.

## 4. Batch processing without blocking the UI

Processing dozens of images with an `await` inside a `for` loop keeps the main thread busy and the page janky.

### 4.1 Limit concurrency

```js
export async function mapLimit(items, limit, worker) {
  const results = new Array(items.length);
  let index = 0;

  async function run() {
    while (index < items.length) {
      const current = index++;
      results[current] = await worker(items[current], current);
    }
  }

  await Promise.all(Array.from({length: Math.min(limit, items.length)}, run));
  return results;
}
```

A limit of `2` on mobile and `4` on desktop is a safe range; higher means decoding several bitmaps at once and doubling memory.

### 4.2 Yield to the main thread

```js
const nextFrame = () => new Promise((r) => requestAnimationFrame(r));
// after each file
await nextFrame();
```

Progress bars update and the page does not look dead.

## 5. Why batch downloads get blocked

Calling `a.click()` repeatedly makes browsers treat later clicks as not user-initiated and ignore them. Options:

| Approach | Notes |
|---|---|
| Bundle a ZIP | Best UX, needs a library such as `fflate` |
| One download button per file | Simplest and most reliable |
| Timed clicks | Unreliable; policies differ per browser |

A list with one "Download" button per row is the least fragile design.

## 6. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Watermark jumps around as image sizes change | Fixed pixels | Scale by canvas width |
| White text is invisible | Light background | Add an outline or plate |
| Transparency turns black after export | JPEG output | Use PNG/WebP |
| Tab freezes during batch | Concurrency too high | Limit concurrency and yield frames |
| Only the first file downloads | Repeated `click()` blocked | ZIP or per-row buttons |
| Watermarking external images throws | Canvas tainted by cross-origin image | `crossOrigin="anonymous"` plus CORS headers |

## 7. Takeaways

- Position by ratio, not pixels
- Legibility comes from an outline, not from opacity
- Batch work needs a concurrency cap and frame yields
- Do not rely on repeated `click()` for multiple downloads

Next: search for a static site.
