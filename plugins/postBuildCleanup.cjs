// 构建后清理：去掉 HTML 里的框架版本指纹。
//
// 只在构建完成后修改 build/ 里的静态文件，不引入服务端代码、不影响运行时；
// 重复执行是幂等的（内容已经干净时不会改动文件）。
//
// 注：sitemap 排除 404 由 docusaurus.config.js 的 sitemap.ignorePatterns 处理 ——
// 这个钩子运行时机早于 sitemap 生成，不适合做那件事。
const fs = require('node:fs');
const path = require('node:path');

// 形如 <meta name=generator content="Docusaurus v3.10.2">
// 属性可能带引号也可能不带，因此都兼容。
const GENERATOR_META = /<meta\s+name=["']?generator["']?[^>]*>[ \t]*/gi;

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

module.exports = function postBuildCleanupPlugin(context) {
  return {
    name: 'post-build-cleanup',
    async postBuild({outDir}) {
      let pagesTouched = 0;
      let metasRemoved = 0;

      // 站点目录的两种形态：JSON 转义过（Windows 反斜杠会变成 \\）与原始路径
      const siteDir = context?.siteDir ?? '';
      const siteDirEscaped = siteDir ? JSON.stringify(siteDir).slice(1, -1) : '';

      let scrubbed = 0;

      for (const file of walk(outDir)) {
        if (!/\.(html|js|json)$/.test(file)) continue;
        const before = fs.readFileSync(file, 'utf8');
        let after = before;

        const found = after.match(GENERATOR_META);
        if (found) {
          after = after.replace(GENERATOR_META, '');
          pagesTouched += 1;
          metasRemoved += found.length;
        }

        // 本机绝对路径（形如 D:\path\to\site）会随 siteConfig 被打进产物，
        // 属于「最小暴露」不允许的信息，统一替换为中性前缀。
        if (siteDir) {
          const beforeLen = after.length;
          if (siteDirEscaped) after = after.split(siteDirEscaped).join('/site');
          after = after.split(siteDir).join('/site');
          if (after.length !== beforeLen) scrubbed += 1;
        }

        if (after !== before) fs.writeFileSync(file, after);
      }

      console.log(
        `[post-build-cleanup] 移除 generator meta：${metasRemoved} 处 / ${pagesTouched} 个页面`,
      );
    },
  };
};
