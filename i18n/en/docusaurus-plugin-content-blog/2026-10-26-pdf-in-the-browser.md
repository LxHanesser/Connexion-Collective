---
slug: pdf-in-the-browser
title: "Merging and splitting PDFs in the browser: what works, what does not"
authors: [lxhanesser]
tags: [Web tools, Engineering]
date: 2026-10-26T17:30:00+08:00
description: "Handling PDFs entirely client-side is possible, but it has a ceiling — memory, encryption, digital signatures. Define the edges first, then implement."
---

The obvious doubt about a browser-based PDF tool is whether it can work without uploading anything.

It can. PDF is a structured container format; pages can be copied into a new document without ever rendering them. But a few limits need stating up front, or users hit a wall exactly when it matters.

{/* truncate */}

## The library

`pdf-lib`: pure JavaScript, no WASM, no native code. It does not render — it reads and writes PDF object structures, which is exactly what merging and splitting need.

It ships as its own 412 KB chunk and is only fetched when you open the PDF tool, so the rest of the site is unaffected.

## Merging: move pages into a new document

```js
const out = await PDFDocument.create();
for (const bytes of sources) {
  const doc = await PDFDocument.load(bytes);
  const pages = await out.copyPages(doc, doc.getPageIndices());
  pages.forEach((page) => out.addPage(page));
}
const result = await out.save();
```

The key is `copyPages`: it copies page objects — content streams, resource dictionaries, font references — into the target document.

That means **no quality loss**: nothing is re-rendered, nothing is recompressed, vectors stay vectors. It also means the output roughly equals the sum of the inputs; merging does not magically shrink or inflate anything.

## Splitting: copy a range

The page box accepts `1-3,5,8-10`, with commas, spaces or full-width commas. The parser is short:

```js
for (const part of text.split(/[,，\s]+/)) {
  const m = part.match(/^(\d+)(?:[-–](\d+))?$/);
  // validate 1 <= start <= end <= pageCount
}
```

Out-of-range input errors out instead of quietly returning an empty document — that failure mode is the hardest to debug.

"Every page as its own file" does not fire N download prompts; it produces a single **ZIP**, reusing the hand-written store-mode packer described in the ICO/ZIP post, so no extra dependency for one download.

## Three explicit limits

### 1. Encrypted PDFs fail

`PDFDocument.load()` throws on password-protected documents. The tool says so plainly — "this PDF is password-protected and cannot be processed" — rather than producing a blank file.

That is deliberate: silent failure is worse than an error.

### 2. Everything lives in memory

There is no streaming. The file is read fully into an `ArrayBuffer` and the output is generated fully before download. Dozens of pages are fine; a several-hundred-page image-heavy album will crawl, or stall a mobile browser.

The current policy is **neither a hard limit nor a pretence**: it is slow, and you can see it is slow. Handling genuinely large files would need chunking plus a Worker, which multiplies the complexity.

### 3. Digital signatures break

A PDF signature covers the whole document's bytes. Any modification — including appending one page — invalidates it. That is the format's design, not a defect of the tool.

Likewise, form fields (AcroForm) may not survive page copying, because field definitions are document-level rather than page-level. Supporting them properly needs dedicated field-merging logic.

## How it is verified

Nobody runs regression tests for a small client-side tool, so you build samples yourself:

1. Generate test files with `pdf-lib` (2 pages + 1 page)
2. Upload, merge and download in the browser
3. Read the result back in Node and assert **3 pages**
4. Split with range `2` and assert **1 page**

That loop is far more trustworthy than "I clicked it and nothing looked broken". It also did surface a problem on the first run — though that turned out to be my test script selecting the wrong input, not the tool itself (a different story).

## Where this fits

A client-side PDF tool should be positioned as **handling everyday documents of a few dozen pages**, not as a desktop replacement.

Writing "what it cannot do" on the page is more honest than shipping an implementation that falls over.
