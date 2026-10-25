// 让页脚里的 <a data-random-post> 具备「随机打开一篇博客」的行为。
// 链接本身指向 /blog/archive，JS 不可用或读取失败时依然是有效跳转，不会「点了没反应」。

import ExecutionEnvironment from '@docusaurus/ExecutionEnvironment';
import {pickRandomBlogPost} from '../lib/randomPost';

const SELECTOR = '[data-random-post]';
const FALLBACK_URL = '/blog/archive';
let bound = false;

function handleClick(event) {
  const target = event.target;
  if (!(target instanceof Element)) {
    return;
  }

  const link = target.closest(SELECTOR);
  if (!link || link.dataset.busy === 'true') {
    return;
  }

  event.preventDefault();
  link.dataset.busy = 'true';
  const originalLabel = link.textContent;
  link.textContent = '挑选中…';

  const restore = () => {
    link.dataset.busy = 'false';
    link.textContent = originalLabel;
  };

  pickRandomBlogPost()
    .then((post) => {
      if (post) {
        window.location.assign(post);
      } else {
        // 读不到文章列表时退到归档页，保证点击一定有反馈
        window.location.assign(FALLBACK_URL);
      }
    })
    .catch(() => {
      window.location.assign(FALLBACK_URL);
      restore();
    });
}

function bind() {
  if (bound) {
    return;
  }
  bound = true;
  document.addEventListener('click', handleClick);
}

// 模块加载即绑定，避免水合完成前点击落回默认链接
if (ExecutionEnvironment.canUseDOM) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind, {once: true});
  } else {
    bind();
  }
}

export function onRouteDidUpdate() {
  if (ExecutionEnvironment.canUseDOM) {
    bind();
  }
}
