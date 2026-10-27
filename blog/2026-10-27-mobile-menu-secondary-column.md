---
slug: mobile-menu-secondary-column
title: 移动端菜单为什么把「博客」和「工具」藏起来了
authors: [lxhanesser]
tags: [前端, 技术]
date: 2026-10-27T11:10:00+08:00
description: 手机上进入文档页后，汉堡菜单里只剩文档目录。查下来不是 bug，而是 Docusaurus 刻意的行为 —— 以及一个 36 行的解法。
---

现象：手机上从首页点进「写在开始」，再打开汉堡菜单，只有文档目录，**博客和在线工具都不见了**。

一开始以为是自己的改动弄坏了导航，查完源码才发现：这是 Docusaurus 的设计。

{/* truncate */}

## 原因写在源码里

移动端侧栏有两列：

- 第一列：导航项（写在开始、博客、在线工具…）
- 第二列：当前页的上下文菜单（文档目录 / 博客文章列表）

控制先显示哪一列的逻辑在 `navbarSecondaryMenu/display.js`：

```js
// 关闭侧栏时把 secondary 置为 true，下次打开先显示它
useEffect(() => {
  if (!hasContent) { setShown(false); return; }
  if (!mobileSidebar.shown) { setShown(true); }
}, [mobileSidebar.shown, hasContent]);
```

也就是说：**只要当前页有第二列内容，下次打开菜单就一定会先显示第二列**。所以在文档页和博客页，第一列被推到屏幕左侧，要靠「← 回到主菜单」才能回去。

## 三个方案

| 方案 | 代价 |
|---|---|
| 强制先显示第一列 | 文档目录没有别的入口（移动端那一列就是唯一的文档导航），等于砍掉子导航 |
| 底部固定 Tab 栏 | 体验最好，但属于导航改版，而且常驻占屏 |
| **在第二列顶部补站点入口** | 改动最小，完全保留原生逻辑 |

选了第三个。

## 实现

覆写 `Navbar/MobileSidebar/SecondaryMenu`。官方组件只有 36 行，结构是「返回按钮 + 上下文内容」，在中间插一行即可：

```jsx
<>
  <SecondaryMenuBackButton onClick={() => secondaryMenu.hide()} />

  <nav className="mobile-quicknav">
    <Link to="/">首页</Link>
    <Link to="/blog">博客</Link>
    <Link to="/tools">在线工具</Link>
  </nav>

  {secondaryMenu.content}
</>
```

CSS 很薄：三列等宽网格、`min-height: 44px`、间距 8px，hover 只在支持悬停的设备上生效（手机上 `:hover` 会粘住）。

## 验证

- 375px 下三个入口高度都是 44px
- 点「博客」跳到 `/blog`，菜单自动关闭
- 文档目录仍在快捷入口下方，「回到主菜单」保留
- 博客页同样出现（第二列是文章列表）
- 桌面端完全不受影响（≥997px 时汉堡菜单不渲染）

有个小细节：`Link` 是路由感知的，英文站会自动跳到 `/en/blog`，不用手写前缀。

## 小结

这类「框架行为看起来像 bug」的情况，最省事的解法通常不是对抗框架，而是在它的结构上补一层。改动小、升级时不冲突、也不会破坏原有的可达性。
