---
slug: canvas-watermark-batch
title: 用 Canvas 加水印并批量导出：九宫格定位、可读性与并发控制
authors: [lxhanesser]
tags: [技术, 在线工具]
date: 2026-11-02T20:00:00+08:00
description: 水印不是「画一段字」这么简单：位置、透明度、描边、角度都会影响可读性，批量处理还容易把浏览器卡死。本文给出完整实现，并解释多文件下载为什么会被拦截。
---

给图片加水印，直觉上就是「在图上写一行字」。真正做起来，问题集中在三处：**放哪里**、**看不清怎么办**、**一次处理 50 张怎么不卡死**。

{/* truncate */}

<img src="/img/blog/canvas-watermark/fig1-layout.svg" alt="水印九宫格定位与批量处理流程：解码、绘制、编码、导出" width="1000" height="300" loading="lazy" />

## 一、九宫格定位

先在画布坐标系里算出锚点，再按 `textAlign` / `textBaseline` 对齐，代码会比「一堆 if」短很多：

```js
const POSITIONS = {
  'top-left': [0.05, 0.05, 'left', 'top'],
  'top-center': [0.5, 0.05, 'center', 'top'],
  'top-right': [0.95, 0.05, 'right', 'top'],
  'middle-left': [0.05, 0.5, 'left', 'middle'],
  center: [0.5, 0.5, 'center', 'middle'],
  'middle-right': [0.95, 0.5, 'right', 'middle'],
  'bottom-left': [0.05, 0.95, 'left', 'bottom'],
  'bottom-center': [0.5, 0.95, 'center', 'bottom'],
  'bottom-right': [0.95, 0.95, 'right', 'bottom'],
};

export function drawText(ctx, text, {position = 'bottom-right', size = 0.04, color = '#fff', opacity = 0.7} = {}) {
  const [rx, ry, align, baseline] = POSITIONS[position];
  const fontSize = Math.max(10, Math.round(ctx.canvas.width * size));

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  ctx.font = `600 ${fontSize}px system-ui, sans-serif`;
  ctx.fillText(text, ctx.canvas.width * rx, ctx.canvas.height * ry);
  ctx.restore();
}
```

用**画布宽度的比例**而不是固定像素：同一套参数在 800px 和 4000px 的图上看起来才一致。

## 二、看不清怎么办

白色文字压在浅色背景上会消失。两种稳妥做法：

### 1. 描边（推荐）

```js
ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
ctx.lineWidth = Math.max(1, fontSize / 14);
ctx.lineJoin = 'round';
ctx.strokeText(text, x, y);
ctx.fillText(text, x, y);
```

先描边再填充，文字在任何背景上都能读出来。

### 2. 半透明底衬

```js
const padding = fontSize * 0.4;
const metrics = ctx.measureText(text);
const w = metrics.width + padding * 2;
const h = fontSize + padding * 2;
ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
ctx.fillRect(x - w, y - h, w, h); // 具体偏移取决于对齐方式
```

底衬会遮挡更多画面，适合对比度极端的照片，不太适合信息密集的截图。

## 三、旋转水印

```js
ctx.save();
ctx.globalAlpha = 0.25;
ctx.translate(ctx.canvas.width / 2, ctx.canvas.height / 2);
ctx.rotate((-30 * Math.PI) / 180);
ctx.textAlign = 'center';
ctx.font = `700 ${Math.round(ctx.canvas.width * 0.08)}px system-ui, sans-serif`;
ctx.fillStyle = '#fff';
ctx.fillText('CONFIDENTIAL', 0, 0);
ctx.restore();
```

旋转水印更醒目，但也会遮挡内容。用于「内部预览」这类需要明显标记的场景更合适。

## 四、批量处理：别让主线程闲着

一次处理几十张图，如果写成 `for` 循环里 `await`，界面会持续卡顿。两个办法：

### 1. 限制并发

```js
export async function mapLimit(items, limit, worker) {
  const results = new Array(items.length);
  let index = 0;

  async function run() {
    while (index < items.length) {
      const current = index++;
      results[current] = await worker(items[current], current);
    }
  }

  await Promise.all(Array.from({length: Math.min(limit, items.length)}, run));
  return results;
}
```

并发数取 `2`（移动端）到 `4`（桌面）比较稳妥：太高会同时解码多张位图，内存直接翻倍。

### 2. 主动让出主线程

```js
const nextFrame = () => new Promise((r) => requestAnimationFrame(r));
// 每处理完一张
await nextFrame();
```

这样进度条能刷新，用户也不会以为页面卡死。

## 五、批量下载为什么会被拦

连续调用多次 `a.click()`，浏览器会把后续点击判定为「非用户手势」，直接忽略。常见解法：

| 方案 | 说明 |
|---|---|
| 打包成 ZIP | 体验最好，但要引 `fflate` 之类的库 |
| 逐个提供下载按钮 | 实现最简单，让用户自己点 |
| 间隔触发 | 不可靠，不同浏览器策略不同 |

给用户一个列表、每行一个「下载」按钮，是最不容易出问题的做法。

## 六、排查表

| 现象 | 原因 | 处理 |
|---|---|---|
| 水印位置随图片大小乱跑 | 用了固定像素 | 改成按画布宽度比例 |
| 白字看不见 | 浅色背景 | 加描边或底衬 |
| 导出后透明变黑 | 用了 JPEG | 改 PNG/WebP |
| 批量时浏览器卡死 | 并发过高 | 限制并发 + 让出主线程 |
| 只能下载第一张 | 连续 `click()` 被拦截 | 改 ZIP 或逐行下载 |
| 外部图片加水印报错 | 画布被跨域污染 | 图片需 `crossOrigin="anonymous"` 且服务端允许 CORS |

## 七、小结

- 位置用比例，不用像素
- 可读性靠描边，不靠调透明度
- 批量处理要限并发、让出主线程
- 多文件下载不要指望连续 `click()`

下一篇换个主题：静态站点怎么做搜索。
