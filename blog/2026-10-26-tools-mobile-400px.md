---
slug: tools-mobile-400px
title: 一个 400px 的幽灵：移动端横向溢出是怎么查出来的
authors: [lxhanesser]
tags: [前端, 性能]
date: 2026-10-26T21:45:00+08:00
description: 320px 的手机上，页面却宽了 80px。查了半天发现是 flex 的 min-content 在作祟 —— 以及我的测试脚本骗了我两次。
---

新工具上线前跑移动端检查，九个页面里八个都是 0 溢出，只有数据包生成器在 320px 下横向多出 80px。

这种问题最烦的地方是：**你在桌面浏览器里根本看不见它**。

{/* truncate */}

## 第一步：把"溢出"变成数字

```js
document.documentElement.scrollWidth - document.documentElement.clientWidth
```

320 的视口，`scrollWidth` 是 400 —— 差了 80px，不是视觉错觉。

## 第二步：找出谁比视口宽

遍历所有元素，看谁的 `right` 超过视口宽度。结果第一个"嫌疑犯"是导航栏的侧边栏遮罩：

```
DIV.navbar-sidebar__backdrop   w=400
```

差点被它骗过去。它是 `position: fixed` 的元素，**不参与文档流，也不会产生滚动条** —— 只是恰好 400px 宽，撞上了我的筛选条件。

把 fixed 排除掉之后，真正的现象浮现了：`<main>` 本身宽 400px，而它的父容器只有 320。

## 第三步：逐层排除

既然 `<main>` 被撑开了，就一层层找是谁撑的。方法很土但有效：**依次隐藏每个子元素，看 `scrollWidth` 会不会掉回 320**。

```js
for (const kid of node.children) {
  kid.style.display = 'none';
  const fixedNow = document.documentElement.scrollWidth <= vw;
  kid.style.display = '';
  if (fixedNow) return kid;   // 就是它
}
```

第一层就命中了：`<ul>` 文件列表。再往里看，每个 `<li>` 都是 400 宽 —— 因为里面有一行等宽的路径：

```
data/my_pack/function/main.mcfunction
```

## 根因：min-width 的默认值

这是 flex 布局里最经典的坑之一：

- flex 子项的 `min-width` 默认是 `auto`，意味着它不会小于自己的 **min-content**
- 而 `white-space: nowrap` 的文本，min-content 就是整行文字宽度
- 于是这行 37 个字符的等宽路径把整条链一路顶到 400px

我一开始以为给容器加 `min-width: 0` 就能解决 —— 试了，没用。因为 `min-width: 0` 允许**收缩**，但 flex 容器计算自身最小宽度时，仍然会参考子项的内容尺寸。

**真正的解法是让内容本身可换行**：

```css
.itemName {
  white-space: normal;
  word-break: break-all;
}
```

`break-all` 允许在任意字符间断行（路径没有空格，正常换行规则找不到断点）。改完之后 320 和 375 都归零。

## 顺带修的触摸目标

同一轮检查还量了可点元素的高度，发现结果列表里的"复制"按钮只有 32px 高。

按项目规范，触摸目标不小于 44×44。问题在于这个按钮在 `itemActions` 里，之前只给 `<a>` 写了 `min-height`，`<button>` 漏了：

```css
.itemActions button { min-width: 44px; min-height: 44px; }
```

## 更尴尬的部分：测试脚本骗了我两次

排查过程中我写了几个 CDP 脚本模拟用户操作，结果连错两次，而且都不是应用的问题：

**第一次**：用 `input[type=text]` 选页码输入框。但那个输入框没写 `type` 属性（默认就是 text），CSS 属性选择器**匹配不到没有该属性的元素**，于是选到了导航栏的搜索框 —— 我把页码范围填进了搜索框。

**第二次**：改成"取最后一个 text 输入框"，这次对了。但更早之前还有一次类似的：我用 `iframe.onload` 判断 iframe 是否被拦截，而**被拦截的 iframe 也会触发 onload**（加载的是错误页），于是得出了完全相反的结论。

教训很直接：**测试脚本本身也是代码，也会出错**。当测试结果和预期不符时，先怀疑测试，再怀疑被测对象。

## 断点上的取舍

工具页顶部的切换条在窄屏会挤成一条横向滚动带。14 个工具已经要滑两屏，工具再多就没法用了。

所以现在按断点分形态：

- ≥768px：横向 chip，一次点击直达
- ≤767px：原生 `<select>` + 分组，不横向滚动、单手能操作、工具加到 50 个也不挤

原生控件在移动端有个隐性优势：**系统会帮你处理触摸、滚动和可访问性**，比自己写的自定义下拉可靠得多。

## 小结

移动端的问题有两个特点：**在桌面上看不见**，以及**只靠肉眼判断不了**。所以只能把它变成数字（溢出多少像素、触摸目标多高），然后逐层定位。

以及，别忘了先验证你的验证工具。
