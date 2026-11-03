---
slug: pdf-merge-split-in-browser
title: "Merging and splitting PDFs in the browser: pdf-lib in practice"
authors: [lxhanesser]
tags: [Engineering, Web tools]
date: 2026-11-01T20:00:00+08:00
description: No Acrobat, no upload — merge several PDFs or split one by page range entirely in the browser with pdf-lib. Complete implementation, plus the encrypted-file, form-field, bookmark, and file-size traps that actually bite.
---

Merging and splitting PDFs is one of the most common document chores, and most online tools ask you to upload the file first. With `pdf-lib` the whole job stays in the browser: read from disk, process, download.

This article gives a working implementation and focuses on the parts that actually go wrong.

{/* truncate */}

## 1. Two operations, one model

<img src="/img/blog/pdf-merge-split/fig1-merge-split-en.svg" alt="Two PDF operations: merging several files into one, or splitting one by page ranges" width="1000" height="340" loading="lazy" />

Merge and split are the same sentence:

> Read pages → put them in a new document → save.

- **Merge**: loop over files, appending each file's pages to one output document
- **Split**: read one file and build several output documents from page ranges

## 2. Setup

```bash
npm install pdf-lib
```

```js
import {PDFDocument} from 'pdf-lib';
```

`pdf-lib` is pure JavaScript — no WASM, no worker required, which is exactly why it works well in the browser.

## 3. Merging

```js
export async function mergePdfs(files, {onProgress} = {}) {
  const out = await PDFDocument.create();

  for (let i = 0; i < files.length; i++) {
    const bytes = await files[i].arrayBuffer();
    const source = await PDFDocument.load(bytes);

    // copyPages brings page content and resources into the target document
    const pages = await out.copyPages(source, source.getPageIndices());
    for (const page of pages) out.addPage(page);

    onProgress?.((i + 1) / files.length);
  }

  return out.save(); // Uint8Array
}
```

Calling it and downloading the result:

```js
const bytes = await mergePdfs(fileInput.files);
download(new Blob([bytes], {type: 'application/pdf'}), 'merged.pdf');
```

## 4. Splitting

The interesting part is parsing page ranges. Support the `1-3,5,8-10` form:

```js
function parseRanges(input, pageCount) {
  const ranges = input
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [start, end] = part.split('-').map((n) => Number(n.trim()));
      const from = Math.max(1, start);
      const to = Math.min(pageCount, end ?? start);
      if (!Number.isFinite(from) || !Number.isFinite(to) || from > to) {
        throw new Error(`Invalid page range: ${part}`);
      }
      return {from, to};
    });

  if (ranges.length === 0) throw new Error('Enter at least one page range');
  return ranges;
}
```

Then extract each range:

```js
export async function splitPdf(file, rangeInput) {
  const source = await PDFDocument.load(await file.arrayBuffer());
  const pageCount = source.getPageCount();
  const ranges = parseRanges(rangeInput, pageCount);

  const results = [];
  for (const {from, to} of ranges) {
    const out = await PDFDocument.create();
    const indices = [];
    for (let p = from; p <= to; p++) indices.push(p - 1); // internal index starts at 0

    const pages = await out.copyPages(source, indices);
    for (const page of pages) out.addPage(page);

    results.push({
      name: `${from}-${to}.pdf`,
      bytes: await out.save(),
    });
  }
  return results;
}
```

Do not fire several `<a download>` clicks in a row — browsers block them. Either bundle the outputs into a ZIP or let the user download them one at a time.

## 5. Traps that actually bite

### 5.1 Encrypted PDFs throw

`PDFDocument.load()` rejects password-protected files. You can pass `{ignoreEncryption: true}` to force it open, but **do not**:

- some encrypted files also encrypt page content, so you get blank pages
- the user believes it worked and ends up with a broken document

Catch the error and tell the user to remove the password first.

```js
try {
  const doc = await PDFDocument.load(bytes);
} catch (error) {
  if (String(error).includes('encrypted')) {
    throw new Error('This PDF is password-protected — remove the password first');
  }
  throw error;
}
```

### 5.2 Merged size is not the sum of the parts

`pdf-lib` keeps each source's fonts and images. If two files embed the same CJK font, the merged file is often larger than the two originals combined.

If size matters, compress afterwards (for example by re-encoding images), or accept the cost — keeping full quality requires the bytes.

### 5.3 Forms, bookmarks, and annotations are not preserved

`copyPages` copies **page content**. The following usually do not survive:

| Content | Preserved |
|---|---|
| Page text, images, vectors | ✅ |
| Page size and rotation | ✅ |
| Form fields (AcroForm) | ⚠️ partially |
| Bookmarks / outline | ❌ |
| Annotations and comments | ❌ |

If bookmarks matter, rebuild a table-of-contents page after merging.

### 5.4 Memory on large files

`pdf-lib` loads the whole document into memory. A 100 MB PDF will crash a phone. Set a limit and say so:

```js
const MAX_BYTES = 50 * 1024 * 1024;
if (file.size > MAX_BYTES) {
  throw new Error('File is over 50 MB — compress it on a computer first');
}
```

### 5.5 Revoking object URLs

As with image compression, revoke the object URL lazily:

```js
function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
```

## 6. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `encrypted` thrown on load | Password-protected file | Ask the user to remove the password |
| Pages out of order | File order or index confusion | Pages are 1-based; internal indices are 0-based |
| Blank output pages | Forced load of an encrypted file | Do not use `ignoreEncryption` |
| File size explodes | Resources embedded repeatedly | Compress after merging, or output in batches |
| Bookmarks disappeared | Only page content was copied | Rebuild the outline if needed |
| Phone tab crashes | File too large | Cap input size |

## 7. Takeaways

- Merge and split share one model: read pages → new document → save
- The difficulty is not the API but the edges: encryption, size, forms, and bookmarks
- In-browser processing only works with bounded file sizes; above ~50 MB, tell the user to switch devices

Next: optimizing SVG — the same parse → transform → serialize shape, but all of it at the text level.
