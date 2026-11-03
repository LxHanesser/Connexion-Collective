---
slug: svg-optimizer-by-hand
title: 手写一个 SVG 优化器：清理元数据、压缩数值、守住安全边界
authors: [lxhanesser]
tags: [技术, 在线工具]
date: 2026-11-02T09:00:00+08:00
description: 设计工具导出的 SVG 里塞满了编辑器元数据和十几位小数的坐标。本文用浏览器自带的 DOMParser 写一个优化器，讲清哪些能删、哪些一删就坏，以及为什么必须把脚本和外部引用一起清掉。
---

从 Figma、Illustrator 或 Inkscape 导出的 SVG，体积往往有一半是「不是图形」的东西：编辑器命名空间、图层名、注释、以及 `12.3456789` 这种精度远超屏幕的坐标。

这篇文章写一个能用的优化器：**清理 → 压缩 → 序列化**，同时明确哪些东西绝对不能动。

{/* truncate */}

## 一、优化器在做什么

<img src="/img/blog/svg-optimizer/fig1-pipeline.svg" alt="SVG 优化流程：读取文本、解析 DOM、清理无用节点与属性、压缩数值精度、序列化输出" width="1000" height="280" loading="lazy" />

四个动作，风险依次升高：

| 动作 | 典型收益 | 风险 |
|---|---|---|
| 删注释、`<metadata>`、编辑器属性 | 10–30% | 低 |
| 删空 `<g>`、合并相同属性 | 5–15% | 中（可能影响引用） |
| 数值精度从 6 位降到 2 位 | 10–40% | 中（极端值会变形） |
| 删 `<script>`、事件属性、外部引用 | 安全收益 | 必须做 |

## 二、先做安全清理

SVG 是 XML，可以内嵌 `<script>`、`onload` 这类事件属性，还能用 `<image href="http://…">` 引用外部资源。如果直接把用户上传的 SVG 渲染进页面，等于执行了对方的代码。

所以第一步永远是「去掉能执行的东西」：

```js
const DANGEROUS = new Set(['script', 'foreignObject']);

function sanitize(el) {
  for (const child of [...el.children]) {
    const tag = child.tagName.toLowerCase();
    if (DANGEROUS.has(tag)) {
      child.remove();
      continue;
    }
    for (const attr of [...child.attributes]) {
      const name = attr.name.toLowerCase();
      // 事件属性：onclick、onload …
      if (name.startsWith('on')) child.removeAttribute(attr.name);
      // javascript: / data:text/html 这类 href
      if (name === 'href' || name === 'xlink:href') {
        if (/^\s*(javascript|data:text\/html)/i.test(attr.value)) {
          child.removeAttribute(attr.name);
        }
      }
    }
    sanitize(child);
  }
}
```

## 三、解析与遍历

浏览器自带解析器，不需要引第三方库：

```js
export function optimizeSvg(source, {precision = 2} = {}) {
  const doc = new DOMParser().parseFromString(source, 'image/svg+xml');

  const error = doc.querySelector('parsererror');
  if (error) throw new Error('SVG 解析失败：文件可能不是合法 XML');

  const root = doc.documentElement;
  sanitize(root);
  cleanMetadata(root);
  roundNumbers(root, precision);
  removeEmptyGroups(root);

  return new XMLSerializer().serializeToString(root);
}
```

## 四、删掉编辑器留下的东西

```js
const EDITOR_ATTRS = [
  'data-name', 'inkscape:label', 'inkscape:groupmode',
  'sodipodi:namedview', 'sodipodi:role',
  'serif:id', 'xml:space',
];

function cleanMetadata(root) {
  // 注释节点
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_COMMENT);
  const comments = [];
  while (walker.nextNode()) comments.push(walker.currentNode);
  for (const node of comments) node.remove();

  // 编辑器专用元素
  for (const el of [...root.querySelectorAll('metadata, sodipodi\\:namedview')) {
    el.remove();
  }

  // 编辑器专用属性
  for (const el of [root, ...root.querySelectorAll('*')]) {
    for (const name of EDITOR_ATTRS) el.removeAttribute(name);
    for (const attr of [...el.attributes]) {
      if (/^(inkscape|sodipodi|serif|illustrator):/i.test(attr.name)) {
        el.removeAttribute(attr.name);
      }
    }
  }
}
```

> 别删 `id`。看起来它只是编辑器留下的，但 `fill="url(#grad1)"`、`<use href="#icon">` 都依赖它。

## 五、压缩数值精度

坐标、`d` 路径、`viewBox` 里的数字都可以降精度。屏幕上一个像素通常对应 1–2 位小数，保留 2 位足够。

```js
function roundNumbers(root, precision) {
  const factor = 10 ** precision;
  const round = (n) => {
    const value = Number(n);
    return Number.isFinite(value) ? String(Math.round(value * factor) / factor) : n;
  };

  for (const el of [root, ...root.querySelectorAll('*')]) {
    // 路径数据里是数字与命令混排，只能逐个数字替换
    const d = el.getAttribute?.('d');
    if (d) {
      el.setAttribute('d', d.replace(/-?\d*\.?\d+(e[-+]?\d+)?/gi, (m) => round(m)));
    }
    for (const attr of [...el.attributes]) {
      if (attr.name === 'd') continue;
      if (/^-?\d*\.?\d+(e[-+]?\d+)?$/i.test(attr.value)) {
        el.setAttribute(attr.name, round(attr.value));
      }
    }
  }
}
```

### 精度不是越低越好

| 精度 | 效果 |
|---|---|
| 3–4 位 | 几乎无损，收益有限 |
| **2 位** | 常规图标与插画的安全值 |
| 1 位 | 小尺寸图形开始出现可见偏移 |
| 0 位 | 细线、圆弧会明显变形 |

曲线（`C`、`Q`、`A`）对精度比直线敏感，导出小图标时建议保留 3 位。

## 六、清理空组

```js
function removeEmptyGroups(root) {
  let changed = true;
  while (changed) {
    changed = false;
    for (const g of [...root.querySelectorAll('g')]) {
      const hasElement = g.children.length > 0;
      const hasText = [...g.childNodes].some(
        (n) => n.nodeType === Node.TEXT_NODE && n.textContent.trim(),
      );
      if (!hasElement && !hasText) {
        g.remove();
        changed = true;
      }
    }
  }
}
```

## 七、排查表

| 现象 | 原因 | 处理 |
|---|---|---|
| 渐变 / 图标丢失 | 删掉了被 `url(#id)` 引用的元素或 id | 保留所有 `id` 与 `<defs>` |
| 图形边缘变毛糙 | 精度压到 0–1 位 | 提高精度，曲线至少 3 位 |
| 字体变成别的字体 | 删了 `font-family` 或外部字体引用 | 保留字体属性；或转成路径 |
| 优化后无法渲染 | XML 不合法（自闭合标签、命名空间） | 用 `DOMParser` 先校验 |
| 体积几乎没变 | 图里主要是路径数据 | 主要收益在精度压缩，检查是否真的执行 |
| 页面被注入脚本 | 没做安全清理 | 先跑 `sanitize`，再谈优化 |

## 八、小结

- 顺序很重要：**先安全清理，再优化体积**
- 三样东西不能删：`id`、`defs`、被引用的元素
- 精度 2 位是常规安全值，曲线建议 3 位

下一篇讲图片裁剪与旋转，重点是那个让无数人抓狂的 EXIF 方向。
