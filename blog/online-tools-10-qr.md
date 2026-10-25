---
slug: online-tools-10-qr
title: 二维码：选库的取舍与两个小坑
authors: [lxhanesser]
tags: [技术, 在线工具, 前端]
date: 2026-10-25T21:45:00+08:00
description: 一个零依赖的二维码库，被 exports 字段和中文编码各绊了一次。
---

二维码工具看起来最简单：输入文字，画出黑白格子。真做起来，选库和中文编码各有一个坑。

{/* truncate */}

## 选库：先看依赖

npm 上最流行的是 `qrcode`，功能全，但它依赖 `pngjs`、`yargs`、`dijkstrajs`——对一个「画格子到 canvas」的需求来说太重了。

另一个是 `qrcode-generator`：**零依赖**、作者是二维码规范那本书的作者、2025 年还在维护。它只负责算矩阵，渲染交给我自己，正好。

## 坑一：exports 字段挡路

我想用它的 UTF-8 变体，下意识写了：

```js
import {stringToBytes} from 'qrcode-generator/dist/qrcode_UTF8.mjs';
```

构建直接失败：`Package subpath './dist/qrcode_UTF8.mjs' is not defined by "exports"`。这个包的 `exports` 只允许从根导入。

解决办法反而更简单：根导入拿到 `qrcode` 函数，然后自己实现 UTF-8 字节序列：

```js
import qrcode from 'qrcode-generator';
qrcode.stringToBytes = (s) => Array.from(new TextEncoder().encode(s));
```

`TextEncoder` 是浏览器原生的，比引入一个变体文件还干净。

## 坑二：中文乱码

如果不覆盖 `stringToBytes`，库会按单字节处理每个字符，中文直接乱码。覆盖之后，长度按 UTF-8 字节数算，二维码内容才和输入一致。

顺带一个限制：内容越长，二维码越密，超过容量会抛错。工具里做了 try/catch，提示「内容太长」。

## 渲染与导出

拿到矩阵后自己画：

```js
const count = qr.getModuleCount();
const cell = Math.floor(size / (count + margin * 2));
```

用整数 `cell` 避免半像素模糊，四周留白按 `margin` 算。导出直接 `canvas.toBlob('image/png')`，不需要额外编码器。

## 纠错级别的取舍

L/M/Q/H 四档，级别越高越抗污损，但同样内容会更密。日常用 M 就够；要印在易磨损的物料上再用 Q 或 H。

## 经验

小库的 `exports` 限制经常挡路，但往往能用几行原生代码绕过。选库时「依赖数量」比「功能数量」更值得看。
