---
slug: pixel-art-median-cut
title: "Building a pixel-art palette with median cut"
authors: [lxhanesser]
tags: [Web tools, Frontend]
date: 2026-10-26T14:10:00+08:00
description: Pixel art is not a mosaic filter. It is downsampling to a fixed grid, then recolouring with a handful of colours — and where those colours come from decides whether it looks right.
---

When I started the pixel-art tool, the first idea was "just add a mosaic filter".

That does not work. A mosaic enlarges pixel blocks while keeping tens of thousands of colours, so you get a low-resolution photo, not pixel art. Real pixel art has two hard constraints: **how many cells**, and **how many colours**.

{/* truncate */}

## Step one: hard downsampling

```js
ctx.imageSmoothingEnabled = false;
ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
```

Turning smoothing off is the whole trick. With smoothing you get averaging and soft edges; without it you get nearest-neighbour sampling — each target pixel takes exactly one source pixel, so edges stay hard.

Target widths run 16–128. 32–64 suits avatars; 16 suits tiny icons.

## Step two: extract a palette from the image

This is the interesting part. We want to recolour with at most N colours — where do those N come from?

### Median cut, briefly

Put every opaque pixel in one box, then repeat:

1. Find the box with the **largest colour spread** (compare the range of R, G and B, take the widest channel)
2. Split that box at the median along that channel
3. Stop when the number of boxes equals the target colour count

Average the pixels in each box and you have the palette.

Why this works well here:

- **Deterministic**: the same input always yields the same palette, so refreshing never changes the result
- **No iteration**: unlike k-means, there is no convergence loop
- **Proportional by construction**: large flat areas get split repeatedly, while detail-dense regions end up with fewer representatives — which matches how the eye weights large areas

### Why not k-means

k-means usually produces slightly better palettes, but it is **random initialisation plus iteration**: the same image can give different palettes on two runs, and users read that as a broken tool.

For a tool where the output is instantly visible, stability beats a 5% quality gain.

## Step three: map pixels

With the palette fixed, replace each pixel with the **nearest colour in Euclidean distance**:

```js
const d = (r1-r2)**2 + (g1-g2)**2 + (b1-b2)**2;
```

Brute force over the palette is fine. 128×128 is 16,384 pixels, at most 32 palette entries, so about 520,000 distance computations — milliseconds in a browser, no spatial index needed.

Pixels with alpha below 16 are skipped and stay transparent; otherwise transparent regions get filled with black.

## Fixed palettes

Two classic palettes are offered alongside the automatic one:

- **PICO-8** (16 colours): the fantasy console's palette, high saturation, good for game assets
- **Game Boy** (4 colours): that green-tinted greyscale, extremely stylised

Choosing a fixed palette skips the median cut and maps straight to it. The upside is a consistent look across a set of assets; the downside is that source colours get dragged — a warm photo under the Game Boy palette turns into an alarming field of green.

## Export: integer scaling

Pixel art must be enlarged, but **never smoothly**:

```js
ctx.imageSmoothingEnabled = false;
ctx.drawImage(small, 0, 0, w * scale, h * scale);
```

Export offers 1× / 2× / 4× / 8× / 16×. 8× is the sweet spot: a 48px-wide image becomes 384px, ready for sharing.

## Numbers from testing

- A 48px-wide image takes under 10 ms from downsampling to palette mapping
- The number of colours actually used is often below the target, because some boxes average to the same colour
- On gradient-heavy images (a sky photo), median cut gives most boxes to the gradient and leaves only a few for the subject. Those images do better with a contrast adjustment first

## The point

The technical content is not a clever algorithm. It is **enforcing two constraints**: a fixed grid and a fixed colour count. Honour both and the result reads as pixel art; the palette choice is only style after that.
