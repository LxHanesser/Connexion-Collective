// 客户端模块：把页脚里构建时写死的「本站已运行 N 天」改成访问当天的真实天数。
//
// 静态站的天数只能在构建那一刻算出来，站点不重建就会一直停在旧值。
// 这里在每次页面渲染完成后（含首次加载和 SPA 内部跳转）重算一次，
// 于是 Cloudflare Pages 上不重新构建也能保持准确。

import ExecutionEnvironment from '@docusaurus/ExecutionEnvironment';
import {daysSinceLaunch} from '../siteMeta';

const FOOTER_COPYRIGHT_SELECTOR = '.footer__copyright';
// 中英文两套文案都可能出现在页脚，按当前语言匹配对应的一种
const UPTIME_PATTERNS = [
  /(本站已运行\s*)\d+(\s*天)/,
  /(Running\s+)\d+(\s+days?)/i,
];

function syncFooterUptime() {
  if (!ExecutionEnvironment.canUseDOM) {
    return;
  }

  const el = document.querySelector(FOOTER_COPYRIGHT_SELECTOR);
  if (!el) {
    return;
  }

  const current = el.textContent ?? '';
  const pattern = UPTIME_PATTERNS.find((item) => item.test(current));
  if (!pattern) {
    return;
  }

  const next = current.replace(pattern, `$1${daysSinceLaunch()}$2`);
  if (next !== current) {
    // 页脚版权文本是纯字符串，没有子元素，整段替换是安全的
    el.textContent = next;
  }
}

export function onRouteDidUpdate() {
  syncFooterUptime();
}

// 首屏水合完成后补一次，防止 onRouteDidUpdate 早于页脚渲染的边界情况
if (ExecutionEnvironment.canUseDOM) {
  queueMicrotask(syncFooterUptime);
}
