---
slug: pixel-art-median-cut
title: 像素画降采样：从照片到有限调色板
authors: [lxhanesser]
tags: [技术, 在线工具]
date: 2026-11-03T20:00:00+08:00
description: 把照片变成像素画，关键不是把图缩小，而是缩小之后如何把几万种颜色压到 16 色。本文用中位切分法实现调色板提取与最近色映射，并说明抖动什么时候该加、什么时候不该加。
---

「像素画滤镜」看起来是缩小图片，其实包含两个独立步骤：

1. **降采样** —— 把 4000×3000 压到 64×48
2. **量化** —— 把上百万种颜色压到 16 或 32 种

第二步才是决定「像不像像素画」的关键。直接用最近邻缩小，会得到一张又糊又脏的图；先平均再量化，轮廓才干净。

{/* truncate */}

## 一、流程

<img src="/img/blog/pixel-art/fig1-pipeline.svg" alt="像素画生成流程：降采样、中位切分取调色板、最近色映射、整数倍放大导出" width="1000" height="280" loading="lazy" />

## 二、降采样：先平均，再放大

```js
export function downsample(image, targetWidth) {
  const scale = targetWidth / image.width;
  const w = Math.max(1, Math.round(targetWidth));
  const h = Math.max(1, Math.round(image.height * scale));

  const small = document.createElement('canvas');
  small.width = w;
  small.height = h;

  const ctx = small.getContext('2d', {willReadFrequently: true});
  ctx.imageSmoothingEnabled = true;      // 平均采样，轮廓更干净
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(image, 0, 0, w, h);

  return {canvas: small, width: w, height: h};
}
```

要的是**平均**而不是「取最近的一个像素」。最近邻会让边缘出现锯齿状的杂质，量化后尤其明显。

## 三、中位切分：从几万色到 16 色

中位切分（median cut）的思路很直接：

1. 把所有像素放进一个「颜色盒子」
2. 找到**跨度最大**的颜色通道
3. 按该通道排序，从中间切成两半
4. 重复直到盒子数达到目标颜色数
5. 每个盒子的平均色就是调色板中的一个颜色

```js
function medianCut(pixels, count) {
  let boxes = [pixels];

  while (boxes.length < count) {
    // 选像素最多、且还有颜色跨度的盒子
    let target = -1;
    let bestScore = -1;
    for (let i = 0; i < boxes.length; i++) {
      if (boxes[i].length < 2) continue;
      const range = maxChannelRange(boxes[i]);
      const score = range * Math.log2(boxes[i].length + 1);
      if (score > bestScore) {
        bestScore = score;
        target = i;
      }
    }
    if (target === -1) break;

    const box = boxes[target];
    const channel = widestChannel(box);
    box.sort((a, b) => a[channel] - b[channel]);

    const mid = Math.floor(box.length / 2);
    boxes.splice(target, 1, box.slice(0, mid), box.slice(mid));
  }

  return boxes.map(averageColor);
}
```

辅助函数：

```js
function maxChannelRange(box) {
  let max = 0;
  for (let c = 0; c < 3; c++) {
    let lo = 255;
    let hi = 0;
    for (const p of box) {
      lo = Math.min(lo, p[c]);
      hi = Math.max(hi, p[c]);
    }
    max = Math.max(max, hi - lo);
  }
  return max;
}

function widestChannel(box) {
  let best = 0;
  let bestRange = -1;
  for (let c = 0; c < 3; c++) {
    let lo = 255;
    let hi = 0;
    for (const p of box) {
      lo = Math.min(lo, p[c]);
      hi = Math.max(hi, p[c]);
    }
    if (hi - lo > bestRange) {
      bestRange = hi - lo;
      best = c;
    }
  }
  return best;
}

function averageColor(box) {
  const sum = [0, 0, 0];
  for (const p of box) {
    sum[0] += p[0];
    sum[1] += p[1];
    sum[2] += p[2];
  }
  return sum.map((v) => Math.round(v / box.length));
}
```

`score = range × log2(n)` 是个实用启发式：既优先跨度大的盒子，也避免把只有几十个像素的盒子拆得太细。

## 四、最近色映射

有了调色板，把每个像素替换成最接近的颜色：

```js
export function quantize(imageData, palette) {
  const {data} = imageData;
  const cache = new Map(); // 相同颜色只算一次

  for (let i = 0; i < data.length; i += 4) {
    const key = (data[i] << 16) | (data[i + 1] << 8) | data[i + 2];
    let idx = cache.get(key);

    if (idx === undefined) {
      let best = 0;
      let bestDist = Infinity;
      for (let p = 0; p < palette.length; p++) {
        const [r, g, b] = palette[p];
        const dr = data[i] - r;
        const dg = data[i + 1] - g;
        const db = data[i + 2] - b;
        // 人眼对绿色更敏感，加权距离效果更好
        const dist = 2 * dr * dr + 4 * dg * dg + 3 * db * db;
        if (dist < bestDist) {
          bestDist = dist;
          best = p;
        }
      }
      cache.set(key, best);
      idx = best;
    }

    const [r, g, b] = palette[idx];
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
  }

  return imageData;
}
```

缓存很重要：一张 64×48 的图有 3,072 个像素，但颜色可能只有几百种，缓存能把比较次数降一个数量级。

## 五、放大导出

```js
export function upscale(canvas, factor = 8) {
  const out = document.createElement('canvas');
  out.width = canvas.width * factor;
  out.height = canvas.height * factor;

  const ctx = out.getContext('2d');
  ctx.imageSmoothingEnabled = false; // 放大必须关掉插值
  ctx.drawImage(canvas, 0, 0, out.width, out.height);
  return out;
}
```

放大时**必须** `imageSmoothingEnabled = false`，否则又会变回模糊。

## 六、抖动：什么时候加

| 情况 | 建议 |
|---|---|
| 照片类、颜色连续 | 加有序抖动（Bayer 4×4），避免色带 |
| 图标、像素画原作 | 不加，抖动会破坏像素感 |
| 颜色数 ≤ 8 | 加抖动收益明显 |
| 输出要放大展示 | 不加，抖动点会被放大成噪点 |

## 七、排查表

| 现象 | 原因 | 处理 |
|---|---|---|
| 结果又糊又脏 | 用了最近邻降采样 | 改平均采样 |
| 颜色数明显不够 | 调色板提取没按跨度切分 | 检查 median cut 的切分策略 |
| 放大后模糊 | 放大时开了平滑 | `imageSmoothingEnabled = false` |
| 处理很慢 | 每个像素都遍历调色板 | 加颜色缓存 |
| 出现色带 | 颜色少且无抖动 | 加 Bayer 抖动 |
| 透明区域变黑 | 忽略了 alpha | 保留 alpha 或用纯色背景 |

## 八、小结

- 像素画 = **降采样 + 量化**，两步都不能省
- 降采样用平均，放大用最近邻
- 中位切分的关键是「按最大跨度通道切」
- 最近色映射加缓存，性能差距很大

这一组教程到此结束。九篇文章覆盖了图片、PDF、二维码、SVG、搜索与游戏换算 —— 它们的共同点是：**都能在浏览器里完成，不需要服务器。**
