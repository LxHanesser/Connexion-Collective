// 博客文章清单：读取本站 sitemap.xml，过滤出真正的文章页。
// 供「随便看看」按钮（React 组件）和页脚里的 data-random-post 链接共用。

const SITEMAP_URL = '/sitemap.xml';
const EXCLUDED_PATH_PATTERNS = [
  /^\/blog\/?$/,
  /^\/blog\/(archive|authors|tags)(\/|$)/,
];

let cachedPosts = null;

export async function loadBlogPosts() {
  if (cachedPosts) {
    return cachedPosts;
  }

  const response = await fetch(SITEMAP_URL, {credentials: 'omit'});
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
    .filter(
      (url) =>
        url.pathname.startsWith('/blog/') &&
        !EXCLUDED_PATH_PATTERNS.some((pattern) => pattern.test(url.pathname)),
    )
    .map((url) => url.pathname);

  cachedPosts = posts;
  return posts;
}

export async function pickRandomBlogPost() {
  const posts = await loadBlogPosts();
  if (posts.length === 0) {
    return null;
  }
  return posts[Math.floor(Math.random() * posts.length)];
}
