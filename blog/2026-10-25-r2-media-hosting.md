---
slug: r2-media-hosting
title: 给博客找个放图的地方：把静态媒体搬上 Cloudflare R2
authors: [lxhanesser]
tags: [技术, 安全]
date: 2026-10-25T21:20:00+08:00
description: 站点离 Pages 配额还差三十倍，真正该挪走的是仓库体积和构建时间——顺便把防盗链从头想了一遍。
image: https://cdn.connexioncollective.com/media/blog/2026/r2-request-flow-9bc14955f92c.webp
---

想把截图直接贴进文章，又不想看着仓库一天天长胖。于是给站点接了个对象存储，顺手把「防盗链」这件事想清楚了。

{/* truncate */}

## 先泼一盆冷水：Pages 其实没撑不住

很多人加 CDN 的理由是「怕超配额」。我先把账算了一遍：

<img src="https://cdn.connexioncollective.com/media/blog/2026/r2-quota-dceb05f7bc74.webp" alt="Pages 配额占用：文件数 1.6%、单文件 2.2%、构建耗时 0.5%" width="1200" height="560" />

结论很直白：文件数用了 1.6%，单文件用了 2.2%，构建耗时 0.5%。离上限还有三十倍的余量。

真正会先炸的是另外三件事：

1. **git 仓库体积**——二进制进仓库，clone、CI 缓存、本地 `node_modules` 旁边的磁盘都跟着受罪。
2. **构建时间**——Docusaurus 处理大量图片资源会变慢，而 Pages 的构建上限是 20 分钟。
3. **单文件 25 MiB**——只有视频和未压缩原图会撞上，但一旦撞上就是硬失败。

所以真正的理由是「仓库和构建」，不是「配额」。这个区分很重要：它决定了你只需要搬走大文件，而不是把整站搬到别处。

## 方案：公开桶 + 自定义域，不碰 Worker

静态站接对象存储，有三条路：

| 方案 | 是否需要服务端 | 本站能不能用 |
|---|---|---|
| 私有桶 + 签名 URL | 要（得有人签发） | ❌ 破坏纯静态 |
| Worker 代理转发 | 要 | ❌ 破坏纯静态 |
| 公开桶 + 自定义域 | 不要 | ✅ |

选了第三条。所有对象放在 `connexion-media` 桶里，通过 `cdn.connexioncollective.com` 直接提供——域名在同一个 Cloudflare 账号下，证书自动签发，出站流量免费。

<img src="https://cdn.connexioncollective.com/media/blog/2026/r2-request-flow-9bc14955f92c.webp" alt="请求链路：访客浏览器 → WAF 防盗链 → 边缘缓存 → R2 桶" width="1200" height="580" loading="lazy" />

关键点：**没有任何服务端参与**。请求打到 Cloudflare 边缘就被处理掉了，命中就返回，未命中才回源到 R2 取一次。站点依然只有构建产物。

## 文件名就是版本号

缓存想开得长，前提是「同一个 URL 永远是同一份内容」。所以文件名里带上内容的哈希：

<img src="https://cdn.connexioncollective.com/media/blog/2026/r2-content-addressed-a890d33d7839.webp" alt="内容寻址：hero.webp 经 sha256 取前 12 位后变成 hero-a1b2c3d4e5f6.webp" width="1200" height="460" loading="lazy" />

上传脚本做的事很简单：算 SHA-256、取前 12 位塞进文件名、设好 `Content-Type` 和 `Cache-Control`。于是可以放心地写：

```
Cache-Control: public, max-age=31536000, immutable
```

代价也很明确：**换图必须换 URL**。想覆盖同名对象来「更新」图片，结果就是边缘一直吐旧图——这类 bug 排查起来极其费时间。

## CORS 挡不住盗链

这是我这轮最大的收获，也是最容易被搞混的一点。

| 场景 | 受 CORS 限制吗 |
|---|---|
| 别人在页面里 `<img>` 贴你的图 | ❌ 完全不受限，照常显示 |
| 别人用 `fetch()` 读你的图 | ✅ 受限 |
| 自家灯箱用 canvas 读像素 | ✅ 受限（跨域会污染 canvas） |

也就是说，**CORS 是「脚本能不能读字节」的开关，跟「别人能不能展示你的图」没半点关系**。配了 CORS 也挡不住盗链，因为它压根不管 `<img>`。

真正的防盗链只有一层可用的东西：在边缘比对 `Referer`。给 `cdn.` 域加一条 WAF 规则：

```
(http.host eq "cdn.connexioncollective.com"
 and http.referer ne ""
 and not http.referer contains "connexioncollective.com")
```

命中就 Block。这里有个刻意的取舍——**放行空 Referer**。因为直接打开图片链接、RSS 阅读器、隐私模式浏览器都可能不发 Referer，全拦掉会误伤正常访问。

这套规则挡不住 `curl -H "Referer: ..."` 这种认真伪造，也别指望它能。公开桶的定位就是「挡住顺手盗链，把成本压到可控」，真要防住只有签名 URL——而那需要服务端，直接退出这个方案。

## 配置十分钟，验证两小时

这轮真正花时间的不是配置，是**怎么证明它真的在工作**。

第一个坑：`curl` 永远是 403。查了半天才发现不是防盗链生效，而是这个 zone 开了全站人机校验——**连主站用 curl 都是 403**。它返回的 403 带 `cf-mitigated: challenge`，跟 WAF 拦截的 403 长得像但完全不同。

第二个坑：无头浏览器同样被判定为机器人，拿到的还是挑战页。

第三个坑最有意思：我第一次测防盗链，把伪造的 `Referer` 也加到了挑战平台的请求上，结果人机校验永远解不出来，页面卡在挑战页——看起来「成功拦截了」，实际上什么都没证明。

正确做法是分两步：先正常访问一次解出人机校验，再用一次独立请求带上要测的 `Referer`。这样拿到的 403 才一定是 WAF 造成的。

最终结果：

| 场景 | 结果 |
|---|---|
| 自家页面内嵌（`Referer` 换成站点域名） | `200`，图片正常渲染 |
| 外来 `Referer` | `403`，无 `cf-mitigated` 头，`cache-control: no-store` |
| 直接打开图片链接（空 `Referer`） | `200` |
| 重复请求 | `cf-cache-status: HIT` |
| 对象元数据 | `public, max-age=31536000, immutable` |

## 现在是什么状态

- 桶、自定义域、CORS、缓存规则、防盗链，全部配好并实测过
- 站内第一次真正有了配图，就是你正在看的这几张
- 图片源文件放在 `media-src/`，不进 git；上传后只保留 URL
- 换图记得换 key，别覆盖

最后一句实话：如果你的站只有几 MB、图片屈指可数，**别折腾这个**。等到仓库开始因为图片变胖、构建时间开始变长，再动手也不迟——那时候你才知道自己到底在解决什么问题。
