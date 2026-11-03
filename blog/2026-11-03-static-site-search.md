---
slug: static-site-search
title: 静态站点搜索：构建期建索引，浏览器里检索
authors: [lxhanesser]
tags: [技术, 前端]
date: 2026-11-03T09:00:00+08:00
description: 没有服务器也能有搜索：构建时把标题和正文切成词、写成倒排索引，浏览器端只做一次 JSON 加载与打分。本文讲清中英文分词差异、索引体积控制，以及高亮时为什么不能用 innerHTML。
---

静态站点最常见的妥协是「搜索交给搜索引擎」。但站内搜索其实是可以在浏览器里完成的：**构建时建索引，运行时只做查表与打分**。

难点不在搜索算法，而在三件事：中文怎么切词、索引怎么不膨胀、高亮怎么不引入 XSS。

{/* truncate */}

## 一、两段式架构

<img src="/img/blog/static-search/fig1-architecture.svg" alt="静态搜索架构：构建期生成索引，浏览器端加载并打分" width="1000" height="280" loading="lazy" />

- **构建期**：扫描所有页面 → 抽标题与正文 → 分词 → 生成 `search-index.json`
- **运行期**：用户输入 → 分词 → 查倒排表 → 打分排序 → 渲染结果

站点始终是纯静态的，没有任何查询接口。

## 二、索引长什么样

最简单的可用结构是「词 → 文档列表」，再加每篇文档的元信息：

```json
{
  "docs": [
    {"id": 0, "title": "静态站点搜索", "url": "/blog/static-site-search/", "len": 812}
  ],
  "index": {
    "静态": [[0, 3], [2, 1]],
    "搜索": [[0, 5], [1, 2]]
  }
}
```

`index` 的每个词对应若干 `[文档 id, 词频]`。查询时只要取出这些数组，就能累加分数。

## 三、分词：中英文要分开处理

### 英文

按非字母数字切分、转小写、去停用词：

```js
const STOP = new Set(['the', 'a', 'an', 'of', 'to', 'and', 'in', 'is', 'for']);

function tokenizeEnglish(text) {
  return text
    .toLowerCase()
    .split(/[^a-z0-9\u00c0-\u024f]+/)
    .filter((w) => w.length > 1 && !STOP.has(w));
}
```

### 中文

中文没有空格，按字切会让「搜索」和「索搜」都变成两个单字，召回率高但准确率差。**二元组（bigram）** 是成本最低的折中：

```js
function tokenizeCjk(text) {
  const chars = [...text].filter((c) => /[\u4e00-\u9fff]/.test(c));
  const out = [];
  for (let i = 0; i < chars.length - 1; i++) {
    out.push(chars[i] + chars[i + 1]);
  }
  return out;
}
```

「静态搜索」会切成「静态」「态搜」「搜索」三个 token。查询「搜索」时能命中，查询「静态」也能命中。

代价是索引变大：一篇 1,000 字的中文文章会产生约 1,000 个 bigram。

## 四、打分：够用就好

不需要完整的 BM25。词频 + 字段权重已经能给出合理排序：

```js
const TITLE_WEIGHT = 3;

function search(query, data, {limit = 10} = {}) {
  const tokens = [
    ...tokenizeEnglish(query),
    ...tokenizeCjk(query),
  ];
  if (tokens.length === 0) return [];

  const scores = new Map();

  for (const token of tokens) {
    const postings = data.index[token];
    if (!postings) continue;
    for (const [docId, tf] of postings) {
      scores.set(docId, (scores.get(docId) ?? 0) + tf);
    }
  }

  // 标题命中的额外加权
  const q = query.toLowerCase();
  for (const doc of data.docs) {
    if (doc.title.toLowerCase().includes(q)) {
      scores.set(doc.id, (scores.get(doc.id) ?? 0) + TITLE_WEIGHT);
    }
  }

  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id, score]) => ({...data.docs[id], score}));
}
```

## 五、体积控制

索引是最容易失控的部分。三个有效手段：

| 手段 | 效果 |
|---|---|
| 只索引正文前 2,000 字 | 长文不再线性膨胀 |
| 去掉只出现一次的词 | 通常能砍掉 30–50% |
| 构建后 gzip / brotli | 静态托管通常自动压缩，JSON 压缩率很高 |

如果索引仍然很大，可以按板块拆成多个文件，用户输入时再按需加载。

## 六、高亮：不要用 innerHTML

```js
// ❌ 危险：标题里如果有 <img onerror>，会直接执行
element.innerHTML = title.replace(keyword, `<mark>${keyword}</mark>`);
```

安全做法是让框架负责转义，把匹配到的片段切成数组：

```jsx
function highlight(text, keyword) {
  if (!keyword) return text;
  const lower = text.toLowerCase();
  const target = keyword.toLowerCase();
  const parts = [];
  let cursor = 0;
  let at = lower.indexOf(target);

  while (at !== -1) {
    if (at > cursor) parts.push(text.slice(cursor, at));
    parts.push(<mark key={at}>{text.slice(at, at + keyword.length)}</mark>);
    cursor = at + target.length;
    at = lower.indexOf(target, cursor);
  }
  if (cursor < text.length) parts.push(text.slice(cursor));
  return parts;
}
```

这样无论标题里有什么字符，都只会作为文本渲染。

## 七、排查表

| 现象 | 原因 | 处理 |
|---|---|---|
| 中文搜不到 | 只按单字或空格切分 | 用 bigram |
| 搜到一堆无关结果 | 停用词没去 | 过滤短词与停用词 |
| 索引文件巨大 | 全文索引 + 低频词 | 截断正文、去低频词 |
| 搜索结果过期 | 构建后索引没更新 | 索引必须是构建产物，不手写 |
| 高亮处样式穿透 | 用了 `innerHTML` | 用文本分片渲染 |
| 首屏变慢 | 索引随首屏一起加载 | 首次聚焦搜索框时再加载 |

## 八、小结

- 静态搜索是「构建期建索引 + 运行期查表」，不需要服务端
- 中文用 bigram，英文用空格切分 + 停用词
- 打分够用即可，词频加标题权重已经能排得不错
- 高亮必须走文本分片，永远不要拼 HTML

下一篇换口味：游戏鼠标灵敏度背后的换算公式。
