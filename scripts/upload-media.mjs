#!/usr/bin/env node
/**
 * 把 media-src/ 下的静态媒体按内容哈希上传到 Cloudflare R2。
 *
 * 设计要点：
 * - 文件名带 sha256 前 12 位 → 内容变则 URL 变，可安全上一年 immutable 缓存
 * - 零依赖：只调 `npx wrangler r2 object put`
 * - 默认 dry-run 之外才联网；缺凭证时会有明确报错，不会静默写本地 miniflare
 *
 * 用法：
 *   node scripts/upload-media.mjs --dry-run
 *   node scripts/upload-media.mjs
 *   node scripts/upload-media.mjs --src media-src --no-remote   # 桶名取自 R2_BUCKET
 */

import {createHash} from 'node:crypto';
import {existsSync} from 'node:fs';
import {readFile, readdir, stat, writeFile} from 'node:fs/promises';
import {basename, dirname, extname, join, relative, sep} from 'node:path';
import {spawnSync} from 'node:child_process';

const CONTENT_TYPES = {
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.pdf': 'application/pdf',
};

const CACHE_CONTROL = 'public, max-age=31536000, immutable';
const SOFT_LIMIT_BYTES = 5 * 1024 * 1024; // 超过就提醒压缩

const HELP = `
把 media-src/ 下的媒体上传到 R2（内容寻址 + 一年缓存）

  --src <dir>        媒体源目录（默认 media-src）
  --bucket <name>    R2 桶名（默认读环境变量 R2_BUCKET）
  --base-url <url>   公开访问前缀（默认 https://cdn.connexioncollective.com/）
  --prefix <path>    R2 key 前缀（默认 media）
  --dry-run          只打印计划，不联网
  --no-remote        不传 --remote（仅当 wrangler 版本不认该参数时使用）
  -h, --help         显示本帮助

凭证：先执行 npx wrangler login，或设置 CLOUDFLARE_API_TOKEN
（Account 级，权限只要 Workers R2 Storage: Edit，范围限本桶）。
`;

function parseArgs(argv) {
  const opts = {
    src: 'media-src',
    bucket: process.env.R2_BUCKET || '',
    baseUrl: 'https://cdn.connexioncollective.com/',
    prefix: 'media',
    dryRun: false,
    remote: true,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = () => {
      const value = argv[i + 1];
      if (value === undefined) throw new Error(`参数 ${arg} 缺少取值`);
      i += 1;
      return value;
    };
    switch (arg) {
      case '--src': opts.src = next(); break;
      case '--bucket': opts.bucket = next(); break;
      case '--base-url': opts.baseUrl = next(); break;
      case '--prefix': opts.prefix = next(); break;
      case '--dry-run': opts.dryRun = true; break;
      case '--no-remote': opts.remote = false; break;
      case '-h':
      case '--help': console.log(HELP.trim()); process.exit(0); break;
      default: throw new Error(`未知参数: ${arg}（用 --help 查看用法）`);
    }
  }
  if (!opts.baseUrl.endsWith('/')) opts.baseUrl += '/';
  opts.prefix = opts.prefix.replace(/^\/+|\/+$/g, '');
  return opts;
}

async function walk(dir) {
  const found = [];
  for (const entry of await readdir(dir, {withFileTypes: true})) {
    if (entry.name.startsWith('.')) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...(await walk(full)));
    else if (entry.isFile()) found.push(full);
  }
  return found;
}

function toPosix(p) {
  return p.split(sep).join('/');
}

function quote(value) {
  const text = String(value);
  if (process.platform !== 'win32') return `'${text.replace(/'/g, `'\\''`)}'`;
  return `"${text.replace(/"/g, '""')}"`;
}

function humanSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

// 优先用项目内安装的 wrangler；否则走 npm exec。
// 注意：不能用 npx —— 在 `npm run` 上下文里 Windows 的 npx 垫片会解析到
// 一个不存在的 npm 内部路径（node_modules/npm/bin/npx-cli.js）而直接报错。
function wranglerRunner() {
  const bin = join(
    process.cwd(),
    'node_modules',
    '.bin',
    process.platform === 'win32' ? 'wrangler.cmd' : 'wrangler',
  );
  if (existsSync(bin)) return quote(bin);
  return 'npm exec --yes -- wrangler@4.153.0';
}

async function main() {
  let opts;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(`✗ ${error.message}`);
    process.exit(2);
  }

  const srcDir = join(process.cwd(), opts.src);
  try {
    const info = await stat(srcDir);
    if (!info.isDirectory()) throw new Error('不是目录');
  } catch {
    console.error(`✗ 源目录不存在：${opts.src}`);
    console.error('  先创建并把待上传的媒体放进去，例如 media-src/blog/2026/hero.webp');
    console.error('  该目录已在 .gitignore 中，不会入库。');
    process.exit(2);
  }

  const allFiles = await walk(srcDir);
  const media = allFiles.filter((file) => CONTENT_TYPES[extname(file).toLowerCase()]);

  console.log(`源目录: ${toPosix(relative(process.cwd(), srcDir)) || '.'}`);
  if (!opts.bucket) {
    console.error('✗ 没有指定桶名：设置环境变量 R2_BUCKET，或传 --bucket <name>');
    process.exit(1);
  }

  console.log(`桶: ${opts.bucket}   前缀: ${opts.prefix}/   ${opts.dryRun ? '模式: DRY-RUN' : '模式: 上传'}`);

  if (media.length === 0) {
    const skipped = allFiles.length;
    console.log(`\n没有可上传的媒体文件${skipped ? `（跳过 ${skipped} 个不支持的类型）` : ''}。`);
    console.log(`支持的扩展名：${Object.keys(CONTENT_TYPES).join(' ')}`);
    return;
  }

  const plan = [];
  for (const file of media) {
    const buffer = await readFile(file);
    const hash = createHash('sha256').update(buffer).digest('hex').slice(0, 12);
    const relPath = toPosix(relative(srcDir, file));
    const dir = dirname(relPath);
    const ext = extname(relPath).toLowerCase();
    const stem = basename(relPath, extname(relPath));
    const name = `${stem}-${hash}${ext}`;
    const key = [opts.prefix, dir === '.' ? '' : dir, name].filter(Boolean).join('/');
    plan.push({
      source: file,
      relSource: relPath,
      key,
      url: `${opts.baseUrl}${key}`,
      sha256: hash,
      bytes: buffer.length,
      contentType: CONTENT_TYPES[ext],
    });
  }

  const failures = [];
  for (const item of plan) {
    const sizeNote = item.bytes > SOFT_LIMIT_BYTES ? '  ⚠ 超过 5 MB，建议先压缩' : '';
    console.log(`\n· ${item.relSource}  (${humanSize(item.bytes)}, ${item.contentType})${sizeNote}`);
    console.log(`  → ${item.key}`);
    if (opts.dryRun) continue;

    const parts = [
      wranglerRunner(), 'r2', 'object', 'put',
      quote(`${opts.bucket}/${item.key}`),
      '--file', quote(item.source),
      '--content-type', quote(item.contentType),
      '--cache-control', quote(CACHE_CONTROL),
    ];
    if (opts.remote) parts.push('--remote');

    const result = spawnSync(parts.join(' '), {stdio: 'inherit', shell: true});
    if (result.status !== 0) failures.push(item.relSource);
  }

  console.log('\n' + '─'.repeat(64));
  if (opts.dryRun) {
    console.log('DRY-RUN 未上传任何文件。去掉 --dry-run 即执行上传。');
  } else if (failures.length > 0) {
    console.log(`✗ ${failures.length}/${plan.length} 个失败：${failures.join(', ')}`);
    console.log('  常见原因：未登录（npx wrangler login）、token 权限不足、桶名写错。');
  } else {
    console.log(`✓ ${plan.length} 个文件已上传`);
  }

  console.log('\n可直接粘贴的引用：');
  for (const item of plan) console.log(item.url);

  if (!opts.dryRun) {
    const manifestPath = join(srcDir, '.upload-manifest.json');
    await writeFile(
      manifestPath,
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          bucket: opts.bucket,
          baseUrl: opts.baseUrl,
          files: plan.map(({key, url, relSource, bytes, contentType, sha256}) => ({
            key, url, source: relSource, bytes, contentType, sha256,
          })),
        },
        null,
        2,
      ) + '\n',
      'utf8',
    );
    console.log(`\n清单已写入 ${toPosix(relative(process.cwd(), manifestPath))}`);
  }

  if (failures.length > 0) process.exit(1);
}

main().catch((error) => {
  console.error(`✗ 未预期的错误：${error?.stack ?? error}`);
  process.exit(1);
});
