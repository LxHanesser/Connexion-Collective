---
slug: online-tools-07-mobile-audit
title: 用无头浏览器给移动端做体检
authors: [lxhanesser]
tags: [技术, 前端, 性能]
date: 2026-10-25T21:00:00+08:00
description: 截图会骗人，scrollWidth 不会。一套能重复跑的移动端检查方法。
---

移动端适配最怕「看起来没问题」。我一开始靠肉眼和截图判断，结果漏了好几个只有真机宽度才暴露的问题。后来改成用无头浏览器量数据，才发现截图本身也会骗人。

{/* truncate */}

## 第一次尝试：iframe + 虚拟时间，失败

思路很简单：写一个诊断页，用 375px 宽的 iframe 加载站点，读它的 `scrollWidth`。结果截图永远停在「measuring...」——iframe 的异步加载没跑完就被截图了，`--virtual-time-budget` 也救不回来。

## 改用 CDP

换成直接连 DevTools 协议：无头 Edge 开 `--remote-debugging-port`，Node 用 WebSocket 连上去，`Emulation.setDeviceMetricsOverride` 设成 375×812、`deviceScaleFactor=2`、`mobile=true`，再 `Runtime.evaluate` 执行检测脚本。

```js
const de = document.documentElement;
const overflow = de.scrollWidth > de.clientWidth;
```

这个数字是可信的：只要 `scrollWidth` 等于视口宽度，就没有横向滚动。

## 一次体检的收获

在 375px 下量了 6 个页面，抓出这些问题：

- 首页三栏信息块在手机上仍是三列（`col--4` 不会自动堆叠）；
- 英雄标题固定 3.5rem，窄屏过大；
- 跑马灯在手机上是一条空绿条；
- 页脚标题是白字配浅色背景，几乎看不见；
- 版权行被右下角「回到顶部」按钮压住。

改完再量，6 个页面 × 375/320 两档，全部 `scrollWidth == clientWidth`。

## 顺手发现的「假 bug」

用 `--window-size=375` 截图时，页面看起来被裁掉了一截，我一度以为布局炸了。实际上是 headless 的窗口有最小宽度，截图按 375 裁切，页面本身并没有溢出。**截图会骗人，数字不会。**

## 经验

移动端检查可以脚本化，而且应该脚本化：

1. 用真实设备尺寸（375、320）设置视口；
2. 对每个关键路由断言 `scrollWidth == clientWidth`；
3. 顺便记录元素是否越界，定位到具体节点；
4. 把脚本留在仓库里，改完随时重跑。

比起「用手机看一眼」，这套东西可重复、可回归，也不依赖手边有没有真机。
