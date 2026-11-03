---
slug: static-site-search
title: "Search for a static site: build the index, query in the browser"
authors: [lxhanesser]
tags: [Engineering, Frontend]
date: 2026-11-03T09:00:00+08:00
description: No server, no problem — tokenise titles and body text at build time into an inverted index, then load one JSON file and score queries in the browser. Covers CJK tokenisation, index size control, and why highlighting must not use innerHTML.
---

The usual compromise for a static site is to hand search over to a search engine. But site search can run entirely in the browser: **build the index at build time, only look things up at runtime**.

The hard parts are not ranking algorithms. They are tokenising Chinese, keeping the index small, and highlighting without introducing XSS.

{/* truncate */}

## 1. A two-phase architecture

<img src="/img/blog/static-search/fig1-architecture-en.svg" alt="Static search architecture: index built at build time, loaded and scored in the browser" width="1000" height="280" loading="lazy" />

- **Build time**: crawl every page → extract title and body → tokenise → emit `search-index.json`
- **Runtime**: user types → tokenise → look up postings → score → render

The site stays fully static. There is no query endpoint.

## 2. What the index looks like

The simplest workable structure is "term → documents", plus per-document metadata:

```json
{
  "docs": [
    {"id": 0, "title": "Search for a static site", "url": "/blog/static-site-search/", "len": 812}
  ],
  "index": {
    "static": [[0, 3], [2, 1]],
    "search": [[0, 5], [1, 2]]
  }
}
```

Each term maps to a list of `[docId, termFrequency]`. A query just pulls those arrays and adds up scores.

## 3. Tokenisation differs by language

### English

Split on non-alphanumerics, lowercase, drop stop words:

```js
const STOP = new Set(['the', 'a', 'an', 'of', 'to', 'and', 'in', 'is', 'for']);

function tokenizeEnglish(text) {
  return text
    .toLowerCase()
    .split(/[^a-z0-9\u00c0-\u024f]+/)
    .filter((w) => w.length > 1 && !STOP.has(w));
}
```

### Chinese

Chinese has no spaces. Splitting per character gives high recall and poor precision; **bigrams** are the cheapest workable compromise:

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

"静态搜索" becomes three tokens: 静态, 态搜, 搜索. A query for either half matches.

The cost is index size: a 1,000-character article produces roughly 1,000 bigrams.

## 4. Scoring: good enough is enough

Full BM25 is unnecessary. Term frequency plus field weighting already ranks sensibly:

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

## 5. Keeping the index small

The index is the part that runs away. Three effective levers:

| Lever | Effect |
|---|---|
| Index only the first 2,000 characters | Long articles stop scaling linearly |
| Drop terms that occur once | Usually removes 30–50% |
| gzip / brotli at the edge | Static hosts compress JSON extremely well |

If it is still large, split the index by section and load a shard once the user starts typing.

## 6. Highlighting without innerHTML

```js
// ❌ Dangerous: a title containing <img onerror> executes
element.innerHTML = title.replace(keyword, `<mark>${keyword}</mark>`);
```

The safe approach hands escaping to the framework and splits the string into pieces:

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

Whatever characters a title contains, they only ever render as text.

## 7. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Chinese queries return nothing | Split per character or on spaces only | Use bigrams |
| Lots of irrelevant hits | Stop words kept | Filter short words and stop words |
| Index file is huge | Full-text index with low-frequency terms | Truncate body, drop rare terms |
| Results are stale | Index not rebuilt | Always generate it at build time |
| Highlight styling leaks | `innerHTML` used | Render text fragments |
| Slow first paint | Index loaded with the page | Load it on first focus |

## 8. Takeaways

- Static search is "build the index, query in the browser" — no server required
- Chinese needs bigrams; English needs space splitting plus stop words
- Simple TF plus title weighting ranks well enough
- Highlight by splitting text, never by concatenating HTML

Next: the maths behind mouse sensitivity.
