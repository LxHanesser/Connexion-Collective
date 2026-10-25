---
slug: online-tools-05-lazy-prewarm
title: "Lazy loading plus prewarming: hiding the first 1–2 second wait"
authors: [lxhanesser]
tags: [Engineering, Web tools, Performance]
date: 2026-10-25T20:30:00+08:00
description: Tools should not slow the homepage, but once a visitor opens one they should not wait either.
---

"Will adding tools make the homepage slower?" was my own biggest worry. The answer is not to minify harder, but to separate two things: **do not pay for a page you never opened**, and **do not make the first click wait**.

{/* truncate */}

## Layer one: route-level splitting

Docusaurus bundles each page separately. The tool page component is only 10 KB, and the homepage or an article never downloads it. Cold loads with caching disabled:

| Page | JS | WASM |
|---|---|---|
| Homepage | 570 KB (framework + search) | 0 |
| `/tools/image-compress` | 570 KB + 10 KB | 0 |
| After clicking "Start compressing" | +22 KB | +246 KB |

That 570 KB is the framework, React, and the search client — nothing to do with tools.

## Layer two: library-level lazy loading

The compression logic and jSquash live behind `await import()`, pulled only when the button is pressed. WASM comes even later: it is requested when encoding actually starts, and only for the format in use.

## Layer three: prewarming

Lazy loading solves "pay nothing until you click", but the first click still waits for a 250 KB download — roughly 1–2 seconds on a phone. So the tool **prewarms as soon as a file is selected**:

- Initialise the encoder for the current output format in the background;
- When the format changes, debounce 500 ms before prewarming again, so flipping back and forth does not re-download;
- Prewarm failures are silent; the real compression retries and reports errors.

Measured: the encoder download starts 34 ms after selecting a file, and clicking "Start compressing" to a result takes only **172 ms**.

## The trade-off

Prewarming downloads the WASM once more, but only after a strong signal of intent — the user already picked a file. It is not an unconditional prefetch. For data-sensitive situations it can be turned back into pure lazy loading at the cost of a slower first click.

## Lesson

Lazy loading and prewarming are not opposites. The first governs the entry cost, the second governs the first-interaction cost. Draw the boundary clearly and both goals can be met.
