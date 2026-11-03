---
slug: image-crop-rotate-exif
title: 图片裁剪、旋转与 EXIF 方向：一次把坐标算对
authors: [lxhanesser]
tags: [技术, 在线工具]
date: 2026-11-02T14:00:00+08:00
description: 手机照片的方向不在像素里，而在 EXIF 里。这篇文章把「显示坐标 → 源图坐标」的换算讲清楚，给出裁剪与旋转的完整实现，并列出方向重复应用、坐标错位这些真实会遇到的坑。
---

裁剪和旋转看起来是最简单的图像操作：选一块区域，画出来。但只要涉及手机照片，就会多出一个隐藏变量 —— **EXIF 方向**。

方向处理错，会出现三种经典 bug：裁剪框选的位置和结果对不上、旋转后图像被压扁、同一张图刷新两次朝向不同。

{/* truncate */}

<img src="/img/blog/image-crop-rotate/fig1-orientation.svg" alt="EXIF 方向的常见取值与坐标系换算：显示坐标与源图坐标" width="1000" height="300" loading="lazy" />

## 一、方向到底存在哪

相机传感器是固定的。竖着拍时，传感器仍然横着记录，只是往 EXIF 里写一个「Orientation」标记，告诉查看器该怎么转。

| 值 | 含义 |
|---|---|
| 1 | 正常 |
| 2 | 水平翻转 |
| 3 | 旋转 180° |
| 4 | 垂直翻转 |
| 5 | 顺时针 90° + 翻转 |
| 6 | 顺时针 90° |
| 7 | 逆时针 90° + 翻转 |
| 8 | 逆时针 90° |

关键在于：**像素没变，只是多了一个标记**。所以任何处理都要先决定「在哪个坐标系里工作」。

## 二、推荐做法：解码时就摆正

现代浏览器支持在解码阶段应用方向：

```js
const bitmap = await createImageBitmap(file, {imageOrientation: 'from-image'});
```

拿到的是**已经摆正**的位图。之后的裁剪、旋转都在「用户看到的坐标系」里做，不需要再读 EXIF。

这也是唯一不容易出错的模型：**方向只应用一次，且在入口处**。

> `<img>` 元素默认就会按 EXIF 显示，所以在页面上量出来的位置是「显示坐标」，而 canvas 的 `drawImage` 用的是源图坐标 —— 两者在方向不是 1 时并不一致。`from-image` 消除了这个差异。

## 三、裁剪：显示坐标 → 源图坐标

如果 UI 上让用户拖了一个框 `{x, y, width, height}`，它是在**显示尺寸**下量的。要先换算到源图像素：

```js
export function toSourceRect(rect, display, source) {
  const scaleX = source.width / display.width;
  const scaleY = source.height / display.height;
  return {
    x: Math.round(rect.x * scaleX),
    y: Math.round(rect.y * scaleY),
    width: Math.round(rect.width * scaleX),
    height: Math.round(rect.height * scaleY),
  };
}
```

然后一次性画出结果：

```js
export async function crop(file, displayRect, displaySize) {
  const bitmap = await createImageBitmap(file, {imageOrientation: 'from-image'});
  const src = toSourceRect(displayRect, displaySize, bitmap);

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, src.width);
  canvas.height = Math.max(1, src.height);

  const ctx = canvas.getContext('2d');
  ctx.drawImage(bitmap, src.x, src.y, src.width, src.height, 0, 0, src.width, src.height);
  bitmap.close?.();

  return canvas;
}
```

## 四、旋转：只做一次矩阵变换

旋转 90° 的整数倍，最稳的做法是「换画布尺寸 + 平移」：

```js
export async function rotate(file, degrees) {
  const bitmap = await createImageBitmap(file, {imageOrientation: 'from-image'});
  const rad = (degrees * Math.PI) / 180;
  const swapped = degrees % 180 !== 0;

  const canvas = document.createElement('canvas');
  canvas.width = swapped ? bitmap.height : bitmap.width;
  canvas.height = swapped ? bitmap.width : bitmap.height;

  const ctx = canvas.getContext('2d');
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(rad);
  ctx.drawImage(bitmap, -bitmap.width / 2, -bitmap.height / 2);
  bitmap.close?.();

  return canvas;
}
```

要点：

- **宽高互换**只发生在 90° / 270°，写成 `degrees % 180 !== 0` 最直观
- 先 `translate` 到画布中心再 `rotate`，图片就不会被转出画布
- 只调用一次 `drawImage` —— 多次旋转会叠加插值误差

## 五、裁剪 + 旋转一起做

如果用户先转再裁，不要先导出再读回来。把两个变换合到一次绘制里：

```js
export async function cropAndRotate(file, degrees, displayRect, displaySize) {
  // 先转，再在转后的坐标系里裁剪
  const bitmap = await createImageBitmap(file, {imageOrientation: 'from-image'});
  const rad = (degrees * Math.PI) / 180;

  // 旋转后的「显示尺寸」：90° 时宽高互换
  const swapped = degrees % 180 !== 0;
  const rotatedW = swapped ? bitmap.height : bitmap.width;
  const rotatedH = swapped ? bitmap.width : bitmap.height;

  const src = toSourceRect(displayRect, displaySize, {width: rotatedW, height: rotatedH});

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, src.width);
  canvas.height = Math.max(1, src.height);
  const ctx = canvas.getContext('2d');

  // 把「旋转后的目标区域」映射回原图
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(rad);
  const offsetX = -(src.x + src.width / 2 - rotatedW / 2);
  const offsetY = -(src.y + src.height / 2 - rotatedH / 2);
  ctx.drawImage(bitmap, offsetX, offsetY);

  bitmap.close?.();
  return canvas;
}
```

这段代码读起来绕，但逻辑只有一句：**先把画布中心对到裁剪区中心，再反向旋转，让原图的正确部分落进来**。

## 六、导出：格式与透明通道

```js
export function toBlob(canvas, type = 'image/jpeg', quality = 0.9) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) reject(new Error('编码失败'));
      else resolve(blob);
    }, type, quality);
  });
}
```

- 转 JPEG 会丢掉透明通道，透明区域会变黑。需要透明就用 PNG 或 WebP
- 反复「导出 → 再导入 → 再导出」会累积压缩损失；能一次画完就别分两步

## 七、排查表

| 现象 | 原因 | 处理 |
|---|---|---|
| 裁剪位置偏移 | 用显示坐标直接裁源图 | 先按比例换算 |
| 旋转后图像被拉伸 | 画布宽高没互换 | 90°/270° 时交换宽高 |
| 图片转完只剩一角 | 没做 `translate` 到中心 | 先平移到画布中心 |
| 方向转反了 | 解码时已应用方向，又手动转了一次 | 方向只应用一次 |
| 透明背景变黑 | 导出成了 JPEG | 改用 PNG/WebP |
| 越裁越糊 | 多次重采样 | 合并成一次绘制 |

## 八、小结

- 方向只应用一次，且在解码阶段（`imageOrientation: 'from-image'`）
- 裁剪的关键是坐标系换算：显示坐标 ≠ 源图坐标
- 旋转的关键是画布尺寸互换 + 平移到中心
- 能一次画完就别分两次，插值损失不可逆

下一篇：给图片加水印，以及怎么批量导出而不把浏览器卡死。
