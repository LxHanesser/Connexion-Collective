---
slug: handwritten-ico-zip
title: "Two encoders, written by hand: ICO and ZIP"
authors: [lxhanesser]
tags: [Web tools, Engineering]
date: 2026-10-26T09:20:00+08:00
description: Both the ICO converter and the datapack generator have to conjure binary files in the browser. Pulling in two libraries for two download buttons felt wrong, so I wrote the formats myself.
---

Two of the new tools have to produce files from nothing: one packs PNGs into a `.ico`, the other packs text into a `.zip`.

The usual move is to install a library for each. But both formats are less complicated than their reputation suggests.

{/* truncate */}

## ICO: a six-byte header and a directory

```
ICONDIR        6 bytes      reserved(2) + type(2, 1=icon) + count(2)
ICONDIRENTRY   16 bytes×N   width, height, palette, reserved, planes, depth, size, offset
payload                     one image per size
```

Since Vista, an ICO may embed PNG data directly, so the payload is just several PNGs concatenated — no BMP encoder needed.

Two details that bite:

- **A 256 size is stored as 0.** Width and height are one byte each, so 256 cannot fit; the spec uses 0.
- **Offsets are from the start of the file**, not from the payload. The first image sits at `6 + 16 × count`.

Verification is straightforward: read the bytes back. The first four should be `00 00 01 00`; then follow each directory entry's offset and expect the PNG signature `89 50 4E 47`. Four sizes, four signatures — if they line up, the directory arithmetic is right.

## ZIP: two structures, really

A full ZIP implementation is a lot (deflate, data descriptors, ZIP64). In **store mode only** it is three pieces:

```
local header + data   (one per file)
central directory     (one record per file)
EOCD                  (where the directory is, and how many entries)
```

No compression, so no deflate; you just need correct **CRC32**, offsets and lengths.

The parts that matter:

- **CRC32 is over the raw bytes**, not the string length. Build the `Uint8Array` first, then checksum it.
- **Name length is in bytes.** Non-ASCII names are multi-byte in UTF-8, and you must set flag `0x0800` so the unzipper knows the encoding.
- **Central directory offsets point at the local header**, not at the data.
- The EOCD needs the directory's start offset and total size. One wrong byte and the archive is dead.

I verified the output with the OS unzipper: `pack.mcmeta`, the function file and the tag JSON all extract fine, which means the CRCs and offsets are correct.

## What it costs

The trade-off is **no compression**. For a datapack of a few kilobytes, store mode is plenty; for tens of megabytes of assets you want a real deflate implementation.

There is also no tolerance: no input validation, no ZIP64 (over 4 GB or 65,535 files). For "produce a download" that never matters.

What you get instead: **zero dependencies, zero supply-chain surface, fully inspectable output**. Both encoders together are under 200 lines — you can read them once and know exactly what they do, which is more reassuring than two more packages in `node_modules`.
