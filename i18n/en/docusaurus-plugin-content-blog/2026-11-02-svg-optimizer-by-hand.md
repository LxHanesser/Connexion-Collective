---
slug: svg-optimizer-by-hand
title: "Writing an SVG optimizer by hand: metadata, precision, and a safety boundary"
authors: [lxhanesser]
tags: [Engineering, Web tools]
date: 2026-11-02T09:00:00+08:00
description: SVGs exported from design tools carry editor metadata and coordinates with far more precision than a screen can show. Using the browser's own DOMParser, this builds a working optimizer and explains what must never be removed.
---

Export an SVG from Figma, Illustrator, or Inkscape and roughly half of it is not drawing at all: editor namespaces, layer names, comments, and coordinates like `12.3456789` — precision no screen can display.

This builds a usable optimizer: **clean → compress → serialize**, with an explicit list of things that must not be touched.

{/* truncate */}

## 1. What an optimizer actually does

<img src="/img/blog/svg-optimizer/fig1-pipeline-en.svg" alt="SVG optimization pipeline: read, parse, safety-clean, drop metadata, compress precision, serialize" width="1000" height="280" loading="lazy" />

Four actions, increasing risk:

| Action | Typical gain | Risk |
|---|---|---|
| Drop comments, `<metadata>`, editor attributes | 10–30% | Low |
| Remove empty `<g>`, merge attributes | 5–15% | Medium (references) |
| Reduce numeric precision from 6 to 2 digits | 10–40% | Medium (extreme values distort) |
| Remove `<script>`, event attributes, external refs | Security | Mandatory |

## 2. Safety cleanup comes first

SVG is XML: it can embed `<script>`, `onload` handlers, and `<image href="http://…">` references. Rendering an untrusted SVG as-is means running someone else's code.

```js
const DANGEROUS = new Set(['script', 'foreignObject']);

function sanitize(el) {
  for (const child of [...el.children]) {
    const tag = child.tagName.toLowerCase();
    if (DANGEROUS.has(tag)) {
      child.remove();
      continue;
    }
    for (const attr of [...child.attributes]) {
      const name = attr.name.toLowerCase();
      if (name.startsWith('on')) child.removeAttribute(attr.name);
      if (name === 'href' || name === 'xlink:href') {
        if (/^\s*(javascript|data:text\/html)/i.test(attr.value)) {
          child.removeAttribute(attr.name);
        }
      }
    }
    sanitize(child);
  }
}
```

## 3. Parse and walk

The browser ships the parser; no dependency needed:

```js
export function optimizeSvg(source, {precision = 2} = {}) {
  const doc = new DOMParser().parseFromString(source, 'image/svg+xml');

  const error = doc.querySelector('parsererror');
  if (error) throw new Error('SVG parsing failed: the file may not be valid XML');

  const root = doc.documentElement;
  sanitize(root);
  cleanMetadata(root);
  roundNumbers(root, precision);
  removeEmptyGroups(root);

  return new XMLSerializer().serializeToString(root);
}
```

## 4. Removing what the editor left behind

```js
const EDITOR_ATTRS = [
  'data-name', 'inkscape:label', 'inkscape:groupmode',
  'sodipodi:namedview', 'sodipodi:role',
  'serif:id', 'xml:space',
];

function cleanMetadata(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_COMMENT);
  const comments = [];
  while (walker.nextNode()) comments.push(walker.currentNode);
  for (const node of comments) node.remove();

  for (const el of [...root.querySelectorAll('metadata, sodipodi\\:namedview')]) {
    el.remove();
  }

  for (const el of [root, ...root.querySelectorAll('*')]) {
    for (const name of EDITOR_ATTRS) el.removeAttribute(name);
    for (const attr of [...el.attributes]) {
      if (/^(inkscape|sodipodi|serif|illustrator):/i.test(attr.name)) {
        el.removeAttribute(attr.name);
      }
    }
  }
}
```

> Never remove `id`. It looks like leftover editor noise, but `fill="url(#grad1)"` and `<use href="#icon">` depend on it.

## 5. Compressing precision

Coordinates, path data, and `viewBox` values can all lose digits; one screen pixel is usually one or two decimal places.

```js
function roundNumbers(root, precision) {
  const factor = 10 ** precision;
  const round = (n) => {
    const value = Number(n);
    return Number.isFinite(value) ? String(Math.round(value * factor) / factor) : n;
  };

  for (const el of [root, ...root.querySelectorAll('*')]) {
    const d = el.getAttribute?.('d');
    if (d) {
      el.setAttribute('d', d.replace(/-?\d*\.?\d+(e[-+]?\d+)?/gi, (m) => round(m)));
    }
    for (const attr of [...el.attributes]) {
      if (attr.name === 'd') continue;
      if (/^-?\d*\.?\d+(e[-+]?\d+)?$/i.test(attr.value)) {
        el.setAttribute(attr.name, round(attr.value));
      }
    }
  }
}
```

### Lower is not always better

| Precision | Effect |
|---|---|
| 3–4 digits | Nearly lossless; modest gains |
| **2 digits** | Safe default for icons and illustrations |
| 1 digit | Visible drift on small shapes |
| 0 digits | Curves and thin strokes visibly deform |

Curves (`C`, `Q`, `A`) are more precision-sensitive than lines; keep three digits for small icons.

## 6. Removing empty groups

```js
function removeEmptyGroups(root) {
  let changed = true;
  while (changed) {
    changed = false;
    for (const g of [...root.querySelectorAll('g')]) {
      const hasElement = g.children.length > 0;
      const hasText = [...g.childNodes].some(
        (n) => n.nodeType === Node.TEXT_NODE && n.textContent.trim(),
      );
      if (!hasElement && !hasText) {
        g.remove();
        changed = true;
      }
    }
  }
}
```

## 7. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Gradients or icons disappear | Removed an element or id still referenced | Keep every `id` and `<defs>` |
| Edges look rough | Precision pushed to 0–1 digits | Raise it; use ≥3 for curves |
| Font changes | Removed `font-family` or an external font | Keep font attributes, or convert text to paths |
| Output will not render | Invalid XML after edits | Validate with `DOMParser` first |
| File barely shrank | The bulk is path data | The gain is in precision; verify it actually ran |
| Scripts injected into the page | No safety cleanup | Run `sanitize` before optimizing |

## 8. Takeaways

- Order matters: **clean for safety first, then optimize for size**
- Three things are off-limits: `id`, `defs`, and anything referenced by `url(#…)`
- Two digits is the usual safe precision; three for curves

Next: cropping and rotating images, and the EXIF orientation that trips everyone up.
