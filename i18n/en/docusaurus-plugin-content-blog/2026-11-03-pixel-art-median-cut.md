---
slug: pixel-art-median-cut
title: "Pixel art from photos: downsampling and a median-cut palette"
authors: [lxhanesser]
tags: [Engineering, Web tools]
date: 2026-11-03T20:00:00+08:00
description: Turning a photo into pixel art is not about shrinking it — it is about squeezing tens of thousands of colours into sixteen. Median cut builds the palette, weighted nearest-colour maps the pixels, and dithering is a choice, not a default.
---

A "pixel art filter" looks like shrinking an image, but it is two independent steps:

1. **Downsample** — 4000×3000 down to 64×48
2. **Quantise** — a million colours down to 16 or 32

The second step decides whether it reads as pixel art. Nearest-neighbour downscaling gives a noisy, muddy result; averaging first and quantising afterwards keeps edges clean.

{/* truncate */}

## 1. The pipeline

<img src="/img/blog/pixel-art/fig1-pipeline-en.svg" alt="Pixel art pipeline: downsample, median-cut palette, nearest-colour mapping, integer upscale" width="1000" height="280" loading="lazy" />

## 2. Downsampling: average, then upscale

```js
export function downsample(image, targetWidth) {
  const scale = targetWidth / image.width;
  const w = Math.max(1, Math.round(targetWidth));
  const h = Math.max(1, Math.round(image.height * scale));

  const small = document.createElement('canvas');
  small.width = w;
  small.height = h;

  const ctx = small.getContext('2d', {willReadFrequently: true});
  ctx.imageSmoothingEnabled = true;      // averaging keeps edges readable
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(image, 0, 0, w, h);

  return {canvas: small, width: w, height: h};
}
```

You want **averaging**, not "pick the nearest pixel". Nearest-neighbour leaves aliasing artefacts that become very visible after quantisation.

## 3. Median cut: from tens of thousands of colours to 16

The idea is simple:

1. Put every pixel into one colour box
2. Find the channel with the **largest spread**
3. Sort by that channel and split at the median
4. Repeat until you have as many boxes as target colours
5. The average colour of each box becomes a palette entry

```js
function medianCut(pixels, count) {
  let boxes = [pixels];

  while (boxes.length < count) {
    let target = -1;
    let bestScore = -1;
    for (let i = 0; i < boxes.length; i++) {
      if (boxes[i].length < 2) continue;
      const range = maxChannelRange(boxes[i]);
      const score = range * Math.log2(boxes[i].length + 1);
      if (score > bestScore) {
        bestScore = score;
        target = i;
      }
    }
    if (target === -1) break;

    const box = boxes[target];
    const channel = widestChannel(box);
    box.sort((a, b) => a[channel] - b[channel]);

    const mid = Math.floor(box.length / 2);
    boxes.splice(target, 1, box.slice(0, mid), box.slice(mid));
  }

  return boxes.map(averageColor);
}
```

Helpers:

```js
function maxChannelRange(box) {
  let max = 0;
  for (let c = 0; c < 3; c++) {
    let lo = 255;
    let hi = 0;
    for (const p of box) {
      lo = Math.min(lo, p[c]);
      hi = Math.max(hi, p[c]);
    }
    max = Math.max(max, hi - lo);
  }
  return max;
}

function widestChannel(box) {
  let best = 0;
  let bestRange = -1;
  for (let c = 0; c < 3; c++) {
    let lo = 255;
    let hi = 0;
    for (const p of box) {
      lo = Math.min(lo, p[c]);
      hi = Math.max(hi, p[c]);
    }
    if (hi - lo > bestRange) {
      bestRange = hi - lo;
      best = c;
    }
  }
  return best;
}

function averageColor(box) {
  const sum = [0, 0, 0];
  for (const p of box) {
    sum[0] += p[0];
    sum[1] += p[1];
    sum[2] += p[2];
  }
  return sum.map((v) => Math.round(v / box.length));
}
```

`score = range × log2(n)` is a practical heuristic: prefer boxes with a wide spread while avoiding over-splitting boxes that only contain a few dozen pixels.

## 4. Nearest-colour mapping

With a palette in hand, replace each pixel with its closest colour:

```js
export function quantize(imageData, palette) {
  const {data} = imageData;
  const cache = new Map(); // compute each distinct colour once

  for (let i = 0; i < data.length; i += 4) {
    const key = (data[i] << 16) | (data[i + 1] << 8) | data[i + 2];
    let idx = cache.get(key);

    if (idx === undefined) {
      let best = 0;
      let bestDist = Infinity;
      for (let p = 0; p < palette.length; p++) {
        const [r, g, b] = palette[p];
        const dr = data[i] - r;
        const dg = data[i + 1] - g;
        const db = data[i + 2] - b;
        // the eye is more sensitive to green, so weight it higher
        const dist = 2 * dr * dr + 4 * dg * dg + 3 * db * db;
        if (dist < bestDist) {
          bestDist = dist;
          best = p;
        }
      }
      cache.set(key, best);
      idx = best;
    }

    const [r, g, b] = palette[idx];
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
  }

  return imageData;
}
```

The cache matters: a 64×48 image has 3,072 pixels but perhaps only a few hundred distinct colours, so caching cuts the comparisons by an order of magnitude.

## 5. Upscaling for export

```js
export function upscale(canvas, factor = 8) {
  const out = document.createElement('canvas');
  out.width = canvas.width * factor;
  out.height = canvas.height * factor;

  const ctx = out.getContext('2d');
  ctx.imageSmoothingEnabled = false; // upscaling must not interpolate
  ctx.drawImage(canvas, 0, 0, out.width, out.height);
  return out;
}
```

Turning smoothing **off** while upscaling is mandatory; otherwise you are back to a blurry image.

## 6. Dithering: when to add it

| Situation | Advice |
|---|---|
| Photographic source, continuous tones | Add ordered dithering (Bayer 4×4) to avoid banding |
| Icons or hand-made pixel art | Do not add; it destroys the pixel look |
| Palette of 8 colours or fewer | Dithering helps a lot |
| Output will be displayed large | Do not add; dots become visible noise |

## 7. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Output is muddy and noisy | Nearest-neighbour downsampling | Use averaging |
| Too few usable colours | Palette split ignores spread | Check the median-cut strategy |
| Blurry after upscaling | Smoothing left enabled | `imageSmoothingEnabled = false` |
| Very slow | Every pixel scans the palette | Add the colour cache |
| Visible banding | Few colours, no dithering | Add Bayer dithering |
| Transparency turns black | Alpha ignored | Preserve alpha or composite on a solid background |

## 8. Takeaways

- Pixel art is **downsample + quantise**; neither step can be skipped
- Average when shrinking, nearest-neighbour when enlarging
- Median cut works by splitting on the widest channel
- Cache the nearest-colour lookups; the difference is large

That closes this tutorial series: images, PDFs, QR codes, SVG, search, and mouse maths. The common thread is that all of it runs in the browser, with no server involved.
