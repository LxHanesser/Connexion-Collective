// 阅读进度条 + 回到顶部按钮。
//
// 纯浏览器端实现：不新增依赖、不发网络请求、不引入外部脚本。
// 只在存在 <article> 的页面（文档、博客正文）显示进度条，其余页面自动隐藏。

import ExecutionEnvironment from '@docusaurus/ExecutionEnvironment';

const STYLE_ID = 'site-progress-style';
const BAR_ID = 'site-reading-progress';
const TOP_ID = 'site-back-to-top';
const SHOW_TOP_AFTER_PX = 600;

const STYLES = `
#${BAR_ID} {
  position: fixed;
  top: 0;
  left: 0;
  height: 3px;
  width: 0;
  z-index: 2000;
  background: linear-gradient(90deg, var(--ifm-color-primary), #25c2a0);
  transition: width 80ms linear;
  pointer-events: none;
}
#${BAR_ID}[hidden] { display: none; }

#${TOP_ID} {
  position: fixed;
  right: 1.25rem;
  bottom: 1.5rem;
  z-index: 1900;
  width: 2.75rem;
  height: 2.75rem;
  padding: 0;
  border-radius: 50%;
  border: 1px solid var(--ifm-color-emphasis-300);
  background: var(--ifm-background-surface-color);
  color: var(--ifm-font-color-base);
  font-size: 1.05rem;
  line-height: 1;
  cursor: pointer;
  display: none;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.12);
}
#${TOP_ID}[data-visible='true'] { display: flex; }
#${TOP_ID}:hover {
  border-color: var(--ifm-color-primary);
  color: var(--ifm-color-primary);
}
#${TOP_ID}:focus-visible {
  outline: 2px solid var(--ifm-color-primary);
  outline-offset: 2px;
}

@media print {
  #${BAR_ID}, #${TOP_ID} { display: none !important; }
}
`;

let bound = false;

function ensureStyle() {
  if (document.getElementById(STYLE_ID)) {
    return;
  }
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = STYLES;
  document.head.appendChild(style);
}

function ensureBar() {
  let bar = document.getElementById(BAR_ID);
  if (!bar) {
    bar = document.createElement('div');
    bar.id = BAR_ID;
    bar.setAttribute('role', 'progressbar');
    bar.setAttribute('aria-hidden', 'true');
    document.body.appendChild(bar);
  }
  return bar;
}

function ensureTopButton() {
  let button = document.getElementById(TOP_ID);
  if (!button) {
    button = document.createElement('button');
    button.id = TOP_ID;
    button.type = 'button';
    button.setAttribute('aria-label', '回到顶部');
    button.textContent = '↑';
    button.addEventListener('click', () => {
      window.scrollTo({top: 0, behavior: 'smooth'});
    });
    document.body.appendChild(button);
  }
  return button;
}

function computeProgress(article) {
  const rect = article.getBoundingClientRect();
  const articleTop = rect.top + window.scrollY;
  const scrollable = Math.max(rect.height - window.innerHeight, 1);
  const scrolled = window.scrollY - articleTop;
  return Math.min(1, Math.max(0, scrolled / scrollable));
}

// 只在「正文页」显示进度条：
// - 文档页：article 里有 .theme-doc-markdown
// - 博客详情页：article 的 header 里有 h1（列表页的卡片用 h2，会被排除）
function findContentArticle() {
  const articles = Array.from(document.querySelectorAll('article'));
  return (
    articles.find(
      (article) =>
        article.querySelector('.theme-doc-markdown') ||
        article.querySelector('header h1'),
    ) ?? null
  );
}

function update() {
  const bar = ensureBar();
  const topButton = ensureTopButton();
  const article = findContentArticle();

  if (article) {
    const progress = computeProgress(article);
    bar.hidden = false;
    bar.style.width = `${(progress * 100).toFixed(2)}%`;
    bar.setAttribute('aria-valuenow', String(Math.round(progress * 100)));
  } else {
    bar.hidden = true;
  }

  topButton.dataset.visible = String(window.scrollY > SHOW_TOP_AFTER_PX);
}

function bind() {
  if (bound) {
    return;
  }
  bound = true;
  let ticking = false;
  const schedule = () => {
    if (ticking) {
      return;
    }
    ticking = true;
    window.requestAnimationFrame(() => {
      ticking = false;
      update();
    });
  };
  window.addEventListener('scroll', schedule, {passive: true});
  window.addEventListener('resize', schedule, {passive: true});
}

export function onRouteDidUpdate() {
  if (!ExecutionEnvironment.canUseDOM) {
    return;
  }
  ensureStyle();
  bind();
  update();
}
