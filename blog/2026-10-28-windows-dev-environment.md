---
slug: windows-dev-environment
title: 新电脑第一步：在 Windows 上装好 Node.js、npm 和 Git
authors: [lxhanesser]
tags: [技术, 前端]
date: 2026-10-28T15:10:00+08:00
description: 刚装好的 Windows 上敲 npm 和 git 会直接报错，因为它们不是系统自带的。这篇从 PATH 原理讲起，手把手装 Node.js 与 Git、验证环境、跑通第一个项目，并附上所有官方下载地址和常见报错对照表。
---

如果你刚拿到一台新电脑，或者刚重装完系统，打开终端敲下 `npm -v`，得到的多半是这一句：

```text
'npm' 不是内部或外部命令，也不是可运行的程序或批处理文件。
```

这不是你命令打错了，也不是电脑坏了 —— **Windows 出厂时不带 Node.js、npm 和 Git**，得自己装。

这篇文章从「为什么」讲到「装完怎么验证」，全程不需要任何前置知识。

{/* truncate */}

## 一、先搞懂：命令为什么能「直接敲」

在终端里输入一个词，Windows 会去一个叫 **PATH** 的列表里逐个目录找同名程序：

<div className="blog-diagram">
<img src="/img/blog/windows-env/fig1-path.svg" alt="命令查找流程：输入 npm → Windows 在 PATH 目录里查找 → 找到就运行，没找到就报不是内部或外部命令" width="1000" height="500" loading="lazy" />
</div>
<p className="blog-diagram__hint">← 左右滑动查看完整示意图 →</p>

所以「命令不存在」只有两种可能：

1. **程序根本没装**
2. **装了，但所在目录不在 PATH 里**

安装 Node.js 和 Git 时，安装包默认会把它们加进 PATH —— 前提是你没把那个勾去掉。

> 小知识：Windows 里能直接敲的命令，背后通常是 `.exe`、`.cmd` 或 `.ps1` 文件。`npm` 其实是 `npm.cmd`，`git` 是 `git.exe`。

## 二、要装什么

只需要装两个，另外两个可选：

<div className="blog-diagram">
<img src="/img/blog/windows-env/fig2-checklist.svg" alt="安装清单：Node.js 与 Git 必装，VS Code 与 Windows Terminal 可选，附官网地址" width="1000" height="440" loading="lazy" />
</div>
<p className="blog-diagram__hint">← 左右滑动查看完整示意图 →</p>

| 软件 | 作用 | 官方下载地址 |
|---|---|---|
| **Node.js（LTS）** | 运行项目，自带 npm | [nodejs.org/zh-cn/download](https://nodejs.org/zh-cn/download) |
| **Git for Windows** | 下载代码、提交改动 | [git-scm.com/download/win](https://git-scm.com/download/win) |
| VS Code（可选） | 写代码的编辑器 | [code.visualstudio.com/Download](https://code.visualstudio.com/Download) |
| Windows Terminal（可选） | 更好用的终端 | [aka.ms/terminal](https://aka.ms/terminal) |

**两个版本概念**：

- **LTS**：长期支持版，稳定，选它
- **Current**：最新版，可能有新特性也可能有新 bug，新手别选

> ⚠️ 只从上面这些官方地址下载。第三方「绿色版」「一键安装包」有可能被改过，尤其是需要用账号密码的命令，风险不值得冒。

## 三、装 Node.js

### 3.1 下载

打开 [nodejs.org/zh-cn/download](https://nodejs.org/zh-cn/download)，选 **LTS** 那一栏，下载 **Windows Installer (.msi) 64-bit**。

### 3.2 安装

双击运行，一路 `Next`，只在一页停一下：

<div className="blog-diagram">
<img src="/img/blog/windows-env/fig3-installers.svg" alt="Node.js 与 Git 安装向导里必须确认的选项：Add to PATH、npm、默认分支 main" width="1000" height="520" loading="lazy" />
</div>
<p className="blog-diagram__hint">← 左右滑动查看完整示意图 →</p>

| 选项 | 怎么选 |
|---|---|
| **Add to PATH** | **保持勾选**（这是最关键的一项） |
| **npm package manager** | 保持勾选，npm 会一起装好 |
| **Tools for Native Modules** | **不要勾** —— 普通前端项目用不到，勾了会额外装一堆编译工具，动辄几个 G |

装完点 `Finish`。

### 3.3 验证

**先关掉原来的终端，重新打开一个**（PATH 只在终端启动时读取，老窗口不会自动更新）。

```powershell
node -v
```

正常会输出类似：

```text
v20.11.1
```

再验证 npm：

```powershell
npm -v
```

```text
10.2.4
```

版本号和这里不一样完全正常，能输出就行。

## 四、装 Git

### 4.1 下载

打开 [git-scm.com/download/win](https://git-scm.com/download/win)，下载 **64-bit Git for Windows Setup**（不是 Portable 版）。

### 4.2 安装

一路 `Next`，只有三页值得看一眼：

| 页面 | 建议 |
|---|---|
| **Adjusting your PATH environment** | 保持默认：*Git from the command line and also from 3rd-party software* |
| **Adjusting the name of the initial branch** | 选 *Override*，填 `main`（和现在主流仓库一致） |
| **Configuring the line ending conversions** | 保持默认（*Checkout Windows-style, commit Unix-style*） |

编辑器那页选什么都行，以后可以改。

装完会多一个 **Git Bash** —— 一个类 Linux 的终端，后面很多命令在里面跑更顺。

### 4.3 配置身份

Git 需要知道「这次提交是谁做的」。装完第一次用之前，先跑这两行：

```bash
git config --global user.name "你的名字"
git config --global user.email "你的邮箱"
```

- 邮箱建议和 GitHub 账号一致，否则提交不会算到你的贡献记录里
- 这两行只需要做一次，之后一直有效

验证：

```bash
git config --global --list
```

## 五、三条命令验完环境

<div className="blog-diagram">
<img src="/img/blog/windows-env/fig4-verify.svg" alt="验证环境：node -v、npm -v、git --version 三条命令与期望输出" width="1000" height="430" loading="lazy" />
</div>
<p className="blog-diagram__hint">← 左右滑动查看完整示意图 →</p>

```powershell
node -v
npm -v
git --version
```

三条都能输出版本号，环境就齐了。

想确认程序到底装在哪，可以用 `where`：

```powershell
where node
where npm
where git
```

它会把完整路径打出来。**如果 `where` 找不到，但程序确实装了**，那就是 PATH 没配好 —— 重装时注意勾选 `Add to PATH` 最省事。

## 六、跑通第一个项目

环境装好不等于能用，找个公开仓库练手最直接。以本站仓库为例：

```bash
# 1. 选一个放代码的目录
cd D:\Projects

# 2. 下载代码
git clone https://github.com/LxHanesser/Connexion-Collective.git

# 3. 进目录
cd Connexion-Collective

# 4. 安装依赖（有 package-lock.json 就用 ci）
npm ci

# 5. 启动开发服务器
npm run start
```

浏览器打开 `http://localhost:3000` 就能看到页面。

### `npm ci` 和 `npm install` 有什么区别

| 命令 | 用途 |
|---|---|
| `npm install` | 日常加依赖、改 `package.json` 时用 |
| `npm ci` | **拉别人的项目时用**，严格按 `package-lock.json` 装，速度更快，版本完全一致 |

新手记住一条就够：**clone 下来的项目，用 `npm ci`**。

## 七、最容易撞的第二个报错：npm.ps1

装好 Node 之后，`node -v` 没问题，但 `npm` 一敲就是一大段红字：

<div className="blog-diagram">
<img src="/img/blog/windows-env/fig5-execution-policy.svg" alt="PowerShell 报 npm.ps1 无法加载因为禁止运行脚本，用 Set-ExecutionPolicy 一行修复" width="1000" height="450" loading="lazy" />
</div>
<p className="blog-diagram__hint">← 左右滑动查看完整示意图 →</p>

这是 Windows 的**脚本执行策略**，不是 Node 装坏了。修复只要一行：

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

按 `Y` 确认，然后重开终端。

| 参数 | 含义 |
|---|---|
| `-Scope CurrentUser` | 只改当前用户，不影响整台机器 |
| `RemoteSigned` | 本地脚本可运行；网上下载的脚本必须有签名 |

比直接设成 `Unrestricted` 安全得多。

如果不想动系统设置，也可以改用 **Git Bash**（装 Git 时自带），它不受这条策略限制。

## 八、常见报错对照表

| 报错 | 原因 | 解决 |
|---|---|---|
| `'npm' 不是内部或外部命令` | 没装 Node，或没进 PATH | 重装并勾 `Add to PATH`；或重开终端 |
| `npm.ps1 无法加载，禁止运行脚本` | PowerShell 执行策略 | `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` |
| `'git' 不是内部或外部命令` | Git 没装或 PATH 没配 | 重装 Git，选默认 PATH 选项 |
| `EPERM` / `EACCES` | 没权限、文件被占用 | 别用系统目录；关掉杀软实时扫描再试 |
| `Unsupported engine` | Node 版本太低 | 装 LTS 最新版 |
| `fatal: not a git repository` | 当前目录不对 | `cd` 到项目目录再操作 |
| `Host key verification failed` | 用了 SSH 但没配密钥 | 改用 HTTPS 地址 clone |
| 终端里中文乱码 | 编码不是 UTF-8 | 用 Windows Terminal，或 `chcp 65001` |
| `npm ERR! network` | 网络问题 | 检查代理/公司网络限制 |

## 九、装完了，对照检查一遍

| 检查项 | 命令 | 期望 |
|---|---|---|
| Node 可用 | `node -v` | 输出 `v20.x` 或更高 |
| npm 可用 | `npm -v` | 输出 `10.x` 左右 |
| Git 可用 | `git --version` | 输出 `git version 2.x` |
| Git 身份已配置 | `git config --global user.name` | 输出你的名字 |
| 能拉代码 | `git clone <任意公开仓库>` | 不报错 |
| 能装依赖 | `npm ci` | 生成 `node_modules/` |
| 能跑项目 | `npm run start` | 浏览器能打开 |

## 十、可选：同时用多个 Node 版本

有的老项目要求 Node 16，新项目要 20。这种时候用 **nvm-windows** 管理多版本：

- 下载：[github.com/coreybutler/nvm-windows/releases](https://github.com/coreybutler/nvm-windows/releases)

```bash
nvm install 20
nvm use 20
nvm list
```

> ⚠️ 装 nvm 之前要先卸载已有的 Node.js，否则两者会抢 PATH，出现「版本对不上」的怪问题。

新手第一步不需要它，先把单版本跑通再说。

## 小结

整个流程就五步：

```text
1. 装 Node.js LTS（勾 Add to PATH）
2. 装 Git for Windows（默认分支填 main）
3. 配置 git 的 user.name / user.email
4. 重开终端，跑 node -v / npm -v / git --version
5. clone 一个项目，npm ci，npm run start
```

看起来步骤不少，但真正花时间的往往不是「点下一步」，而是**装完发现命令还是找不到**、**npm 报一堆红字**这类问题。这类问题九成出在三处：PATH 没生效、终端没重开、PowerShell 执行策略。

把这三件事记住，Windows 上的开发环境基本不会卡住你。

## 下一步

环境装好之后，可以接着看 [把 Docusaurus 部署到 Cloudflare Pages](/blog/docusaurus-cloudflare-pages) —— 从构建配置、缓存与安全响应头，到上线检查清单，把这套环境真正用起来。
