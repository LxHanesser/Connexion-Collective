// 图片灯箱：点击正文里的图片，全屏放大查看。
//
// 纯浏览器端实现，不引入任何第三方库；图片地址直接取页面上已有的 <img>，
// 不发额外请求、不做 HTML 拼接（标题用 textContent 写入，避免注入）。

import ExecutionEnvironment from '@docusaurus/ExecutionEnvironment';

const OVERLAY_ID = 'site-image-lightbox';
const STYLE_ID = 'site-image-lightbox-style';
const MIN_TRIGGER_SIZE = 120; // 太小的图标不触发

const STYLES = `
#${OVERLAY_ID} {
  position: fixed;
  inset: 0;
  z-index: 3000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem 1rem;
  background: rgba(9, 14, 18, 0.88);
  -webkit-backdrop-filter: blur(4px);
  backdrop-filter: blur(4px);
  animation: site-lightbox-fade 160ms ease-out;
}
#${OVERLAY_ID} .site-lightbox__figure {
  margin: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  max-width: min(1100px, 100%);
  max-height: 100%;
}
#${OVERLAY_ID} .site-lightbox__image {
  max-width: 100%;
  max-height: 78vh;
  object-fit: contain;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
}
#${OVERLAY_ID} .site-lightbox__caption {
  margin: 0;
  color: #cfd8d3;
  font-size: 0.9rem;
  text-align: center;
}
#${OVERLAY_ID} .site-lightbox__close {
  position: absolute;
  top: 1rem;
  right: 1rem;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.3);
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
  font-size: 1.5rem;
  line-height: 1;
  cursor: pointer;
}
#${OVERLAY_ID} .site-lightbox__close:hover {
  background: rgba(255, 255, 255, 0.22);
}
@keyframes site-lightbox-fade {
  from { opacity: 0; }
  to { opacity: 1; }
}
@media (max-width: 768px) {
  #${OVERLAY_ID} { padding: 1rem 0.75rem; }
  #${OVERLAY_ID} .site-lightbox__image { max-height: 70vh; }
}
@media (prefers-reduced-motion: reduce) {
  #${OVERLAY_ID} { animation: none; }
}
`;

let listenersBound = false;
let lastFocusedElement = null;
let currentKeyHandler = null;

function ensureStyle() {
  if (document.getElementById(STYLE_ID)) {
    return;
  }
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = STYLES;
  document.head.appendChild(style);
}

function close() {
  const overlay = document.getElementById(OVERLAY_ID);
  if (!overlay) {
    return;
  }
  overlay.remove();
  document.body.style.overflow = '';
  if (currentKeyHandler) {
    document.removeEventListener('keydown', currentKeyHandler);
    currentKeyHandler = null;
  }
  if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
    lastFocusedElement.focus();
  }
  lastFocusedElement = null;
}

function open(src, alt) {
  if (!src || document.getElementById(OVERLAY_ID)) {
    return;
  }
  ensureStyle();
  lastFocusedElement = document.activeElement;

  const overlay = document.createElement('div');
  overlay.id = OVERLAY_ID;
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', alt ? `图片预览：${alt}` : '图片预览');

  const figure = document.createElement('figure');
  figure.className = 'site-lightbox__figure';

  const image = document.createElement('img');
  image.className = 'site-lightbox__image';
  image.src = src;
  image.alt = alt || '';
  image.decoding = 'async';
  figure.appendChild(image);

  if (alt) {
    const caption = document.createElement('figcaption');
    caption.className = 'site-lightbox__caption';
    caption.textContent = alt;
    figure.appendChild(caption);
  }

  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.className = 'site-lightbox__close';
  closeButton.setAttribute('aria-label', '关闭图片预览');
  closeButton.textContent = '×';

  overlay.appendChild(figure);
  overlay.appendChild(closeButton);

  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) {
      close();
    }
  });
  closeButton.addEventListener('click', close);

  const onKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      return;
    }
    // 焦点留在弹层里，Tab 不会跑到背后的页面
    if (event.key === 'Tab') {
      event.preventDefault();
      closeButton.focus();
    }
  };
  document.addEventListener('keydown', onKeyDown);
  currentKeyHandler = onKeyDown;

  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';
  closeButton.focus();
}

function handleClick(event) {
  const target = event.target;
  if (!(target instanceof HTMLImageElement)) {
    return;
  }
  if (target.closest(`#${OVERLAY_ID}`)) {
    return;
  }
  // 图片外面包着链接时，保留链接原本的行为
  if (target.closest('a')) {
    return;
  }
  const article = target.closest('article');
  if (!article || !article.contains(target)) {
    return;
  }
  if (target.naturalWidth < MIN_TRIGGER_SIZE || target.naturalHeight < MIN_TRIGGER_SIZE) {
    return;
  }
  event.preventDefault();
  open(target.currentSrc || target.src, target.alt);
}

function bind() {
  if (listenersBound) {
    return;
  }
  listenersBound = true;
  document.addEventListener('click', handleClick);
}

export function onRouteDidUpdate() {
  if (!ExecutionEnvironment.canUseDOM) {
    return;
  }
  ensureStyle();
  bind();
  // 站内跳转时收起可能还开着的预览
  if (document.getElementById(OVERLAY_ID)) {
    close();
  }
}
