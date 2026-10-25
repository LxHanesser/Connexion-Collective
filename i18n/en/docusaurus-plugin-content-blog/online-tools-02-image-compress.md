---
slug: online-tools-02-image-compress
title: "Why image compression runs in the browser: Canvas vs WASM"
authors: [lxhanesser]
tags: [Engineering, Web tools, Frontend]
date: 2026-10-25T19:45:00+08:00
description: Same compression goal, but Canvas re-encoding and a professional WASM encoder are worlds apart.
---

The laziest image compressor is three lines: `createImageBitmap` to decode, draw to a canvas, `canvas.toBlob('image/webp', 0.75)`. I built that prototype first, and then found it was nowhere near a "professional compression tool".

{/* truncate */}

## Where Canvas falls short

The browser's `toBlob` uses a built-in encoder with only format and quality as knobs. For photos, quality 0.75 WebP usually saves 60–80%, which sounds fine — but push it lower and details smear, while a dedicated tool still saves another half.

The difference is not the algorithm but the **encoder**: browsers ship general-purpose implementations, while mozjpeg, libwebp, and oxipng are tuned specifically for "smaller file at the same visual quality".

## Switching to WASM encoders

I used three encoders packaged by jSquash:

- **mozjpeg** for JPEG, with quality and progressive options;
- **libwebp** for WebP, auto-detecting CPU SIMD support for a faster build;
- **oxipng** for lossless PNG optimisation — it does not touch pixels, it re-packs compression blocks.

With all three paths working, measurements on synthetic images (magnitude only):

| Case | Input | Output | Change |
|---|---|---|---|
| JPEG → JPEG | 342 KB | 136 KB | -60% |
| PNG → WebP | 1.7 MB | 24 KB | -99% |
| PNG → PNG (oxipng) | 1.3 MB | 476 KB | -65% |

## One easily missed detail

When PNG goes down the "lossless optimisation" path, not a single pixel changes — only the compression gets smarter. This is especially effective for screenshots, icons, and flat colour blocks, and there is no psychological burden of quality loss. So it is the default in the tool: PNG in, PNG out, no resizing means straight to oxipng, skipping canvas.

The cost is WASM size: about 1 MB across four binaries. But they load **on demand** — if you never press compress, not a byte is downloaded.

## Lesson

Compression is not "turn the quality down", it is "use the right encoder". Canvas is fine for thumbnails and quick previews; when size actually matters, bring in the professionals.
