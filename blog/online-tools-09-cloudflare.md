---
slug: online-tools-09-cloudflare
title: Cloudflare Pages 上的静态站：几个容易被忽略的细节
authors: [lxhanesser]
tags: [技术, 在线工具]
date: 2026-10-25T21:30:00+08:00
description: 从 WASM 的 MIME 到缓存头，静态托管也有工程细节。
---

站点部署在 Cloudflare Pages，构建命令就是 `npm run build`。用得越久越发现，静态托管不等于「传上去就完事」，有几个细节会直接影响线上表现。

{/* truncate */}

## 1. 为什么不上 Pages Functions

Functions 能解决不少问题（比如动态注入、鉴权），但它会把一个纯静态项目变成「有后端」的项目：多了运行时、多了冷启动、多了要维护的代码路径。

我的判断标准是：**能用构建时或浏览器端解决的，绝不上函数。** 页脚天数在浏览器算、搜索索引在构建时生成、图片压缩用 WASM，一个函数都没写。

## 2. WASM 的 MIME 与自托管

WASM 文件放 `static/wasm/`，由 Pages 按静态资源返回。浏览器用 `instantiateStreaming` 时会检查 MIME，Pages 对 `.wasm` 的处理没问题；万一环境不对，Emscripten 会自动退化到 ArrayBuffer 加载。

关键是**不要挂 CDN**：第三方 CDN 会引入额外域名、额外故障点，也多一层信任问题。

## 3. 缓存策略按「文件名有没有指纹」来

`_headers` 里我只写了两条缓存规则：

- `/assets/*`：一年强缓存 + `immutable`，因为这些文件名带内容哈希；
- `/img/*`：一周，图片不常换。

HTML 不设长缓存，交给 Pages 默认行为，保证发版后能立刻拿到新页面。

同时保留 `X-Frame-Options`、`X-Content-Type-Options`、`Referrer-Policy`、`Permissions-Policy` 这几条安全头。

## 4. 构建告警要分清「会不会影响运行」

引入 jSquash 后，构建多了一条「chunk 之间存在循环依赖」的警告。看着吓人，但它只影响 chunk 之间的哈希复用，不影响产物运行。我的处理是：确认产物能跑、功能正常，然后记下来，不为了消警告去改架构。

## 5. 怎么确认「真的部署上去了」

不看后台，看产物：记录构建后 `main.[hash].js` 的文件名，推送后隔一分钟请求线上页面，哈希变了就是新版本生效。上一次实测从 push 到 CDN 换包大约一分多钟。

## 经验

静态托管的复杂度不在服务器，而在「构建产物」和「缓存」这两件事上。把文件指纹、缓存头、大小限制管好，剩下的交给平台就行。
