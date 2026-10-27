# Security Policy

## 适用范围 / Scope

本站是纯静态站点（Docusaurus 构建 → Cloudflare Pages 托管），没有后端服务、数据库、
登录、表单或上传接口，所有逻辑只发生在构建时或访客浏览器里。

This is a purely static site. There is no backend, database, login, form, or upload endpoint.

## 在范围内 / In scope

- XSS、DOM 注入、模板注入
- 安全响应头（CSP / HSTS / X-Frame-Options / nosniff / Referrer-Policy）缺失或被绕过
- 依赖与构建链的供应链问题
- 内容或构建产物意外暴露敏感信息（密钥、内部路径、个人数据）
- 会影响其他访客的问题

## 不在范围内 / Out of scope

- 第三方服务自身的问题（Cloudflare、GitHub、giscus）
- 需要物理接触设备，或已取得账号权限才能利用的问题
- 无实际影响的自动化扫描报告（仅版本号匹配、无 PoC）
- 社会工程、压力测试、拒绝服务

## 如何报告 / How to report

请使用 GitHub 的私密漏洞报告，**不要开 public issue**：

1. 打开本仓库的 **Security** 标签
2. 点击 **Report a vulnerability**
3. 写清：复现步骤、实际影响、可选的修复方向

## 响应时间 / Response

- 3 个工作日内确认收到
- 14 天内给出结论或修复计划
- 修复完成后，如你同意，会在 Security advisories 中公开说明

## 致谢 / Credits

有效的报告会在征得报告者同意后致谢。
