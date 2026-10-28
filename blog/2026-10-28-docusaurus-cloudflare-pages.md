---
slug: docusaurus-cloudflare-pages
title: 把 Docusaurus 部署到 Cloudflare Pages：从本地到自定义域名的完整流程
authors: [lxhanesser]
tags: [技术, 前端]
date: 2026-10-28T14:40:00+08:00
description: 从零把 Docusaurus 接到 Cloudflare Pages：构建配置、自定义域名、_headers 缓存与安全头、上线检查清单，以及我实际踩过的八个坑（含 Cloudflare 拒绝预取导致的一串 503）。
---

这个站就是 Docusaurus + Cloudflare Pages。部署这件事本身不难，难的是**上线之后那些没人告诉你、但一定会遇到的细节**：缓存策略、响应头、404、双语 sitemap、构建产物里的本地路径，以及 Cloudflare 边缘的一些「优化」会和框架打架。

这篇文章把整条链路完整写一遍，最后附一份可以直接对着检查的上线清单。

<div className="blog-diagram">
<img src="/img/blog/docusaurus-pages/fig1-deploy-flow.svg" alt="部署链路：本地仓库 → GitHub → Cloudflare 构建 → 边缘节点 → 访客，非 main 分支走预览部署" width="1000" height="470" loading="lazy" />
</div>
<p className="blog-diagram__hint">← 左右滑动查看完整示意图 →</p>

*构建发生在 Cloudflare 的机器上，本地既不需要服务器，也不需要上传 `build/`。*

{/* truncate */}

## 为什么是 Pages

静态站的可选项很多：Vercel、Netlify、GitHub Pages、对象存储 + CDN。选 Pages 的理由很实际：

| 需求 | Pages 的表现 |
|---|---|
| 免费额度 | 每月 500 次构建、20000 个文件、单文件 25 MiB |
| 构建与部署 | 连 GitHub 仓库，push 即构建，产物原子替换 |
| 回滚 | 部署历史里任选一个版本回滚，秒级 |
| 预览 | 每个非 main 分支自动得到独立预览域名 |
| 域名与证书 | 绑定自定义域名后自动签发并续期 |
| 边缘 | 与 Cloudflare CDN / WAF / DNS 同一套体系 |

对纯静态站来说，这些已经覆盖了 95% 的需求。

## 一、本地先跑通

> **环境还没装好？** 这篇假设你已经能在终端里跑通 `node`、`npm` 和 `git`。
> 如果还没有（或者不确定），先看 [新电脑第一步：在 Windows 上装好 Node.js、npm 和 Git](/blog/windows-dev-environment) —— 那篇从 PATH 原理讲到验证通过，装完再回来。

新建项目：

```bash
npx create-docusaurus@latest my-site classic
cd my-site
npm run start      # 开发服务器，热更新
npm run build      # 生产构建
npm run serve      # 预览构建产物
```

已有的项目就跳过这步。**关键是要先确认 `npm run build` 在本地能 0 报错**——CI 上失败比本地失败难查得多。

Docusaurus 3 要求 Node ≥ 18，实际建议 20 或以上。

## 二、写对 `docusaurus.config.js` 的三个字段

```js
const config = {
  title: 'Connexion Collective',
  url: 'https://connexioncollective.com',  // 不带结尾斜杠
  baseUrl: '/',                            // 部署在根路径就是 /
  trailingSlash: undefined,                // 见下方说明
  // ...
};
```

这三个字段决定了所有资源链接：

| 字段 | 写错的后果 |
|---|---|
| `url` | sitemap、RSS、canonical、OG 图全部指向错误域名 |
| `baseUrl` | 资源 404：页面能打开但 CSS/JS 全丢 |
| `trailingSlash` | 站内链接与生成的目录结构不一致，出现重复 URL |

`trailingSlash` 有三个取值：

- `undefined`：按 URL 里有没有斜杠来生成（默认，最省心）
- `true`：统一 `/blog/post/` 形式
- `false`：统一 `/blog/post` 形式

**改了它就要全站重建**，因为所有链接的写法都会变。建议一开始就定下来。

## 三、仓库与构建命令

只需要三样东西进仓库：`package.json`、`package-lock.json`、源码。`build/` 和 `node_modules/` 都进 `.gitignore`。

CI 上用 `npm ci` 而不是 `npm install`：

```bash
npm ci          # 严格按 lockfile 安装，可复现
npm run build   # 产物在 build/
```

`npm ci` 的好处是**确定性**：本地装的是什么版本，CI 上就是什么版本。代价是 `package-lock.json` 必须和 `package.json` 一致，否则直接报错——这其实是好事，能提前发现漏提交的 lockfile。

构建完成后，先看一眼 `build/` 里到底有什么 —— 后面所有的配置都在围着这个目录转：

<div className="blog-diagram">
<img src="/img/blog/docusaurus-pages/fig2-build-output.svg" alt="build 目录结构：index.html、404.html、带哈希的 assets、sitemap、_headers" width="1000" height="520" loading="lazy" />
</div>
<p className="blog-diagram__hint">← 左右滑动查看完整示意图 →</p>

*这张图里的 `_headers` 和 `404.html`，是本文后半部分的主角。*

## 四、在 Cloudflare 上创建项目

### 4.1 连接仓库

```
Cloudflare Dashboard → Workers & Pages → Create → Pages → Connect to Git
→ 选择仓库 → 选择分支（main）
```

构建配置填三项：

| 字段 | 值 |
|---|---|
| Framework preset | 有 `Docusaurus` 就选它，没有就选 `None` |
| Build command | `npm run build` |
| Build output directory | `build` |

> ⚠️ 输出目录是 **`build`**，不是 `public`、不是 `dist`。填错的表现是「构建成功但部署了一个空站」。

### 4.2 固定 Node 版本

在项目设置里加环境变量：

```
NODE_VERSION = 20
```

不加的话，构建机会用默认版本；Docusaurus 大版本升级时很容易因为 Node 太旧而挂掉。这是最容易被忽略、也最难查的一类失败。

顺便说：**不要在这里放任何密钥**。构建只需要 Node 和依赖，放 token 进去等于给供应链攻击留后门。

### 4.3 第一次部署

push 到 main 后会自动开始构建。几分钟后拿到一个 `xxx.pages.dev` 的地址。

**先在这个临时域名上把所有功能点一遍**，再绑自定义域名——这样出问题时能确定是「构建问题」还是「域名问题」。

## 五、绑定自定义域名

```
项目 → Custom domains → Set up a custom domain
```

如果你的域名托管在同一个 Cloudflare 账号下，添加后会自动创建正确的 DNS 记录；否则需要手动加一条 CNAME 指向 `项目名.pages.dev`。

| 事项 | 说明 |
|---|---|
| 证书 | 自动签发，到期自动续，无需操作 |
| `www` | 建议单独加一条重定向规则到主域，避免两份内容 |
| 生效时间 | 通常几分钟；DNS 没生效时证书会一直卡在 pending |

绑定完成后，`pages.dev` 那个地址仍然可用——它是公开的。如果不想被搜索引擎收录，记得在 `robots.txt` 里屏蔽，或者用 Cloudflare Access 保护起来。

## 六、部署后必须配的三件事

### 6.1 `_headers`：缓存与安全头

Pages 支持在产物根目录放一个 `_headers` 文件，用来声明响应头。Docusaurus 项目里把它放在 `static/_headers`，构建时会自动复制到 `build/` 根目录。

```
/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: geolocation=(), microphone=(), camera=()

/assets/*
  Cache-Control: public, max-age=31536000, immutable

/img/*
  Cache-Control: public, max-age=3600, must-revalidate
```

<div className="blog-diagram">
<img src="/img/blog/docusaurus-pages/fig3-cache.svg" alt="缓存策略：HTML 每次回源校验，带哈希的静态资源可以缓存一年" width="1000" height="430" loading="lazy" />
</div>
<p className="blog-diagram__hint">← 左右滑动查看完整示意图 →</p>

*HTML 与静态资源必须分开处理，这是整份配置的核心。*

为什么这样分：

- **HTML** 内容会变，缓存一年等于让访客永远看不到新文章。
- **`/assets/*`** 文件名带内容哈希，内容一变文件名就变，所以可以放心 `immutable`。

一个常见的坑：`_headers` 放错位置（比如放在仓库根目录而不是 `static/`）时，Pages **不会报错**，只是静默地不生效。验证方法是本地构建后看 `build/_headers` 在不在。

### 6.2 安全响应头与 CSP

基础头之外，如果要用 CSP，需要按站点实际用到的东西来写。一个真实的例子：

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://cdn.example.com; connect-src 'self' https://cloudflareinsights.com; frame-src https://giscus.app; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'
```

几个必须知道的点：

| 指令 | 为什么需要 |
|---|---|
| `'wasm-unsafe-eval'` | 页面上跑 WASM 编码器（图片压缩之类）必需，不加会被拦 |
| `'unsafe-inline'`（style） | Docusaurus 有内联样式，删掉会掉样式 |
| `frame-ancestors 'none'` | 防点击劫持，比 `X-Frame-Options` 更彻底 |
| `object-src 'none'` | 禁掉 `<object>` / `<embed>`，历史漏洞大户 |

> 注意：`frame-ancestors` 必须写在 CSP 里，写在别处无效。

### 6.3 404 与 sitemap

Docusaurus 会生成 `build/404.html`，Pages 在未知路径时会返回它，状态码仍是 404——这是正确行为。

但 sitemap 默认可能把 `/404` 也收进去，需要手动排除：

```js
sitemap: {
  ignorePatterns: ['/404', '/en/404'],   // 双语站要把两种都排掉
},
```

## 七、我实际踩过的八个坑

### 坑 1：构建产物里带着本机绝对路径

Docusaurus 会把 `siteConfig` 序列化进 JS，其中 `themes`/`plugins` 是**绝对路径**：

```text
D:\Projects\my-website\node_modules\@easyops-cn\docusaurus-search-local
```

这不影响功能，但等于把本地目录结构公开了。解决办法是在 `postBuild` 钩子里把站点目录字符串替换掉：

```js
// plugins/postBuildCleanup.cjs
function postBuild(context) {
  const siteDir = context.siteDir;
  const escaped = JSON.stringify(siteDir).slice(1, -1); // Windows 反斜杠转义形态

  for (const file of walk(context.outDir)) {
    if (!/\.(html|js|json)$/.test(file)) continue;
    let text = fs.readFileSync(file, 'utf8');
    text = text.split(escaped).join('/site');
    text = text.split(siteDir).join('/site');
    fs.writeFileSync(file, text);
  }
}
```

验证方法：构建后搜 `build/` 里有没有你的用户名或盘符。

### 坑 2：Cloudflare 拒绝预取，产生一串 503

这个最迷惑。控制台里十几条 `503`，全部指向 `/assets/js/*.js`，但同一路径用 curl 请求是 200。

原因是 Cloudflare 的 **Speed Brain** 会拦截所有 `Sec-Purpose: prefetch` 请求，响应头里写着：

```
cf-speculation-refused: prefetch refused: not eligible
```

而 Docusaurus 的 `Link` 组件用 IntersectionObserver，链接进入视口就会预取对应路由的 chunk——于是每次打开页面都有十几条预取被拒。

两种解法：

1. **关闭 Speed Brain**（站点 → Speed → Optimization）：Docusaurus 的 chunk 预取恢复正常，对 SPA 来说这才是真正有用的预取。
2. **前端关掉预取**：拦截 `window.docusaurus` 的赋值，把 `prefetch` 换成空函数。

我选了第一种，因为它对 **SPA 的站内跳转没有价值**：Speed Brain 预取的是 HTML 文档，而 SPA 导航根本不请求文档。

### 坑 3：用 curl 检查线上，结果全是 403

Cloudflare 会对可疑的自动化请求返回挑战页（约 5 KB 的 HTML，状态码 403 或 503）。

这时候用 curl 抓页面，会得到「页面里没有 xxx」的假结论——**内容其实在，只是你拿到的是挑战页**。

判断方法：看响应长度和 `content-type`，挑战页通常 5–6 KB 且包含 `Just a moment`。真要验证就用真实浏览器，或者接受「这次验不了」。

### 坑 4：`_headers` 里写的值，线上看到的不一样

比如你在 `_headers` 里写 `X-Frame-Options: DENY`，但线上响应头显示 `SAMEORIGIN`。

原因是 Cloudflare 边缘的 **Transform Rules / Managed Rules** 会覆盖源站设置。`_headers` 只是「声明」，最终值由边缘决定。

排查顺序：先看响应头，再看 Cloudflare 的 Rules 配置，最后才怀疑 `_headers`。

### 坑 5：Node 版本太旧，构建失败在依赖安装阶段

症状是构建日志里出现一堆 `Unsupported engine` 或语法错误。加 `NODE_VERSION` 环境变量即可。

### 坑 6：`npm install` 与 `npm ci` 的差异

本地习惯 `npm install`，CI 用 `npm ci`，两者对 lockfile 的要求不同。如果 `package-lock.json` 落后于 `package.json`，`npm ci` 会直接失败。

习惯：**提交前本地跑一次 `npm ci && npm run build`**，和 CI 环境对齐。

### 坑 7：预览部署在悄悄消耗构建次数

每个非 main 分支的 push 都会触发一次预览构建。个人站影响不大，但如果你频繁推分支、又赶上免费额度，可能会意外撞到 500 次/月的上限。

需要的话可以把预览限定在特定分支，或者干脆只在 PR 时构建。

### 坑 8：改了 `trailingSlash` 之后旧链接全挂

改了之后生成的目录结构会变（`/blog/post` ↔ `/blog/post/`），外部链接、收藏、搜索结果都会指向旧形式。

如果一定要改，用 `_redirects` 加一条规则兜底：

```
/blog/:slug/  /blog/:slug  301
```

## 八、上线检查清单

部署完成后，按这份表逐项过一遍：

| 检查项 | 期望结果 |
|---|---|
| 首页、文章页、文档页 | 200，样式完整 |
| 不存在的路径 | 404，且显示自定义 404 页 |
| `/sitemap.xml`、`/robots.txt` | 200，内容里的域名正确 |
| RSS / Atom | 200，能正常解析 |
| 站内搜索索引 | 200（通常是 `search-index.json`） |
| `/assets/*` 的缓存头 | `max-age=31536000, immutable` |
| HTML 的缓存头 | `max-age=0` 或 `no-cache` |
| 安全头 | CSP、`nosniff`、`frame-ancestors` 都在 |
| 自定义域名 | 证书有效，`www` 正确跳转 |
| 移动端 375px | 无横向滚动，导航可展开 |
| 产物里是否有本地路径 | 搜不到盘符/用户名 |

## 九、成本与限制

| 项 | 免费额度 |
|---|---|
| 构建次数 | 500 次/月 |
| 站点文件数 | 20000 |
| 单文件大小 | 25 MiB |
| 带宽 | 不限（由 Cloudflare CDN 承担） |
| 自定义域名 | 支持，证书自动 |

个人站基本用不完。真正需要注意的只有两点：**构建次数**（分支多、提交频繁时）和**单文件大小**（别把视频塞进仓库）。

## 小结

整个流程可以压成五步：

```
1. 本地 npm run build 通过
2. 连仓库，Build command = npm run build，输出目录 = build
3. 加 NODE_VERSION，绑自定义域名
4. 写 static/_headers（缓存 + 安全头）
5. 按清单逐项验证
```

真正花时间的不是「怎么部署」，而是**部署之后怎么确认它是对的**：缓存有没有生效、头有没有被覆盖、产物里有没有不该出现的东西、控制台里那些红色报错到底是什么。

这几件事，才是把静态站做「稳」的部分。
