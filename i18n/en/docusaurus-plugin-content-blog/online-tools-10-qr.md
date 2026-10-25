---
slug: online-tools-10-qr
title: "QR codes: choosing a library and two small pitfalls"
authors: [lxhanesser]
tags: [Engineering, Web tools, Frontend]
date: 2026-10-25T21:45:00+08:00
description: A zero-dependency QR library tripped me up twice — once with exports, once with Chinese text.
---

A QR tool looks like the simplest thing: type text, draw black and white squares. Building it, I hit one pitfall choosing a library and another handling Chinese text.

{/* truncate */}

## Choosing: look at dependencies first

The most popular package is `qrcode`, which is feature-complete but depends on `pngjs`, `yargs`, and `dijkstrajs` — far too heavy for "draw squares on a canvas".

The other option is `qrcode-generator`: **zero dependencies**, written by the author of the QR specification book, still maintained in 2025. It only computes the matrix and leaves rendering to me, which is exactly right.

## Pitfall 1: the exports field blocks the way

I wanted its UTF-8 variant and instinctively wrote:

```js
import {stringToBytes} from 'qrcode-generator/dist/qrcode_UTF8.mjs';
```

The build failed immediately: `Package subpath './dist/qrcode_UTF8.mjs' is not defined by "exports"`. The package's `exports` only allows importing from the root.

The fix turned out cleaner: import the root, then implement UTF-8 bytes myself:

```js
import qrcode from 'qrcode-generator';
qrcode.stringToBytes = (s) => Array.from(new TextEncoder().encode(s));
```

`TextEncoder` is browser-native — cleaner than pulling in a variant file.

## Pitfall 2: garbled Chinese

Without overriding `stringToBytes`, the library treats each character as a single byte and Chinese comes out garbled. After the override, length is counted in UTF-8 bytes and the QR content matches the input.

One constraint to note: the longer the content, the denser the code, and exceeding capacity throws. The tool wraps it in try/catch and reports "content too long".

## Rendering and export

Once the matrix is available, draw it yourself:

```js
const count = qr.getModuleCount();
const cell = Math.floor(size / (count + margin * 2));
```

Using an integer `cell` avoids half-pixel blur, and the margin is applied on all sides. Export is just `canvas.toBlob('image/png')` — no extra encoder needed.

## Choosing an error-correction level

L/M/Q/H: higher levels resist damage but get denser for the same content. M is enough for everyday use; go to Q or H for printed material that wears easily.

## Lesson

Small libraries' `exports` restrictions often block the way, but a few lines of native code usually get around them. When choosing a library, the dependency count matters more than the feature count.
