# 项目守则（每次改动前先读）

> 三条硬约束：**安全第一**、**兼容 Cloudflare Pages**、**移动端优先**。

## 一、安全第一

- **纯静态**：本站只有构建产物（`build/`）被托管。不得引入服务端代码、Cloudflare Pages Functions、Workers、数据库、KV、R2，也不得有需要常驻进程的功能。所有逻辑只能发生在「构建时」或「访客浏览器里」。
- **零信任输入**：任何来自 URL、评论、搜索词、第三方接口的数据都当作不可信。当前站内没有表单；将来要加评论投稿、订阅、留言板，必须先过一遍 XSS/滥用评估再动手。
- **第三方代码要审**：新增依赖必须 ①锁定精确版本（`--save-exact`）②提交 `package-lock.json` ③确认维护活跃 ④看清 `postinstall` 等安装脚本 ⑤优先选无原生编译、无远程脚本的方案。禁止引入来源不明的统计、字体、CDN、A/B 测试脚本。
- **外部资源白名单**：目前只允许 `giscus.app`（评论）与 GitHub 头像。新增任何外域请求都要先说明理由。
- **密钥不入库**：Cloudflare API Token、GitHub Token 等一律不写进仓库、不写进 `docusaurus.config.js`。
- **安全头**：`static/_headers` 里的 `X-Frame-Options`、`X-Content-Type-Options`、`Referrer-Policy`、`Permissions-Policy` 不得削弱。改动 CSP 属于高风险操作，必须实测搜索与评论后再提交。
- **最小暴露**：构建产物里不应出现草稿、内部备注、本地路径、个人隐私信息。

## 二、兼容 Cloudflare Pages

- 构建只依赖：`npm ci` + Node 20 以上 + 纯静态输出。不得依赖 Pages 之外的服务。
- 新依赖必须能在 Pages 的 Linux x64 构建机上**免编译安装**（例如中文分词选 `@node-rs/jieba` 这类预编译二进制，而不是要 node-gyp 编译的 `nodejieba`）。
- 不使用需要长连接的服务端能力（SSE、WebSocket、定时任务）。想要「动态」效果时，优先浏览器端计算或构建时生成。
- 缓存与缓存失效通过 `_headers` 与内容哈希文件名控制，不依赖手动 purge。
- 不要频繁触发构建：避免无意义的 commit，避免把大文件（视频、超大图片）塞进仓库拖慢构建。

## 三、移动端优先

手机流量已超过桌面，任何改动都必须先在窄屏成立：

- **断点**：`768px` 以下视作手机，`996px` 以下视作窄屏（Docusaurus 导航折叠点）。新增布局必须自己写窄屏规则，不要依赖「它会自动堆叠」——Infima 的 `col--4` 在手机上仍是三列。
- **不产生横向滚动**：禁止固定像素宽度大于 320px 的元素；图片、SVG、表格、代码块统一 `max-width: 100%`，表格用 `display: block; overflow-x: auto` 包裹。
- **触摸目标**：按钮/链接点击区域不小于 44×44px，可点击元素之间留 8px 以上间距；hover 只做锦上添花，不能承载唯一信息（手机上永远不 hover）。
- **字号与行高**：正文不小于 16px；大标题用 `clamp()` 而不是固定 `rem`，避免小屏溢出或过大。
- **动效克制**：尊重 `prefers-reduced-motion`，持续动画（跑马灯、呼吸背景）在该偏好下停止；不用需要高帧率的持续重绘。
- **图片**：优先 WebP/AVIF，标注 `width`/`height` 或固定比例避免布局抖动（CLS）；首屏以下的图片加 `loading="lazy"`。
- **验证方式**：构建后至少检查 375px（iPhone SE/13 mini）与 390px（iPhone 14）两档：无横向滚动、导航可展开、搜索可用、正文可读、按钮可点。

## 四、协作流程

- 提交前必须本地跑 `npm run build`，要求 **0 报错**（`onBrokenLinks: 'throw'` 会拦住坏链）。新增依赖后同样要跑一次。
- **推送前必须先问用户**：任何改动先在本地改好、构建验证，向用户说明「改了什么、验了什么」，得到明确同意后才 `git push`。
  不要因为一个小改动就自动上线；连续开发期间可以把多个改动攒成一批再一起问。
- **不要自动验证线上版本**。推送后给出人工验证清单（打开哪个页面、看什么、判断标准），由用户自己确认。
- 改动保持小步、可回滚；一个提交只做一件事，提交信息写清动机。
- 涉及视觉改动时，说明改了哪个页面/组件，方便用户对照检查。

## 五、当前技术基线

- Docusaurus 3.10.2（`@docusaurus/faster`）+ React 19，部署在 Cloudflare Pages。
- 搜索：`@easyops-cn/docusaurus-search-local@0.55.3`（构建期索引，浏览器端检索）。
- 评论：Giscus（`LxHanesser/Connexion-Collective` 仓库的 Discussions）。
- 页脚运行天数：`src/siteMeta.js` + `src/clientModules/siteUptime.js`，浏览器端计算。
- 在线工具：`/tools`（列表）与 `/tools/image-compress`（图片压缩），全部浏览器端运行。
  编码器为 `@jsquash/webp@1.5.0`、`@jsquash/jpeg@1.6.0`、`@jsquash/oxipng@2.3.0`，
  WASM 二进制**自托管**在 `static/wasm/`（禁止改成 CDN），页面零上传、零外域请求。
  另有格式转换、裁剪旋转、加水印、二维码（`qrcode-generator@2.0.4`，零依赖）、
  开发工具（JSON/Base64/哈希/时间戳/UUID，全部原生 API）五个页面，同样零上传。
  新增工具必须：独立路由（自动代码分割）、重逻辑动态 import、刷新后不留数据。
- 将来若加 CSP，图片压缩页需要 `script-src 'wasm-unsafe-eval'`，否则 WASM 会被拦。
