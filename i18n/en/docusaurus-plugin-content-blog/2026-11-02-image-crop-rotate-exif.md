---
slug: image-crop-rotate-exif
title: "Cropping, rotating, and EXIF orientation: getting the coordinates right"
authors: [lxhanesser]
tags: [Engineering, Frontend]
date: 2026-11-02T14:00:00+08:00
description: Phone photos store their orientation in EXIF, not in pixels. This explains the display-to-source coordinate conversion, gives complete crop and rotate implementations, and lists the three bugs everyone hits.
---

Cropping and rotating look like the simplest image operations possible: pick a region, draw it. But with phone photos there is one hidden variable — **EXIF orientation**.

Handle it wrong and you get the three classic bugs: the crop lands somewhere else, rotated images look squashed, or the same photo appears in different orientations on different loads.

{/* truncate */}

<img src="/img/blog/image-crop-rotate/fig1-orientation-en.svg" alt="EXIF orientation values and coordinate spaces: display coordinates versus source pixels" width="1000" height="300" loading="lazy" />

## 1. Where orientation lives

Camera sensors are fixed. Shoot in portrait and the sensor still records a landscape frame; it just writes an Orientation tag into EXIF telling viewers how to rotate it.

| Value | Meaning |
|---|---|
| 1 | Normal |
| 2 | Flip horizontal |
| 3 | Rotate 180° |
| 4 | Flip vertical |
| 5 | Rotate 90° CW + flip |
| 6 | Rotate 90° CW |
| 7 | Rotate 90° CCW + flip |
| 8 | Rotate 90° CCW |

The key point: **the pixels never changed**. Only a tag did. So every operation has to decide which coordinate system it works in.

## 2. The reliable approach: normalize while decoding

Modern browsers can apply orientation during decoding:

```js
const bitmap = await createImageBitmap(file, {imageOrientation: 'from-image'});
```

The bitmap you get back is already upright. Every later crop and rotate happens in "what the user sees", with no EXIF reading at all.

This is the only model that stays manageable: **orientation is applied exactly once, at the entry point**.

> An `<img>` element also honours EXIF by default, so positions measured in the page are display coordinates, while `drawImage` reads source pixels. When orientation is not 1, those two do not line up. `from-image` removes the discrepancy.

## 3. Cropping: display coordinates to source coordinates

If the user drags a box `{x, y, width, height}` in the UI, it is measured against the **displayed** size. Convert it first:

```js
export function toSourceRect(rect, display, source) {
  const scaleX = source.width / display.width;
  const scaleY = source.height / display.height;
  return {
    x: Math.round(rect.x * scaleX),
    y: Math.round(rect.y * scaleY),
    width: Math.round(rect.width * scaleX),
    height: Math.round(rect.height * scaleY),
  };
}
```

Then draw the result in one pass:

```js
export async function crop(file, displayRect, displaySize) {
  const bitmap = await createImageBitmap(file, {imageOrientation: 'from-image'});
  const src = toSourceRect(displayRect, displaySize, bitmap);

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, src.width);
  canvas.height = Math.max(1, src.height);

  const ctx = canvas.getContext('2d');
  ctx.drawImage(bitmap, src.x, src.y, src.width, src.height, 0, 0, src.width, src.height);
  bitmap.close?.();

  return canvas;
}
```

## 4. Rotating: one transform, one draw

For multiples of 90°, the safe pattern is "swap the canvas size, translate to centre":

```js
export async function rotate(file, degrees) {
  const bitmap = await createImageBitmap(file, {imageOrientation: 'from-image'});
  const rad = (degrees * Math.PI) / 180;
  const swapped = degrees % 180 !== 0;

  const canvas = document.createElement('canvas');
  canvas.width = swapped ? bitmap.height : bitmap.width;
  canvas.height = swapped ? bitmap.width : bitmap.height;

  const ctx = canvas.getContext('2d');
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(rad);
  ctx.drawImage(bitmap, -bitmap.width / 2, -bitmap.height / 2);
  bitmap.close?.();

  return canvas;
}
```

Key points:

- **Swap width and height** only for 90° and 270°; `degrees % 180 !== 0` expresses it directly
- Translate to the canvas centre *before* rotating, or the image rotates out of bounds
- Call `drawImage` once — repeated rotations compound interpolation error

## 5. Cropping and rotating together

If the user rotates and then crops, do not export and re-import. Combine both transforms in a single draw:

```js
export async function cropAndRotate(file, degrees, displayRect, displaySize) {
  const bitmap = await createImageBitmap(file, {imageOrientation: 'from-image'});
  const rad = (degrees * Math.PI) / 180;

  const swapped = degrees % 180 !== 0;
  const rotatedW = swapped ? bitmap.height : bitmap.width;
  const rotatedH = swapped ? bitmap.width : bitmap.height;

  const src = toSourceRect(displayRect, displaySize, {width: rotatedW, height: rotatedH});

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, src.width);
  canvas.height = Math.max(1, src.height);
  const ctx = canvas.getContext('2d');

  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(rad);
  const offsetX = -(src.x + src.width / 2 - rotatedW / 2);
  const offsetY = -(src.y + src.height / 2 - rotatedH / 2);
  ctx.drawImage(bitmap, offsetX, offsetY);

  bitmap.close?.();
  return canvas;
}
```

It reads awkwardly, but the idea is one sentence: **align the canvas centre with the crop centre, then rotate backwards so the right part of the source lands inside**.

## 6. Exporting: formats and alpha

```js
export function toBlob(canvas, type = 'image/jpeg', quality = 0.9) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) reject(new Error('Encoding failed'));
      else resolve(blob);
    }, type, quality);
  });
}
```

- JPEG drops the alpha channel; transparent areas turn black. Use PNG or WebP when transparency matters
- Exporting, re-importing, and exporting again accumulates loss; finish in one pass

## 7. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Crop lands in the wrong place | Display coordinates used directly on the source | Convert by scale first |
| Rotated image looks stretched | Canvas width/height not swapped | Swap for 90°/270° |
| Only a corner survives rotation | No translate to centre | Translate before rotating |
| Orientation flipped twice | Decoding applied it, then manual rotation applied it again | Apply orientation once |
| Transparent background turns black | Exported as JPEG | Use PNG/WebP |
| Gets blurrier with each crop | Repeated resampling | Combine into one draw |

## 8. Takeaways

- Apply orientation exactly once, at decode time (`imageOrientation: 'from-image'`)
- Cropping is a coordinate-system conversion: display coordinates are not source coordinates
- Rotating needs a size swap plus a translate to centre
- One draw is better than two; interpolation loss is permanent

Next: watermarking images, and exporting batches without freezing the browser.
