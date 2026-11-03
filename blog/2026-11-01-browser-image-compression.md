---
slug: browser-image-compression
title: 用 Canvas 在浏览器里压缩图片：从解码到导出的完整实现
authors: [lxhanesser]
tags: [技术, 在线工具]
date: 2026-11-01T09:00:00+08:00
description: 不装软件、不上传服务器，只用浏览器原生 API 把几 MB 的照片压到几百 KB。本文从解码、缩放、编码三步讲起，给出可直接运行的完整代码，并整理了一份真实的报错对照表。
---

把一张 4 MB 的手机照片压到 300 KB，过去要装软件、传网盘、等处理。现在浏览器自己就能做：`createImageBitmap` 解码、`canvas` 缩放、`toBlob` 编码，三步串起来就是一条完整的压缩流水线。

这篇文章给出一个**可以直接运行**的实现，并解释每一步为什么这么写。

{/* truncate */}

## 一、先把流程看清楚

<img src="/img/blog/browser-compress/fig1-pipeline.svg" alt="浏览器图片压缩流程：选择文件、解码、缩放、编码、下载，全程不上传" width="1000" height="300" loading="lazy" />

整条链路只有五个动作，全部发生在内存里：

1. **选择文件** —— `<input type="file">` 或拖拽，拿到 `File` 对象
2. **解码** —— `createImageBitmap(file)` 把压缩数据变成像素
3. **缩放** —— 画到一张指定尺寸的 `<canvas>` 上
4. **编码** —— `canvas.toBlob(type, quality)` 得到新的压缩数据
5. **下载** —— 把 `Blob` 变成 `<a download>` 的地址

没有任何一步需要服务器。文件从头到尾没有离开你的设备。

## 二、最小可用实现

```js
// compress.js
const SUPPORTED = new Set(['image/jpeg', 'image/png', 'image/webp']);

export async function compressImage(file, options = {}) {
  const {
    maxWidth = 1920,   // 长边上限，超过才缩放
    quality = 0.8,     // 0–1，仅对有损格式有效
    type = 'image/webp',
  } = options;

  if (!SUPPORTED.has(file.type)) {
    throw new Error(`不支持的格式：${file.type || '未知'}`);
  }

  // 1) 解码：imageOrientation 让 EXIF 方向生效
  const bitmap = await createImageBitmap(file, {imageOrientation: 'from-image'});

  // 2) 计算目标尺寸：只缩不放
  const scale = Math.min(1, maxWidth / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  // 3) 画到画布
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.(); // 及时释放解码占用的内存

  // 4) 编码
  const blob = await new Promise((resolve) => {
    canvas.toBlob(resolve, type, quality);
  });
  if (!blob) {
    throw new Error('编码失败：浏览器可能不支持该格式');
  }

  return {blob, width, height};
}

// 触发下载
export function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  // 立刻回收会让部分浏览器下载失败，延迟一下
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
```

调用：

```js
const input = document.querySelector('input[type=file]');
input.addEventListener('change', async (event) => {
  const file = event.target.files[0];
  const {blob} = await compressImage(file, {maxWidth: 1600, quality: 0.75});
  console.log(`${(file.size / 1024).toFixed(0)} KB → ${(blob.size / 1024).toFixed(0)} KB`);
  download(blob, 'compressed.webp');
});
```

## 三、逐段解释

### 1. 解码：为什么要 `imageOrientation: 'from-image'`

手机拍照时，传感器方向是固定的，方向信息写在 EXIF 里而不是像素里。如果解码时忽略它，竖拍的照片会横过来。

`createImageBitmap(file, {imageOrientation: 'from-image'})` 会在解码阶段就把方向应用好，后面的缩放和编码都拿到「正的」像素，不需要自己读 EXIF 再旋转。

> 如果目标浏览器不支持 `createImageBitmap`（老版本 Safari），退路是 `new Image()` + `URL.createObjectURL()`，再等 `decode()` 完成。

### 2. 缩放：只缩不放，且只缩一次

```js
const scale = Math.min(1, maxWidth / Math.max(bitmap.width, bitmap.height));
```

- `Math.min(1, …)` 保证小图不会被放大 —— 放大只会糊，不会更清晰
- 用长边计算，横竖图都能落在 `maxWidth` 以内
- 只做一次缩放。反复画到不同尺寸的画布上，每次都是一次重采样，画质会阶梯式下降

### 3. 编码：质量参数只对有损格式有效

| 输出格式 | 质量参数 | 说明 |
|---|---|---|
| `image/webp` | ✅ 生效 | 体积最小，现代浏览器都支持 |
| `image/jpeg` | ✅ 生效 | 兼容性最好，无透明通道 |
| `image/png` | ❌ 无效 | 无损格式，忽略 quality，体积通常不降反升 |

所以「压不动 PNG」不是代码写错了，是格式本身没给压缩留余地。想显著变小，必须换成 WebP 或 JPEG。

### 4. 下载：`revokeObjectURL` 别调太早

`URL.createObjectURL()` 创建的地址在页面生命周期内一直有效，直到被显式回收。如果 `a.click()` 之后立刻 `revokeObjectURL`，部分浏览器（尤其移动端）会来不及读取，下载直接失败。延迟几秒回收是成本最低的稳妥做法。

## 四、按目标体积反推质量

用户往往不是要「质量 80」，而是「不超过 500 KB」。这时可以用两三次试编码逼近：

```js
export async function compressToTarget(file, targetBytes, {maxAttempts = 4} = {}) {
  let low = 0.3;
  let high = 0.95;
  let best = null;

  for (let i = 0; i < maxAttempts; i++) {
    const quality = (low + high) / 2;
    const {blob} = await compressImage(file, {quality, maxWidth: 1600});
    best = blob;

    if (blob.size > targetBytes) {
      high = quality;   // 太大，降质量
    } else {
      low = quality;    // 够小，试着提质量
    }
  }

  return best;
}
```

二分四次，质量精度大约 ±4%，通常足够。代价是编码 4 次 —— 一张 4000×3000 的图，每次编码约 100–300 ms，可以接受。

## 五、常见问题排查

| 现象 | 原因 | 处理 |
|---|---|---|
| `toBlob` 回调得到 `null` | 画布尺寸为 0，或图片跨域污染了画布 | 检查 `width/height` 是否 ≥ 1；跨域图片需 `crossOrigin` |
| 压缩后反而更大 | 输出是 PNG，或原图本来就是高压缩率 WebP | 换成 WebP/JPEG；先比较原图体积 |
| 竖图变横图 | 解码时没应用 EXIF 方向 | 用 `imageOrientation: 'from-image'` |
| 移动端直接崩 | 超大图（数万像素）超出画布上限 | 先按 `maxWidth` 缩小再画；分块处理 |
| 下载没反应 | `revokeObjectURL` 调用过早 | 延迟 10 秒回收 |
| Safari 上质量参数像没生效 | 旧版 WebKit 对 WebP 编码支持不完整 | 检测支持性，回退到 JPEG |

### 检测 WebP 编码支持

```js
async function canEncodeWebp() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1;
  const blob = await new Promise((r) => canvas.toBlob(r, 'image/webp', 0.8));
  return Boolean(blob && blob.type === 'image/webp');
}
```

`blob.type` 才是真相：浏览器不支持时会静默回退成 `image/png`。

## 六、小结

- 三步核心：`createImageBitmap` 解码 → `canvas` 缩放 → `toBlob` 编码
- 三个最容易踩的坑：EXIF 方向、PNG 的质量参数、`revokeObjectURL` 的时机
- 想精确控制体积，用二分试编码，四次足够

下一篇讲二维码：同样不依赖任何库，从字节编码一路算到矩阵。
