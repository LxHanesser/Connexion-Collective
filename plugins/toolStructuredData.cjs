// 给工具页注入 WebApplication 结构化数据（构建后处理）。
//
// 为什么不在 18 个工具页里逐个写：它们都用同一个 Layout，标题与描述已经渲染进 HTML，
// 这里直接复用页面自身的 <title> 与 meta description，天然跟随中英文切换，
// 以后新增工具也不需要再改代码。
//
// 安全：数据全部来自本站构建产物，不含任何外部输入；JSON 里的 < 会被转义成 \u003c，
// 不可能闭合 <script> 标签。脚本类型是 application/ld+json，不会被浏览器执行。
const fs = require('node:fs');
const path = require('node:path');

const SITE = 'https://connexioncollective.com';
const TITLE_SUFFIX = ' | Connexion Collective';
const MARKER = '"@type":"WebApplication"';

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

// 提取 meta description：属性可能有引号也可能没有（React 会省略安全值的引号），
// 属性顺序也不固定，所以先找出所有 meta 标签，再逐个判断。
function extractDescription(html) {
  for (const tag of html.match(/<meta[^>]*>/gi) || []) {
    if (!/name=["']?description/i.test(tag)) continue;
    const quoted = tag.match(/content="([^"]*)"/i);
    if (quoted) return quoted[1];
    const single = tag.match(/content='([^']*)'/i);
    if (single) return single[1];
    const bare = tag.match(/content=([^\s>]+)/i);
    if (bare) return bare[1];
  }
  return null;
}

module.exports = function toolStructuredDataPlugin() {
  return {
    name: 'tool-structured-data',
    async postBuild({outDir, baseUrl}) {
      // postBuild 按语言各调用一次，outDir 就是该语言的输出目录（build / build/en），
      // 所以语言要从 baseUrl 判断，不能看文件相对路径。
      const isEn = /^\/en(\/|$)/.test(baseUrl || '/');
      let injected = 0;
      let skipped = 0;

      for (const file of walk(outDir)) {
        if (!file.endsWith('.html')) continue;

        const rel = path.relative(outDir, file).split(path.sep).join('/');
        // 只处理 /tools/<slug>/（含英文 /en/tools/<slug>/），跳过列表页
        const matched = rel.match(/^tools\/([a-z0-9-]+)\/index\.html$/);
        if (!matched) continue;

        const slug = matched[1];
        const html = fs.readFileSync(file, 'utf8');

        if (html.includes(MARKER)) {
          skipped += 1;
          continue;
        }

        const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/);
        const title = titleMatch ? titleMatch[1] : null;
        if (!title) continue;

        const description = extractDescription(html);

        const data = {
          '@context': 'https://schema.org',
          '@type': 'WebApplication',
          name: title.replace(TITLE_SUFFIX, '').trim(),
          url: `${SITE}${isEn ? '/en' : ''}/tools/${slug}`,
          applicationCategory: 'UtilitiesApplication',
          operatingSystem: 'Any',
          browserRequirements: 'Requires JavaScript',
          isAccessibleForFree: true,
          offers: {'@type': 'Offer', price: '0', priceCurrency: 'CNY'},
          inLanguage: isEn ? 'en' : 'zh-Hans',
          ...(description ? {description} : {}),
        };

        const json = JSON.stringify(data).replace(/</g, '\\u003c');
        fs.writeFileSync(
          file,
          html.replace('</head>', `<script type="application/ld+json">${json}</script></head>`),
        );
        injected += 1;
      }

      console.log(
        `[tool-structured-data] 注入 WebApplication 结构化数据：${injected} 页（跳过 ${skipped}）`,
      );
    },
  };
};
