---
slug: online-tools-03-jsquash
title: 接入 jSquash 踩的三个坑
authors: [lxhanesser]
tags: [技术, 在线工具, 前端]
date: 2026-10-25T20:00:00+08:00
description: 一个「init is not a function」引出的 WASM 库接入排查过程。
---

jSquash 把 mozjpeg、libwebp、oxipng 编成了浏览器能用的 WASM 包，API 看起来很简单：`init()` 然后 `encode()`。真正接进去，我踩了三个坑。

{/* truncate */}

## 坑一：入口里没有 init

按直觉写：

```js
import {init, encode} from '@jsquash/webp';
```

运行后控制台只有一句 `e.init is not a function`。翻 `dist` 才发现，包的入口只导出 `encode` 和 `decode`：

```js
// @jsquash/webp/index.js
export {default as encode} from './encode.js';
export {default as decode} from './decode.js';
```

`init` 是 `encode.js` 里的具名导出。于是改成：

```js
const mod = await import('@jsquash/webp/encode.js');
await mod.init({locateFile});
const encode = mod.default;
```

**经验**：包装库的 README 和实际导出经常对不上，直接看 `dist` 里的源码比看文档快。

## 坑二：WASM 从哪里加载

默认情况下，Emscripten 胶水会按模块自身的 URL 去找 `.wasm`。我想自己托管，就把文件放进 `static/wasm/`，然后在 init 时指定：

```js
await init({locateFile: (file) => `/wasm/${file.split('/').pop()}`});
```

注意 libwebp 还有一个 SIMD 版本：库会先用 `wasm-feature-detect` 探测，支持就加载 `webp_enc_simd.wasm`，否则用普通版。**两个文件都要放进去**，否则在支持 SIMD 的机器上直接 404。

## 坑三：oxipng 是另一种风格

前两个是 Emscripten，oxipng 是 wasm-bindgen，初始化方式不同：

```js
const mod = await import('@jsquash/oxipng/optimise.js');
await mod.init('/wasm/squoosh_oxipng_bg.wasm');
const optimise = mod.default;
```

它内部还会判断「是不是 Worker + 有没有多线程」，决定用单线程包还是并行包。我们在主线程用，走的是单线程那个。

## 怎么定位这类问题

- 先在浏览器里抓异常（我用无头浏览器的 CDP 监听 `Runtime.exceptionThrown`）；
- 把 `init` 前后打日志，确认是「没导出」还是「加载失败」；
- 直接读 `node_modules` 里的 `dist`，不看二手文档。

三个坑都不难，但都卡在「文档没说清楚」上。写完这一轮，我对「API 以源码为准」这句话有了新的体会。
