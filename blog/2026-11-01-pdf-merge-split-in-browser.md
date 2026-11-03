---
slug: pdf-merge-split-in-browser
title: 在浏览器里合并与拆分 PDF：pdf-lib 实战与体积陷阱
authors: [lxhanesser]
tags: [技术, 在线工具]
date: 2026-11-01T20:00:00+08:00
description: 不装 Acrobat、不传服务器，用 pdf-lib 在浏览器里合并多份 PDF 或按页码拆分。本文给出完整实现，并解释加密文件、表单、书签和体积膨胀这些真实会遇到的问题。
---

合并与拆分 PDF 是最常见的文档操作之一，但大多数在线工具要求你把文件先上传。用 `pdf-lib`，整个过程可以完全在浏览器里完成 —— 文件从磁盘读入，处理完直接下载。

这篇文章给出一个能用的实现，并重点讲清楚几个会让人卡住的问题。

{/* truncate */}

## 一、两种操作，一个模型

<img src="/img/blog/pdf-merge-split/fig1-merge-split.svg" alt="PDF 合并与拆分：多份合并成一份，或按页码把一份拆成多份" width="1000" height="340" loading="lazy" />

无论合并还是拆分，核心动作都是同一句话：

> 读入页面 → 放进一个新文档 → 保存。

- **合并**：循环多个文件，每次把它们的页面追加到同一个新文档
- **拆分**：只读一个文件，按页码范围建多个新文档

## 二、准备

```bash
npm install pdf-lib
```

```js
import {PDFDocument} from 'pdf-lib';
```

`pdf-lib` 是纯 JavaScript 实现，不需要 WASM，也不需要 Worker —— 这也是它在浏览器里好用的原因。

## 三、合并

```js
export async function mergePdfs(files, {onProgress} = {}) {
  const out = await PDFDocument.create();

  for (let i = 0; i < files.length; i++) {
    const bytes = await files[i].arrayBuffer();
    const source = await PDFDocument.load(bytes);

    // copyPages 会把页面内容与资源一起复制到目标文档
    const pages = await out.copyPages(source, source.getPageIndices());
    for (const page of pages) out.addPage(page);

    onProgress?.((i + 1) / files.length);
  }

  return out.save(); // Uint8Array
}
```

调用与下载：

```js
const bytes = await mergePdfs(fileInput.files);
download(new Blob([bytes], {type: 'application/pdf'}), 'merged.pdf');
```

## 四、拆分

拆分的关键是「页码范围解析」。先支持 `1-3,5,8-10` 这种写法：

```js
function parseRanges(input, pageCount) {
  const ranges = input
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [start, end] = part.split('-').map((n) => Number(n.trim()));
      const from = Math.max(1, start);
      const to = Math.min(pageCount, end ?? start);
      if (!Number.isFinite(from) || !Number.isFinite(to) || from > to) {
        throw new Error(`页码范围无效：${part}`);
      }
      return {from, to};
    });

  if (ranges.length === 0) throw new Error('至少填写一个页码范围');
  return ranges;
}
```

然后逐段抽取：

```js
export async function splitPdf(file, rangeInput) {
  const source = await PDFDocument.load(await file.arrayBuffer());
  const pageCount = source.getPageCount();
  const ranges = parseRanges(rangeInput, pageCount);

  const results = [];
  for (const {from, to} of ranges) {
    const out = await PDFDocument.create();
    const indices = [];
    for (let p = from; p <= to; p++) indices.push(p - 1); // 内部索引从 0 开始

    const pages = await out.copyPages(source, indices);
    for (const page of pages) out.addPage(page);

    results.push({
      name: `${from}-${to}.pdf`,
      bytes: await out.save(),
    });
  }
  return results;
}
```

一次性生成多个文件时，不要用多个 `<a download>` 连续点击 —— 浏览器会拦截。更稳的做法是打包成一个 ZIP，或者让用户逐个点「下载」。

## 五、几个真实会踩的坑

### 1. 加密 PDF 直接抛异常

`PDFDocument.load()` 遇到有密码的 PDF 会报错。可以传 `{ignoreEncryption: true}` 强行加载，但**不推荐**：

- 有些加密文件的页面内容本身被加密，强行加载会得到空白页
- 用户以为「处理成功了」，实际拿到的是坏文件

正确做法是捕获异常并提示用户先解除密码。

```js
try {
  const doc = await PDFDocument.load(bytes);
} catch (error) {
  if (String(error).includes('encrypted')) {
    throw new Error('这份 PDF 有密码保护，请先解除密码再处理');
  }
  throw error;
}
```

### 2. 合并后体积不等于两者相加

`pdf-lib` 会保留每份源文件的字体、图片等资源。两份都嵌入同一套中文字体时，合并结果往往比原文件之和更大。

如果体积敏感：

- 先合并，再用压缩工具处理（例如把图片重新编码）
- 或者接受这个代价 —— 保留原始画质本身就需要空间

### 3. 表单、书签、注释不会自动保留

`copyPages` 复制的是**页面内容**。以下内容通常不会被带过去：

| 内容 | 是否保留 |
|---|---|
| 页面文字、图片、矢量图 | ✅ |
| 页面尺寸与旋转 | ✅ |
| 表单字段（AcroForm） | ⚠️ 部分丢失 |
| 书签 / 大纲 | ❌ |
| 注释与批注 | ❌ |

如果业务上依赖书签，需要在合并后自己重建目录页。

### 4. 大文件的内存占用

`pdf-lib` 会把整个文档读进内存。100 MB 的 PDF 在手机上很容易触发崩溃。可以设一个上限并提示用户：

```js
const MAX_BYTES = 50 * 1024 * 1024;
if (file.size > MAX_BYTES) {
  throw new Error('文件超过 50 MB，建议先在电脑上压缩');
}
```

### 5. 下载链接的回收

和图片压缩一样，`URL.createObjectURL` 创建后要延迟回收：

```js
function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
```

## 六、排查表

| 现象 | 原因 | 处理 |
|---|---|---|
| 加载时抛 `encrypted` | 文件有密码 | 提示先解除密码 |
| 合并后页面顺序乱 | 文件顺序或索引理解错 | 页码从 1 开始，内部索引从 0 开始 |
| 输出是空白页 | 强行加载了加密文件 | 不要用 `ignoreEncryption` |
| 体积暴涨 | 资源重复嵌入 | 合并后压缩，或分批输出 |
| 书签全没了 | 只复制了页面 | 需要时重建目录 |
| 手机崩溃 | 文件太大 | 限制单文件体积 |

## 七、小结

- 合并与拆分共用「读页面 → 新文档 → 保存」这一个模型
- 真正的难点不在 API，而在边界情况：加密、体积、表单与书签
- 浏览器内处理的前提是控制文件体积，超过 50 MB 就该提示用户换设备

下一篇讲 SVG 优化：同样是「解析 → 变换 → 序列化」，但细节全在文本层面。
