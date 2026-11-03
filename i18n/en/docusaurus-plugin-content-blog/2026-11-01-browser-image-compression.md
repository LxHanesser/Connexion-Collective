---
slug: browser-image-compression
title: "Compressing images in the browser with Canvas: decode, resize, encode"
authors: [lxhanesser]
tags: [Engineering, Web tools]
date: 2026-11-01T09:00:00+08:00
description: Shrink a 4 MB phone photo to a few hundred kilobytes without installing anything or uploading it — using only native browser APIs. A complete, runnable implementation plus a table of the errors you will actually hit.
---

Turning a 4 MB phone photo into a 300 KB file used to mean installing software, uploading it somewhere, and waiting. The browser can now do the whole thing: `createImageBitmap` to decode, a canvas to resize, `toBlob` to encode.

This is a complete, runnable implementation, with an explanation of why each step is written the way it is.

{/* truncate */}

## 1. The pipeline

<img src="/img/blog/browser-compress/fig1-pipeline-en.svg" alt="Image compression pipeline in the browser: pick, decode, resize, encode, download — nothing is uploaded" width="1000" height="300" loading="lazy" />

Five steps, all in memory:

1. **Pick** — `<input type="file">` or drag and drop, giving you a `File`
2. **Decode** — `createImageBitmap(file)` turns compressed bytes into pixels
3. **Resize** — draw onto a `<canvas>` at the target size
4. **Encode** — `canvas.toBlob(type, quality)` produces new compressed bytes
5. **Download** — turn the `Blob` into an `<a download>` URL

Nothing leaves the device at any point.

## 2. Minimal working implementation

```js
// compress.js
const SUPPORTED = new Set(['image/jpeg', 'image/png', 'image/webp']);

export async function compressImage(file, options = {}) {
  const {
    maxWidth = 1920,   // longest-edge cap; smaller images are untouched
    quality = 0.8,     // 0–1, only meaningful for lossy formats
    type = 'image/webp',
  } = options;

  if (!SUPPORTED.has(file.type)) {
    throw new Error(`Unsupported format: ${file.type || 'unknown'}`);
  }

  // 1) Decode. imageOrientation applies the EXIF rotation.
  const bitmap = await createImageBitmap(file, {imageOrientation: 'from-image'});

  // 2) Target size: shrink only, never enlarge
  const scale = Math.min(1, maxWidth / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  // 3) Draw once
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.(); // release the decoded pixels early

  // 4) Encode
  const blob = await new Promise((resolve) => {
    canvas.toBlob(resolve, type, quality);
  });
  if (!blob) {
    throw new Error('Encoding failed: the browser may not support this format');
  }

  return {blob, width, height};
}

// Trigger a download
export function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  // Revoking immediately breaks downloads in some browsers; wait a bit.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
```

Wiring it up:

```js
const input = document.querySelector('input[type=file]');
input.addEventListener('change', async (event) => {
  const file = event.target.files[0];
  const {blob} = await compressImage(file, {maxWidth: 1600, quality: 0.75});
  console.log(`${(file.size / 1024).toFixed(0)} KB → ${(blob.size / 1024).toFixed(0)} KB`);
  download(blob, 'compressed.webp');
});
```

## 3. Step by step

### 3.1 Decoding, and why `imageOrientation` matters

Phone cameras store the sensor image in a fixed orientation and record the real orientation in EXIF. Ignore that and portrait shots come out sideways.

`createImageBitmap(file, {imageOrientation: 'from-image'})` applies the orientation during decoding, so everything downstream works on upright pixels. No manual EXIF parsing, no second rotation.

> For older Safari without `createImageBitmap`, fall back to `new Image()` plus `URL.createObjectURL()` and `await image.decode()`.

### 3.2 Resizing: shrink only, and only once

```js
const scale = Math.min(1, maxWidth / Math.max(bitmap.width, bitmap.height));
```

- `Math.min(1, …)` prevents enlarging — upscaling only adds blur
- Using the longest edge keeps landscape and portrait within the same cap
- Resize once. Every additional canvas pass is another resample and a visible quality step down

### 3.3 Encoding: the quality argument is lossy-only

| Output | Quality applies? | Notes |
|---|---|---|
| `image/webp` | ✅ | Smallest files; supported by all current browsers |
| `image/jpeg` | ✅ | Best compatibility; no alpha channel |
| `image/png` | ❌ | Lossless: quality is ignored and files often grow |

A PNG that will not shrink is not a bug — the format leaves no room for lossy compression. To get a real reduction, switch to WebP or JPEG.

### 3.4 Downloading: do not revoke the URL too early

An object URL stays valid until explicitly revoked. Revoking right after `a.click()` makes some browsers — especially mobile — fail to read the blob and silently drop the download. A delayed revoke costs nothing and avoids the whole class of bug.

## 4. Hitting a target file size

Users rarely want "quality 80"; they want "under 500 KB". Binary-search the quality:

```js
export async function compressToTarget(file, targetBytes, {maxAttempts = 4} = {}) {
  let low = 0.3;
  let high = 0.95;
  let best = null;

  for (let i = 0; i < maxAttempts; i++) {
    const quality = (low + high) / 2;
    const {blob} = await compressImage(file, {quality, maxWidth: 1600});
    best = blob;

    if (blob.size > targetBytes) {
      high = quality;   // too big, lower quality
    } else {
      low = quality;    // small enough, try higher quality
    }
  }

  return best;
}
```

Four iterations land within roughly ±4% quality. The cost is four encodes — about 100–300 ms each for a 4000×3000 photo, which is acceptable.

## 5. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `toBlob` yields `null` | Canvas is 0×0, or the image tainted the canvas | Check `width/height ≥ 1`; set `crossOrigin` for remote images |
| Output is larger than input | Encoding to PNG, or the source was already a highly compressed WebP | Use WebP/JPEG; compare sizes first |
| Portrait photo comes out sideways | EXIF orientation ignored | `imageOrientation: 'from-image'` |
| Mobile tab crashes | Image beyond the canvas size ceiling | Resize before drawing; or tile the image |
| Download does nothing | Object URL revoked too early | Delay the revoke |
| Quality seems ignored in Safari | Older WebKit has incomplete WebP encoding | Feature-detect and fall back to JPEG |

### Feature-detect WebP encoding

```js
async function canEncodeWebp() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1;
  const blob = await new Promise((r) => canvas.toBlob(r, 'image/webp', 0.8));
  return Boolean(blob && blob.type === 'image/webp');
}
```

`blob.type` is the source of truth: unsupported browsers quietly return `image/png` instead.

## 6. Takeaways

- Three core calls: `createImageBitmap` → canvas draw → `toBlob`
- Three classic mistakes: EXIF orientation, the PNG quality no-op, revoking the object URL too early
- To hit an exact size, binary-search the quality; four passes is plenty

Next up: QR codes — no library, from UTF-8 bytes all the way to a matrix.
