---
slug: blog-pagination
title: "Real page numbers for the blog"
authors: [lxhanesser]
tags: [Engineering, Frontend]
date: 2026-10-27T13:20:00+08:00
description: The default pagination is a single “older entries” link, and the post footer only lists titles. Adding numbers and dates meant fighting field semantics, a default export, and writing a 30-line build-time plugin.
---

With seventeen posts, two default pagination spots started to feel thin:

- The list page offers one “older entries” link — no page count, no sense of position
- Prev/next links at the bottom of a post show titles only, no dates, no place in the timeline

{/* truncate */}

## List page: numbers are easy, “current page” is not

The paginator receives metadata that includes `totalPages`, so drawing the numbers is trivial.

The awkward part is **working out the current page**. My first attempt used `metadata.page + 1`, which produced:

- Page 1 rendering as “Page 2 of 2”
- Page 2 rendering as “Page 3 of 2”

So the field is 1-based, not 0-based as I assumed. Rather than guess, derive it from the URL:

```js
const match = pathname.match(/\/page\/(\d+)\/?$/);
const current = match ? Number(match[1]) : 1;
```

`/blog/page/2` → 2, `/blog` → 1, and `/en/blog/page/2` works the same way.

The base path is derived too, from `nextPage` / `previousPage`, so neither language prefix has to be hard-coded:

```js
const base = sample.replace(/\/page\/\d+\/?$/, '');
```

## Post page: it needs an index of every post

The prev/next props only carry `{permalink, title}`. Dates and a “Post N of M” position require knowing about all posts.

`useBlogMetadata()` does not work on post pages — it reads route data that is not there and throws.

The solution was a **30-line build-time plugin**:

```js
// plugins/blogPostIndex.cjs
async loadContent() {
  // read blog/*.md frontmatter → slug / title / date, sorted newest first
  return {posts};
},
async contentLoaded({content, actions}) {
  actions.setGlobalData(content);
}
```

The client reads it with `usePluginData('blog-post-index')`. The payload is 2.8 KB and costs no runtime request.

### Two API details

1. `@docusaurus/useGlobalData` is a **default export**. Writing `import {useGlobalData}` does not fail at build time — it explodes during rendering with `useGlobalData is not a function`, which is exactly the SSG failure I hit.
2. Data written by `setGlobalData` is keyed by `globalData[pluginName][pluginId]`, so `usePluginData('blog-post-index')` is the reliable accessor.

## Matching the two languages

The index stores slugs while pages expose permalinks. The relationship is simple: `/blog/<slug>` in Chinese, `/en/blog/<slug>` in English — **the last segment is identical**.

```js
const slugOf = (permalink) => String(permalink).split('/').filter(Boolean).pop();
```

Matching on that gives “第 N / M 篇” on the Chinese page and `Post N of M` on the English one, with the same position in both.

## Visuals

- Prev/next became cards: direction label, title, date
- Two columns on desktop, stacked on phones
- `align-items: stretch` keeps them equal height (both measured 132px)
- Page buttons are 44px on phones; arrows grey out at the ends

## Verification

| Check | Result |
|---|---|
| List page 1 | Page 1 highlighted, “Page 1 of 2” |
| List page 2 | Page 2 highlighted, 5 posts |
| Post page | “第 N / M 篇” |
| English page | `Post 2 of 17` |
| 375px | No horizontal overflow, 44px buttons |

## Takeaway

When the built-in paginator lacks information, there are two levers: change the data source (a build-time plugin) or change the rendering (override the component). This used both — the plugin supplies data, the component redraws the UI.

While in there I also removed the “Edit this page” / “Edit this post” links from docs and blog pages. That entry point is for authors; visitors clicking it only reach GitHub’s editor.
