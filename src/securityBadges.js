// 页脚徽章：安全评级 + 托管供应商。
// 纯 HTML + CSS，唯一的外部资源是同源 SVG（static/img/cloudflare-cloud.svg），
// 不产生任何第三方请求，CSP 无需改动。

const LINKS = {
  ssllabs: 'https://www.ssllabs.com/ssltest/analyze.html?d=connexioncollective.com',
  headers: 'https://securityheaders.com/?q=connexioncollective.com&followRedirects=on',
  hsts: 'https://hstspreload.org/?domain=connexioncollective.com',
  dnssec: 'https://dnssec-analyzer.verisignlabs.com/connexioncollective.com',
  host: 'https://www.cloudflare.com/',
};

const COPY = {
  zh: {
    ssllabs: 'Qualys SSL Labs 的 TLS 评级，点击查看实时报告',
    headers: 'securityheaders.com 的响应头评级，点击查看实时报告',
    hsts: 'HSTS 已启用：查看是否已进入浏览器预加载列表',
    dnssec: 'DNSSEC 已启用：在 Verisign 的分析器里验证签名链',
    host: '本站托管在 Cloudflare Pages',
  },
  en: {
    ssllabs: 'TLS grade from Qualys SSL Labs — open the live report',
    headers: 'Response-header grade from securityheaders.com — open the live report',
    hsts: 'HSTS is enabled — check whether it is on the browser preload list',
    dnssec: 'DNSSEC is enabled — verify the chain at Verisign’s analyser',
    host: 'This site is hosted on Cloudflare Pages',
  },
};

const BADGES = [
  {key: 'ssllabs', label: 'SSL Labs', value: 'A+'},
  {key: 'headers', label: 'Headers', value: 'A'},
  {key: 'hsts', label: 'HSTS', value: '✓'},
  {key: 'dnssec', label: 'DNSSEC', value: '✓'},
  {
    key: 'host',
    label: 'Hosted on',
    value: 'Cloudflare',
    icon: '/img/cloudflare-cloud.svg',
    modifier: 'footer-badge--host',
  },
];

export function securityBadgesHtml(isEnglish) {
  const copy = isEnglish ? COPY.en : COPY.zh;

  const items = BADGES.map((badge) => {
    const className = badge.modifier ? `footer-badge ${badge.modifier}` : 'footer-badge';
    const icon = badge.icon
      ? `<img class="footer-badge__icon" src="${badge.icon}" alt="" width="26" height="12" loading="lazy" decoding="async">`
      : '';
    return (
      `<a class="${className}" href="${LINKS[badge.key]}" target="_blank" rel="noopener noreferrer" title="${copy[badge.key]}">` +
      icon +
      `<span class="footer-badge__label">${badge.label}</span>` +
      `<span class="footer-badge__value">${badge.value}</span>` +
      `</a>`
    );
  }).join('');

  return `<div class="footer-badges">${items}</div>`;
}
