---
slug: qr-code-from-scratch
title: 从零实现二维码生成器：字节编码、纠错码与矩阵布局
authors: [lxhanesser]
tags: [技术, 在线工具]
date: 2026-11-01T14:00:00+08:00
description: 不用任何二维码库，从 UTF-8 字节出发，自己算 Reed–Solomon 纠错码、排布矩阵、挑选掩码，最后画到 canvas 上。文中给出可运行的完整实现与踩坑清单。
---

随手生成二维码的库很多，但「为什么这样排」很少有人讲清楚。这篇文章不调用任何第三方库，从一段文本开始，一步步算出黑白矩阵，最后画到 canvas 上。

读完你会知道：为什么同样的文字，纠错等级越高格子越密；为什么二维码四周必须留白；为什么「掩码」不是加密。

{/* truncate */}

## 一、整体流程

<img src="/img/blog/qr-from-scratch/fig1-pipeline.svg" alt="二维码生成流程：文本、字节编码、纠错码、矩阵布局与掩码、Canvas 绘制、扫描验证" width="1000" height="320" loading="lazy" />

前四步决定「能不能扫出来」，第五步只决定「画得好不好看」。

## 二、第 1 步：把文本变成码字

二维码支持数字、字母数字、字节、汉字等多种模式。为了通用，我们统一用**字节模式**：把文本按 UTF-8 编码成字节，长度和内容都按字节算。

一个数据码字（codeword）是 8 位。字节模式下，数据区开头是：

```
0100            ← 模式指示符（字节模式）
<8 位长度>       ← 版本 1–9 用 8 位表示字节数
<数据字节…>
```

然后是收尾：

1. 补 `0000` 终止符（最多 4 位，不足则少补）
2. 补 0 到字节边界
3. 交替填充 `0xEC`、`0x11` 直到填满数据容量

版本决定容量。这里先支持版本 1–3、纠错等级 M（约 15% 容错）：

| 版本 | 矩阵尺寸 | 数据码字 | 纠错码字 | 字节容量（M） |
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
  // 字节容量 = 数据码字 - 2（模式 + 长度各占一部分，保守留 2）
  for (const v of [1, 2, 3]) {
    if (byteLength <= VERSIONS[v].data - 2) return v;
  }
  throw new Error('文本太长，请缩短或降低纠错等级');
}
```

## 三、第 2 步：Reed–Solomon 纠错码

纠错码的作用是：即使图案被挡住一部分，扫描器也能还原出原始数据。

二维码在 **GF(256)** 上做 Reed–Solomon。先建两张表：指数表和对数表，用本原多项式 `0x11D`。

```js
const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);

(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = x;
    LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d; // 本原多项式
  }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
})();

const mul = (a, b) => (a === 0 || b === 0 ? 0 : EXP[LOG[a] + LOG[b]]);
```

生成多项式是 `(x - α^0)(x - α^1)…(x - α^(n-1))`：

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

把数据码字当作多项式，除以生成多项式，余数就是纠错码：

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

## 四、第 3 步：排布矩阵

矩阵里有两类模块：**功能图形**（定位、时序、对齐、格式信息）和**数据模块**。功能图形不吃数据，位置固定。

### 4.1 定位图形与时序线

- 三个 7×7 的「回」字形定位图形，分别在左上、右上、左下
- 每个定位图形外留一圈白色分隔带
- 第 6 行与第 6 列是黑白相间的时序线

### 4.2 格式信息

格式信息 15 位，记录纠错等级与掩码编号，用 BCH(15,5) 编码，再异或 `0x5412`：

```js
function formatBits(ecBits, mask) {
  let data = (ecBits << 3) | mask; // ecBits: L=01, M=00, Q=11, H=10
  let rem = data;
  for (let i = 0; i < 10; i++) {
    rem <<= 1;
    if (rem & 0x400) rem ^= 0x537;
  }
  return ((data << 10) | rem) ^ 0x5412;
}
```

`ecBits` 对 M 级就是 `0b00`。

### 4.3 数据放置

数据从**右下角**开始，以两列为一个单位，蛇形向上、再向下，遇到功能模块跳过；第 6 列（时序线）整列跳过。

```js
function placeData(modules, reserved, codewords, size) {
  const isFunction = (x, y) => reserved[y][x];
  let bitIndex = 0;
  const totalBits = codewords.length * 8;

  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5; // 跳过时序列
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

## 五、第 4 步：挑一个掩码

掩码不是加密，它的唯一目的是**把黑白分布打散**，避免大片同色导致定位失败。

标准定义了 8 种掩码：

| 编号 | 条件（x 为列，y 为行） |
|---|---|
| 0 | `(x + y) % 2 === 0` |
| 1 | `y % 2 === 0` |
| 2 | `x % 3 === 0` |
| 3 | `(x + y) % 3 === 0` |
| 4 | `(⌊y/2⌋ + ⌊x/3⌋) % 2 === 0` |
| 5 | `(x*y) % 2 + (x*y) % 3 === 0` |
| 6 | `((x*y) % 2 + (x*y) % 3) % 2 === 0` |
| 7 | `((x + y) % 2 + (x*y) % 3) % 2 === 0` |

每种掩码算完后按标准打四个罚分（连续同色、2×2 同色块、类定位图形、黑白比例），取罚分最低的那个。

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

## 六、第 5 步：画到 canvas

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

两个参数决定能不能扫出来：

- `quiet = 4`：四周留 4 个模块的静区 —— 这是最常被忽略的一条
- `scale ≥ 4`：每个模块至少 4 个像素，打印或屏幕显示都够清晰

## 七、常见问题排查

| 现象 | 原因 | 处理 |
|---|---|---|
| 扫不出来 | 静区不足 | 四周留 ≥ 4 个模块的空白 |
| 扫不出来 | 对比度太低 | 深色用纯黑，浅色用纯白，别用灰 |
| 内容被截断 | 版本选小了 | 按字节数选版本，或降低纠错等级 |
| 部分手机能扫、部分不能 | 模块太小 | 提高 `scale`，导出至少 300×300 |
| 中间贴了 logo 就扫不出 | 遮挡超过纠错能力 | 换成更高纠错等级，控制 logo 面积 |
| 扫出来是乱码 | 字节模式没按 UTF-8 | 编码与解码都统一 UTF-8 |

## 八、小结

二维码的完整链路是：**字节编码 → Reed–Solomon 纠错 → 矩阵排布 → 掩码择优 → 绘制**。

真正容易翻车的不是数学，而是三个工程细节：静区、对比度、模块尺寸。图算得再对，静区不够一样扫不出来。

下一篇换一个方向：在浏览器里合并与拆分 PDF。
