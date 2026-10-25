import React, {useCallback, useState} from 'react';

// 随机打开一篇博客。
// 实现方式：读取本站自己的 sitemap.xml（同源、静态文件、无第三方服务），
// 过滤出文章页后随机跳转。sitemap 只在第一次点击时加载一次，结果缓存在内存里。

const SITEMAP_URL = '/sitemap.xml';
const EXCLUDED_PATH_PATTERNS = [
  /^\/blog\/?$/,
  /^\/blog\/(archive|authors|tags)(\/|$)/,
];

let cachedPosts = null;

async function loadPosts() {
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
    .filter((url) => {
      try {
        const {pathname} = new URL(url);
        return (
          pathname.startsWith('/blog/') &&
          !EXCLUDED_PATH_PATTERNS.some((pattern) => pattern.test(pathname))
        );
      } catch {
        return false;
      }
    })
    .map((url) => new URL(url).pathname);

  cachedPosts = posts;
  return posts;
}

export default function RandomPostButton({
  label = '随便看看',
  className = 'button button--secondary',
}) {
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  const handleClick = useCallback(async () => {
    if (pending) {
      return;
    }
    setPending(true);
    setFailed(false);
    try {
      const posts = await loadPosts();
      if (posts.length === 0) {
        setFailed(true);
        return;
      }
      const target = posts[Math.floor(Math.random() * posts.length)];
      window.location.assign(target);
    } catch {
      setFailed(true);
    } finally {
      setPending(false);
    }
  }, [pending]);

  return (
    <button
      type="button"
      className={className}
      onClick={handleClick}
      disabled={pending}
      aria-live="polite">
      {pending ? '挑选中…' : failed ? '读取失败，请重试' : label}
    </button>
  );
}
