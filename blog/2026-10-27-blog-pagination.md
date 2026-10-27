---
slug: blog-pagination
title: 给博客加分页：从「较旧一篇」到真页码
authors: [lxhanesser]
tags: [技术, 前端]
date: 2026-10-27T13:20:00+08:00
description: 默认分页只有一个「较旧的博文」链接，上下篇也只有标题。补页码和日期的过程里，踩了字段语义、默认导出和一个 30 行的构建期插件。
---

文章攒到 17 篇之后，Docusaurus 默认的两处分页就显出不足了：

- 列表页只有一个「较旧的博文」链接，看不出总共有几页、自己在第几页
- 文章底部的上下篇只有标题，没有日期，也不知道在整站时间线里的位置

{/* truncate */}

## 列表页：页码好画，当前页不好定

分页组件能拿到当前页的 metadata，里面有 `totalPages`，画页码很直接。

麻烦的是**当前页怎么算**。一开始我用 `metadata.page + 1`，结果：

- 第 1 页显示成「第 2 / 2 页」
- 第 2 页显示成「第 3 / 2 页」

说明这个字段的语义和预期相反（它是 1-based，不是 0-based）。与其猜，不如从 URL 推断：

```js
const match = pathname.match(/\/page\/(\d+)\/?$/);
const current = match ? Number(match[1]) : 1;
```

`/blog/page/2` → 2，`/blog` → 1，英文站 `/en/blog/page/2` 也适用。

分页基址同样不写死，而是从 `nextPage` / `previousPage` 反推：

```js
const base = sample.replace(/\/page\/\d+\/?$/, '');
```

这样中英文前缀都不用管。

## 文章页：需要一份全站索引

上下篇导航只给了 `{permalink, title}`。想显示日期和「第 N / 共 M 篇」，必须知道全部文章。

`useBlogMetadata()` 在文章页不可用 —— 它依赖路由数据，文章页拿不到，调用会抛错。

最后的办法是写一个 **30 行的构建期插件**：

```js
// plugins/blogPostIndex.cjs
async loadContent() {
  // 读 blog/*.md 的 frontmatter，提取 slug / title / date，按日期倒序
  return {posts};
},
async contentLoaded({content, actions}) {
  actions.setGlobalData(content);
}
```

客户端用 `usePluginData('blog-post-index')` 读取。产物只有 2.8 KB，零运行时请求。

### 两个 API 细节

1. `@docusaurus/useGlobalData` 是**默认导出**。写成 `import {useGlobalData}` 不会在构建时报错，而是在渲染阶段炸掉：`useGlobalData is not a function` —— 这正是我遇到的那次 SSG 失败。
2. `setGlobalData` 写入的数据按 `globalData[pluginName][pluginId]` 组织，所以用 `usePluginData('blog-post-index')` 直接取，比手动拆包可靠。

## 中英文怎么匹配

索引里存的是 slug，页面拿到的却是 permalink。两者的关系很简单：中文是 `/blog/<slug>`，英文是 `/en/blog/<slug>`，**最后一段相同**。

```js
const slugOf = (permalink) => String(permalink).split('/').filter(Boolean).pop();
```

按 slug 匹配后，中文页显示「第 N / M 篇」，英文页显示 `Post N of M`，同一篇文章在两种语言下位置一致。

## 视觉

- 上下篇改成卡片：方向标签 + 标题 + 日期
- 桌面两列并排，手机上下堆叠
- 卡片用 `align-items: stretch` 保证等高（实测两列都是 132px）
- 页码按钮手机 44px，到边界时箭头变灰且不可点

## 验证

| 检查 | 结果 |
|---|---|
| 列表第 1 页 | 页码 1 高亮，状态「第 1 / 2 页」 |
| 列表第 2 页 | 页码 2 高亮，5 篇文章 |
| 文章页 | 显示「第 N / M 篇」 |
| 英文页 | 显示 `Post 2 of 17` |
| 375px | 0 横向溢出，页码按钮 44px |

## 小结

分页组件给的信息不够时，有两条路：改数据源（构建期插件），或改渲染逻辑（覆写组件）。这次两条都用了 —— 插件补数据，组件重画界面。

顺带一提：这轮还顺手移除了文档页和文章页底部的「编辑此页 / 编辑文章」链接。那个入口是给作者用的，访客点进去只会看到 GitHub 的编辑界面。
