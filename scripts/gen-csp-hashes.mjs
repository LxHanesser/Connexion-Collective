#!/usr/bin/env node
/**
 * 构建后处理：把内联脚本的 sha256 哈希注入 CSP，去掉 script-src 的 'unsafe-inline'。
 *
 * ⚠️ 当前**未接入** `npm run build`，默认不执行。原因（2026-10-25 实测）：
 *    Cloudflare 会在边缘往 HTML 里注入一段内联脚本：
 *        window.__CF$cv$params={r:'<随机 ray>',t:'<随机时间戳>'}
 *    内容每次请求都变，无法预先算哈希。开启哈希后它会变成 `script-src-elem` 违规，
 *    而那是 Cloudflare 挑战平台的初始化参数 —— 拦掉可能让真实访客卡在挑战流程里。
 *    可用性优先，所以默认保留 'unsafe-inline'。
 *
 * 何时可以启用：
 *    - 关闭该 zone 的 Bot Fight Mode / 托管挑战后（边缘不再注入内联脚本）；
 *    - 或改用 Cloudflare 不注入脚本的部署方式。
 *    启用方式：CSP_HASHES=1 npm run build，并把本脚本接回 build 脚本。
 *
 * 为什么只需 4 个哈希：全站 192 个内联 <script> 中，112 个是 JSON-LD 数据块
 * （不执行，CSP 不管），真正执行的 80 个内容只有 4 种（主题初始化 ×2、base-URL 横幅 ×2）。
 *
 * 安全降级策略：扫描不到内联脚本、或找不到 script-src 时**保持原样不动**。
 *
 * 用法：node scripts/gen-csp-hashes.mjs [buildDir]
 */

import {createHash} from 'node:crypto';
import {readFile, readdir, writeFile} from 'node:fs/promises';
import {join, extname} from 'node:path';

const BUILD_DIR = process.argv[2] || 'build';
const HEADERS_FILE = join(BUILD_DIR, '_headers');

// 非 JavaScript 的数据块不执行，CSP 不管它们
const NON_EXECUTABLE_TYPES = /application\/(ld\+json|json)|text\/(template|plain)|importmap/i;

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, {withFileTypes: true})) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else if (extname(entry.name).toLowerCase() === '.html') out.push(full);
  }
  return out;
}

/** 抽出可执行的内联脚本正文 */
function extractInlineScripts(html) {
  const bodies = [];
  const re = /<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const attrs = m[1] || '';
    const body = m[2] || '';
    if (NON_EXECUTABLE_TYPES.test(attrs)) continue;
    if (body.trim() === '') continue;
    bodies.push(body);
  }
  return bodies;
}

function hashScript(body) {
  const digest = createHash('sha256').update(body, 'utf8').digest('base64');
  return `'sha256-${digest}'`;
}

/** 只改 script-src 指令，其它指令原样保留 */
function rewriteCsp(value, hashes) {
  const directives = value.split(';').map((d) => d.trim()).filter(Boolean);
  let changed = false;
  const next = directives.map((directive) => {
    const [name, ...tokens] = directive.split(/\s+/);
    if (name !== 'script-src') return directive;
    changed = true;
    const kept = tokens.filter((t) => t !== "'unsafe-inline'");
    if (!kept.includes("'self'")) kept.unshift("'self'");
    return [name, ...kept, ...hashes].join(' ');
  });
  return {value: next.join('; '), changed};
}

async function main() {
  if (process.env.CSP_HASHES !== '1') {
    console.log('跳过 CSP 哈希注入（需显式设置 CSP_HASHES=1）——原因见文件头注释');
    return;
  }
  let headers;
  try {
    headers = await readFile(HEADERS_FILE, 'utf8');
  } catch {
    console.error(`✗ 找不到 ${HEADERS_FILE}（先跑 npm run build 里的 docusaurus build）`);
    process.exit(1);
  }

  const files = await walk(BUILD_DIR);
  const hashes = new Set();
  for (const file of files) {
    const html = await readFile(file, 'utf8');
    for (const body of extractInlineScripts(html)) hashes.add(hashScript(body));
  }

  if (hashes.size === 0) {
    console.warn('⚠ 没扫描到任何内联脚本，保持原策略不动（仍含 unsafe-inline）');
    return;
  }

  const lines = headers.split(/\r?\n/);
  let touched = false;
  const output = lines.map((line) => {
    if (!/^\s*Content-Security-Policy:/i.test(line)) return line;
    const prefix = line.slice(0, line.indexOf(':') + 1);
    const value = line.slice(line.indexOf(':') + 1).trim();
    const {value: rewritten, changed} = rewriteCsp(value, [...hashes].sort());
    if (!changed) return line;
    touched = true;
    return `${prefix} ${rewritten}`;
  });

  if (!touched) {
    console.warn('⚠ CSP 里没找到 script-src，未做修改');
    return;
  }

  await writeFile(HEADERS_FILE, output.join('\n'), 'utf8');
  console.log(`✓ CSP 已注入 ${hashes.size} 个内联脚本哈希（去掉 'unsafe-inline'）`);
  for (const h of [...hashes].sort()) console.log('  ' + h.slice(0, 30) + '…');
}

main().catch((error) => {
  console.error('✗ 生成 CSP 哈希失败，保留原策略：' + (error?.message ?? error));
  process.exit(1);
});
