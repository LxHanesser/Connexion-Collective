// 构建期把「文章索引」注入全局数据，供文章页上下篇导航显示日期与「第 N / M 篇」。
// 只提取 slug / title / date，不复制正文；每篇约 80 字节。
// 用法：客户端按 slug 匹配（中英文 permalink 的最后一段相同）。
const fs = require('node:fs');
const path = require('node:path');

function readFrontMatter(file) {
  const text = fs.readFileSync(file, 'utf8');
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  const data = {};
  for (const line of match[1].split(/\r?\n/)) {
    const entry = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (!entry) continue;
    data[entry[1]] = entry[2].replace(/^["']|["']$/g, '').trim();
  }
  return data;
}

module.exports = function blogPostIndexPlugin(context) {
  return {
    name: 'blog-post-index',
    async loadContent() {
      const dir = path.join(context.siteDir, 'blog');
      if (!fs.existsSync(dir)) return {posts: []};

      const posts = fs
        .readdirSync(dir)
        .filter((file) => file.endsWith('.md'))
        .map((file) => {
          const data = readFrontMatter(path.join(dir, file));
          const slug = data.slug || file.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/\.md$/, '');
          return {
            slug,
            title: data.title || slug,
            date: (data.date || '').slice(0, 10),
          };
        })
        // 与博客列表一致：新文章在前
        .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

      return {posts};
    },
    async contentLoaded({content, actions}) {
      actions.setGlobalData(content);
    },
  };
};
