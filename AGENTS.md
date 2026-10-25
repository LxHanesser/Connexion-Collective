# 项目守则（每次改动前先读）

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

## 三、协作流程

- 提交前必须本地跑 `npm run build`，要求 **0 报错**（`onBrokenLinks: 'throw'` 会拦住坏链）。新增依赖后同样要跑一次。
- **不要自动验证线上版本**。推送后给出人工验证清单（打开哪个页面、看什么、判断标准），由用户自己确认。
- 改动保持小步、可回滚；一个提交只做一件事，提交信息写清动机。
- 涉及视觉改动时，说明改了哪个页面/组件，方便用户对照检查。

## 四、当前技术基线

- Docusaurus 3.10.2（`@docusaurus/faster`）+ React 19，部署在 Cloudflare Pages。
- 搜索：`@easyops-cn/docusaurus-search-local@0.55.3`（构建期索引，浏览器端检索）。
- 评论：Giscus（`LxHanesser/Connexion-Collective` 仓库的 Discussions）。
- 页脚运行天数：`src/siteMeta.js` + `src/clientModules/siteUptime.js`，浏览器端计算。
