---
slug: svg-optimize-boundaries
title: "The boundaries of SVG optimisation: what to delete, what breaks if you touch it"
authors: [lxhanesser]
tags: [Frontend, Web tools]
date: 2026-10-26T11:40:00+08:00
description: Half of an exported SVG is junk, and the other half is references. Delete the wrong id and the artwork turns blank.
---

An SVG exported from a design tool comes in two sizes: the picture you see, and the file that actually exists.

An 800-byte icon can spend more than 500 bytes on metadata nobody asked for. But cleaning it up requires knowing which bytes are junk and which are load-bearing.

{/* truncate */}

## Safe to delete

| Thing | Example |
|---|---|
| XML declaration | `<?xml version="1.0"?>` |
| Comments | `<!-- Generator: Adobe Illustrator 27.0.0 -->` |
| DOCTYPE | irrelevant to rendering in practice |
| Metadata blocks | RDF/DC copyright blobs inside `<metadata>` |
| Editor-only elements | `<sodipodi:namedview inkscape:zoom="1.5">` |
| Editor-only attributes | `inkscape:label`, `sodipodi:role` |
| Empty groups | `<g></g>` |
| Whitespace between tags | identical rendering once collapsed |

Remove those and the rendered pixels do not change at all.

## Never touch

- **`id` and every reference to it**: `<use href="#a">`, `url(#grad)`, `clip-path`, `filter`, `mask`. Kill an id and you get a blank canvas.
- **`xlink:href`**: the legacy form of the same thing. Leave it alone.
- **Anything inside `<defs>`**: nothing renders directly, everything is a resource.
- **The semantics of `viewBox`**: precision can drop, proportions cannot change.

So the tool only removes things provably unrelated to rendering. It never rewrites path data — that is a different class of optimisation (curve fitting) with much higher risk.

## A real bug: deleting attributes is not enough

My first version stripped `inkscape:` / `sodipodi:` **attributes** with a regex and called it done. The output still contained a `<sodipodi:namedview/>` **element** — no children, but hundreds of bytes of attributes.

So two more rules went in: remove self-closing editor elements, then remove paired `<sodipodi:xxx>…</sodipodi:xxx>` blocks.

The lesson: **when you regex XML, attributes and elements are different dimensions**, and it is easy to only think of one.

## Precision, and the cost of a global regex

Cutting decimals from six places to two typically saves 10–20%. But running `\d+\.\d+` across the whole file also hits things you did not mean to change, like `version="1.1"` becoming `version="1"`.

That does not affect rendering, but it does change meaning. The safer approach is to only touch geometry attributes (`d`, `cx`, `cy`, `r`, `x`, `y`, `width`, `height`, `transform`), which requires parsing tags and roughly doubles the code.

I took the shortcut and exposed precision as a 0–4 setting so the user decides. **That is a deliberate trade-off, not an oversight.**

Worth knowing: at zero decimals circles become polygons and illustration edges go visibly angular. For icons, one or two places is plenty.

## Measured result

A 120×120 test icon with comments, metadata and a namedview:

```
before   853 B
after    285 B   (−67%)
```

Verification was not just "the file got smaller": the output still starts with `<svg`, keeps the `xlink` namespace, retains ids and references, and renders correctly in the preview.

## When not to use this

If the SVG embeds raster data (`<image>` with base64) or leans on lots of `<text>`, the savings are small and the risk of collateral damage is higher. Those files are better cleaned by hand than shoved through a tool.
