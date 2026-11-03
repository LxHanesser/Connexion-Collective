// 博客文章清单：读取当前语言的 sitemap.xml，过滤出真正的文章页。
// 供「随便看看」按钮（React 组件）和页脚里的 data-random-post 链接共用。
//
// 关键点：本站是双语的，中文站的文章在 /blog/*，英文站在 /en/blog/*，
// 且 /sitemap.xml 与 /en/sitemap.xml 各自只列本语言的页面。
// 所以必须按当前路径前缀取对应的 sitemap 并做同样的过滤，否则在英文站
// 会随机跳到中文文章。

const EXCLUDED_PATH_PATTERNS = [
  /^\/blog\/?$/,
  /^\/blog\/(archive|authors|tags)(\/|$)/,
];

/** 当前页面所属的语言前缀：英文站返回 '/en'，中文站返回 '' */
function localePrefix() {
  if (typeof window === 'undefined') {
    return '';
  }
  const {pathname} = window.location;
  return pathname === '/en' || pathname.startsWith('/en/') ? '/en' : '';
}

// 按语言分别缓存，避免在两种语言之间切换时拿到上一次的结果
let cache = {prefix: null, posts: null};

export async function loadBlogPosts() {
  const prefix = localePrefix();

  if (cache.posts && cache.prefix === prefix) {
    return cache.posts;
  }

  const response = await fetch(`${prefix}/sitemap.xml`, {credentials: 'omit'});
  if (!response.ok) {
    throw new Error(`无法读取 sitemap: ${response.status}`);
  }

  const xml = await response.text();
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  const posts = Array.from(doc.querySelectorAll('loc'))
    .map((node) => node.textContent?.trim() ?? '')
    .filter(Boolean)
    .map((url) => {
      try {
        return new URL(url);
      } catch {
        return null;
      }
    })
    .filter((url) => url !== null)
    .filter((url) => url.pathname.startsWith(`${prefix}/blog/`))
    .filter((url) => {
      // 排除列表、归档、作者、标签等非文章页（比较时去掉语言前缀）
      const localPath = prefix ? url.pathname.slice(prefix.length) : url.pathname;
      return !EXCLUDED_PATH_PATTERNS.some((pattern) => pattern.test(localPath));
    })
    .map((url) => url.pathname);

  const uniquePosts = [...new Set(posts)];
  cache = {prefix, posts: uniquePosts};
  return uniquePosts;
}

export async function pickRandomBlogPost() {
  const posts = await loadBlogPosts();
  if (posts.length === 0) {
    return null;
  }
  return posts[Math.floor(Math.random() * posts.length)];
}
