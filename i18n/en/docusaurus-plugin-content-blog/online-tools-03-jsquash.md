---
slug: online-tools-03-jsquash
title: "Three pitfalls when wiring up jSquash"
authors: [lxhanesser]
tags: [Engineering, Web tools, Frontend]
date: 2026-10-25T20:00:00+08:00
description: How an "init is not a function" error led to a full debugging trail through a WASM library.
---

jSquash packages mozjpeg, libwebp, and oxipng into browser-ready WASM. The API looks simple: `init()` then `encode()`. Wiring it in, I hit three pitfalls.

{/* truncate */}

## Pitfall 1: init is not on the entry point

The intuitive import:

```js
import {init, encode} from '@jsquash/webp';
```

At runtime the console only says `e.init is not a function`. Digging into `dist` revealed that the package entry only exports `encode` and `decode`:

```js
// @jsquash/webp/index.js
export {default as encode} from './encode.js';
export {default as decode} from './decode.js';
```

`init` is a named export of `encode.js`. So:

```js
const mod = await import('@jsquash/webp/encode.js');
await mod.init({locateFile});
const encode = mod.default;
```

**Lesson**: a library's README and its actual exports often disagree. Reading `dist` beats reading docs.

## Pitfall 2: where the WASM comes from

By default the Emscripten glue looks for the `.wasm` next to the module itself. I wanted to self-host, so files went into `static/wasm/` and init got a resolver:

```js
await init({locateFile: (file) => `/wasm/${file.split('/').pop()}`});
```

Note that libwebp has a SIMD variant: the library probes with `wasm-feature-detect`, loading `webp_enc_simd.wasm` when supported and the plain build otherwise. **Both files must be present**, or machines with SIMD support get a 404.

## Pitfall 3: oxipng works differently

The first two are Emscripten; oxipng is wasm-bindgen, so initialisation differs:

```js
const mod = await import('@jsquash/oxipng/optimise.js');
await mod.init('/wasm/squoosh_oxipng_bg.wasm');
const optimise = mod.default;
```

Internally it also checks whether it is in a Worker and whether multithreading is available, choosing between the single-threaded and parallel packages. We run on the main thread, so it takes the single-threaded one.

## How to debug this class of problem

- Catch exceptions in the browser first (I listen to `Runtime.exceptionThrown` over CDP);
- Log before and after `init` to distinguish "not exported" from "failed to load";
- Read `dist` in `node_modules` instead of second-hand docs.

None of the three is hard, but all three stall on "the docs do not say". After this round I have a fresh appreciation for "the source is the API".
