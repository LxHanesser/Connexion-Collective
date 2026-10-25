// 让页脚里的 <a data-random-post> 具备「随机打开一篇博客」的行为。
// 链接本身是正常指向 /blog 的，JS 不可用时依然可用。

import ExecutionEnvironment from '@docusaurus/ExecutionEnvironment';
import {pickRandomBlogPost} from '../lib/randomPost';

const SELECTOR = '[data-random-post]';
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
        restore();
      }
    })
    .catch(() => restore());
}

export function onRouteDidUpdate() {
  if (!ExecutionEnvironment.canUseDOM || bound) {
    return;
  }
  bound = true;
  document.addEventListener('click', handleClick);
}
