// 客户端模块：把页脚里构建时写死的「本站已运行 N 天」改成访问当天的真实天数。
//
// 静态站的天数只能在构建那一刻算出来，站点不重建就会一直停在旧值。
// 这里在每次页面渲染完成后（含首次加载和 SPA 内部跳转）重算一次，
// 于是 Cloudflare Pages 上不重新构建也能保持准确。
//
// ⚠️ 只能改「文本节点」，不能给容器赋值 textContent —— 页脚版权区里还嵌着
//    安全徽章（<div class="footer-badges"> 及其子元素）。整段覆盖会把它们
//    连同链接、样式一起销毁，只剩被拍平的纯文字。

import ExecutionEnvironment from '@docusaurus/ExecutionEnvironment';
import {daysSinceLaunch} from '../siteMeta';

const FOOTER_COPYRIGHT_SELECTOR = '.footer__copyright';
// 中英文两套文案都可能出现在页脚，按当前语言匹配对应的一种
const UPTIME_PATTERNS = [
  /(本站已运行\s*)\d+(\s*天)/,
  /(Running\s+)\d+(\s+days?)/i,
];

function findUptimeTextNode(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    if (UPTIME_PATTERNS.some((pattern) => pattern.test(node.nodeValue ?? ''))) {
      return node;
    }
    node = walker.nextNode();
  }
  return null;
}

function syncFooterUptime() {
  if (!ExecutionEnvironment.canUseDOM) {
    return;
  }

  const el = document.querySelector(FOOTER_COPYRIGHT_SELECTOR);
  if (!el) {
    return;
  }

  const node = findUptimeTextNode(el);
  if (!node) {
    return;
  }

  const current = node.nodeValue ?? '';
  const pattern = UPTIME_PATTERNS.find((item) => item.test(current));
  if (!pattern) {
    return;
  }

  const next = current.replace(pattern, `$1${daysSinceLaunch()}$2`);
  if (next !== current) {
    // 只替换这一个小小的文本节点，版权区里的徽章等子元素原样保留
    node.nodeValue = next;
  }
}

export function onRouteDidUpdate() {
  syncFooterUptime();
}

// 首屏水合完成后补一次，防止 onRouteDidUpdate 早于页脚渲染的边界情况
if (ExecutionEnvironment.canUseDOM) {
  queueMicrotask(syncFooterUptime);
}
