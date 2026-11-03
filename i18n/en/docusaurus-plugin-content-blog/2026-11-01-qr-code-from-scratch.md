---
slug: qr-code-from-scratch
title: "Building a QR code generator from scratch: byte mode, Reed–Solomon, matrix layout"
authors: [lxhanesser]
tags: [Engineering, Web tools]
date: 2026-11-01T14:00:00+08:00
description: No QR library, no shortcuts — start from UTF-8 bytes, compute the Reed–Solomon error-correction codewords, lay out the matrix, pick a mask, and draw it on canvas. Complete runnable code plus the mistakes that actually break scanning.
---

Plenty of libraries generate QR codes. Far fewer explain why the modules sit where they do. This article uses no third-party code: starting from a piece of text, it computes the black-and-white matrix and draws it on a canvas.

By the end you will know why a higher error-correction level makes the grid denser for the same text, why a QR code needs a margin, and why masking is not encryption.

{/* truncate */}

## 1. The pipeline

<img src="/img/blog/qr-from-scratch/fig1-pipeline-en.svg" alt="QR code generation pipeline: text, byte encoding, error correction, matrix and mask, canvas drawing" width="1000" height="320" loading="lazy" />

The first four steps decide whether it scans at all; the fifth only decides how it looks.

## 2. Step 1: text to codewords

QR supports numeric, alphanumeric, byte, and kanji modes. For generality we use **byte mode**: UTF-8 encode the text and treat both the length and the payload as bytes.

One data codeword is 8 bits. In byte mode the payload starts with:

```
0100            ← mode indicator (byte mode)
<8-bit length>  ← versions 1–9 use 8 bits for the byte count
<data bytes…>
```

Then pad:

1. up to four `0` terminator bits
2. zero bits to the next byte boundary
3. alternate `0xEC` and `0x11` until the data capacity is full

The version sets the capacity. To keep this article focused, support versions 1–3 at error-correction level M (about 15% recovery):

| Version | Matrix | Data codewords | ECC codewords | Byte capacity (M) |
|---|---|---|---|---|
| 1 | 21×21 | 16 | 10 | 14 |
| 2 | 25×25 | 28 | 16 | 26 |
| 3 | 29×29 | 44 | 26 | 42 |

```js
const VERSIONS = {
  1: {size: 21, data: 16, ecc: 10},
  2: {size: 25, data: 28, ecc: 16},
  3: {size: 29, data: 44, ecc: 26},
};

function pickVersion(byteLength) {
  // Two codewords are consumed by the mode indicator and length field.
  for (const v of [1, 2, 3]) {
    if (byteLength <= VERSIONS[v].data - 2) return v;
  }
  throw new Error('Text too long — shorten it or lower the error-correction level');
}
```

## 3. Step 2: Reed–Solomon error correction

The error-correction codewords let a scanner reconstruct the payload even when part of the symbol is damaged.

QR uses Reed–Solomon over **GF(256)**. Build exponent and logarithm tables with the primitive polynomial `0x11D`:

```js
const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);

(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = x;
    LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d; // primitive polynomial
  }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
})();

const mul = (a, b) => (a === 0 || b === 0 ? 0 : EXP[LOG[a] + LOG[b]]);
```

The generator polynomial is `(x - α^0)(x - α^1)…(x - α^(n-1))`:

```js
function generatorPoly(n) {
  let poly = [1];
  for (let i = 0; i < n; i++) {
    const next = new Array(poly.length + 1).fill(0);
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= poly[j];
      next[j + 1] ^= mul(poly[j], EXP[i]);
    }
    poly = next;
  }
  return poly;
}
```

Treat the data codewords as a polynomial, divide by the generator, and keep the remainder:

```js
function reedSolomon(data, eccCount) {
  const gen = generatorPoly(eccCount);
  const remainder = new Uint8Array(eccCount);

  for (const byte of data) {
    const factor = byte ^ remainder[0];
    remainder.copyWithin(0, 1);
    remainder[eccCount - 1] = 0;
    for (let i = 0; i < eccCount; i++) {
      remainder[i] ^= mul(gen[i + 1], factor);
    }
  }
  return remainder;
}
```

## 4. Step 3: layout

A QR matrix holds two kinds of modules: **function patterns** (finders, timing, alignment, format information) and **data modules**. Function patterns are fixed and do not carry data.

### 4.1 Finders and timing

- Three 7×7 finder patterns at top-left, top-right, bottom-left
- A one-module white separator around each finder
- Row 6 and column 6 carry alternating timing modules

### 4.2 Format information

The 15 format bits encode the error-correction level and the mask number, protected by BCH(15,5) and XORed with `0x5412`:

```js
function formatBits(ecBits, mask) {
  let data = (ecBits << 3) | mask; // L=01, M=00, Q=11, H=10
  let rem = data;
  for (let i = 0; i < 10; i++) {
    rem <<= 1;
    if (rem & 0x400) rem ^= 0x537;
  }
  return ((data << 10) | rem) ^ 0x5412;
}
```

For level M, `ecBits` is `0b00`.

### 4.3 Placing the data

Data starts at the **bottom-right**, moves in two-column strips, snakes upward then downward, and skips function modules. Column 6 (the timing column) is skipped entirely.

```js
function placeData(modules, reserved, codewords, size) {
  const isFunction = (x, y) => reserved[y][x];
  let bitIndex = 0;
  const totalBits = codewords.length * 8;

  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5; // skip the timing column
    for (let vert = 0; vert < size; vert++) {
      for (let j = 0; j < 2; j++) {
        const x = right - j;
        const upward = ((right + 1) & 2) === 0;
        const y = upward ? size - 1 - vert : vert;
        if (!isFunction(x, y) && bitIndex < totalBits) {
          const byte = codewords[bitIndex >> 3];
          modules[y][x] = ((byte >> (7 - (bitIndex & 7))) & 1) === 1;
          bitIndex++;
        }
      }
    }
  }
}
```

## 5. Step 4: choosing a mask

Masking is not encryption. Its only job is to **break up runs of the same colour** so the locator patterns stay findable.

The standard defines eight masks:

| Index | Condition (x = column, y = row) |
|---|---|
| 0 | `(x + y) % 2 === 0` |
| 1 | `y % 2 === 0` |
| 2 | `x % 3 === 0` |
| 3 | `(x + y) % 3 === 0` |
| 4 | `(⌊y/2⌋ + ⌊x/3⌋) % 2 === 0` |
| 5 | `(x*y) % 2 + (x*y) % 3 === 0` |
| 6 | `((x*y) % 2 + (x*y) % 3) % 2 === 0` |
| 7 | `((x + y) % 2 + (x*y) % 3) % 2 === 0` |

After applying each candidate, score it with the four penalty rules (runs, 2×2 blocks, finder-like patterns, dark/light balance) and keep the lowest score.

```js
const MASKS = [
  (x, y) => (x + y) % 2 === 0,
  (x, y) => y % 2 === 0,
  (x, y) => x % 3 === 0,
  (x, y) => (x + y) % 3 === 0,
  (x, y) => (Math.floor(y / 2) + Math.floor(x / 3)) % 2 === 0,
  (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
  (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
  (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
];
```

## 6. Step 5: drawing on canvas

```js
function draw(matrix, canvas, {scale = 8, quiet = 4, dark = '#000', light = '#fff'} = {}) {
  const size = matrix.length;
  const total = (size + quiet * 2) * scale;
  canvas.width = total;
  canvas.height = total;

  const ctx = canvas.getContext('2d');
  ctx.fillStyle = light;
  ctx.fillRect(0, 0, total, total);
  ctx.fillStyle = dark;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (matrix[y][x]) {
        ctx.fillRect((x + quiet) * scale, (y + quiet) * scale, scale, scale);
      }
    }
  }
}
```

Two parameters decide whether it scans:

- `quiet = 4` — four modules of margin on every side; the single most common omission
- `scale ≥ 4` — at least four pixels per module for screens and print

## 7. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Will not scan | Quiet zone too small | Leave at least four modules of margin |
| Will not scan | Low contrast | Pure black on pure white; no grey |
| Content truncated | Version too small | Pick version by byte length, or lower ECC |
| Some phones scan, others do not | Modules too small | Raise `scale`; export at least 300×300 |
| Breaks after adding a logo | Damage exceeds ECC capacity | Raise the ECC level and shrink the logo |
| Scans as mojibake | Byte mode not treated as UTF-8 | Encode and decode as UTF-8 on both ends |

## 8. Takeaways

The full chain is **byte encoding → Reed–Solomon → matrix layout → mask selection → drawing**.

The maths is rarely what breaks a QR code. The three engineering details — quiet zone, contrast, module size — account for almost every "it will not scan" report.

Next: merging and splitting PDFs in the browser.
