const fs = require('node:fs');
const path = require('node:path');

/**
 * 构建后处理：
 * 1) 每个页面注入「记住语言选择」的点击监听（内联，先于水合，最快生效）
 * 2) 仅中文首页额外注入「按浏览器语言跳转」脚本
 *
 * 为什么不用 IP 地理位置：国内用户常走代理，出口 IP 在境外，
 * 按国家判断会把最需要中文的人送去英文站。浏览器语言更可靠。
 *
 * 为什么用内联脚本而不是客户端模块：模块要等 bundle 加载与执行，
 * 慢网络下用户可能先点击语言切换，导致偏好没被记住。
 *
 * 跳转脚本必须放在 <head> 最前面：放在末尾时样式与 JS 已经开始下载，
 * location.replace 会取消这些在途请求，控制台出现 1–2 条
 * "net::ERR_ABORTED"（只在首次访问、网络较慢时出现）。
 *
 * 安全说明：
 * - 只读取 localStorage 与 navigator.languages，不拼接 URL 参数
 * - 跳转目标写死为 "/en/"，不存在开放重定向
 * - 全程 try/catch，localStorage 不可用时静默降级为「不记忆」，不影响浏览
 * - hreflang 由 Docusaurus 的 i18n 支持自动生成
 */

const PREF_MARK = 'data-i18n-pref';
const REDIRECT_MARK = 'data-i18n-redirect';

const PREF_SCRIPT =
  `<script ${PREF_MARK}>(function(){try{document.addEventListener("click",function(e){` +
  `var t=e.target;if(!t||!t.closest)return;var a=t.closest("a[href]");if(!a)return;` +
  `try{var u=new URL(a.href,location.origin);if(u.origin!==location.origin)return;` +
  `var norm=function(p){var s=p.replace(/^\\/en(?=\\/|$)/,"");return s===""?"/":s};` +
  `if(norm(location.pathname)!==norm(u.pathname))return;` +
  `var isEn=function(p){return p==="/en/"||p==="/en"||p.indexOf("/en/")===0};` +
  `var next=isEn(u.pathname),here=isEn(location.pathname);` +
  `if(next!==here)localStorage.setItem("lang",next?"en":"zh")}catch(x){}},true)}catch(e){}})();</script>`;

const REDIRECT_SCRIPT =
  `<script ${REDIRECT_MARK}>(function(){try{` +
  `var p=localStorage.getItem("lang");` +
  `if(p==="zh")return;` +
  `if(p==="en"){location.replace("/en/");return;}` +
  `if(location.search.indexOf("nolang")>-1)return;` +
  `var l=navigator.languages||[navigator.language||""];` +
  `for(var i=0;i<l.length;i++){if(/^zh/i.test(l[i]))return;}` +
  `location.replace("/en/");` +
  `}catch(e){}})();</script>`;

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}

module.exports = function languageRedirectPlugin() {
  return {
    name: 'language-redirect',
    async postBuild({outDir}) {
      const rootIndex = path.join(outDir, 'index.html');
      let pages = 0;
      let redirects = 0;

      for (const file of walk(outDir)) {
        let html = fs.readFileSync(file, 'utf8');

        if (!html.includes(PREF_MARK)) {
          html = html.replace('</head>', `${PREF_SCRIPT}</head>`);
        }

        // 只在中文首页注入：英文首页若也注入，p === "en" 会自我重定向成死循环。
        // 判断用 <html lang>，不能搜 "lang=zh-Hans"（英文页的语言切换链接也带这个属性）。
        const isZhDocument = /<html[^>]*lang=["']?zh-Hans/i.test(html);
        if (file === rootIndex && isZhDocument && !html.includes(REDIRECT_MARK)) {
          // 紧跟 charset 之后注入，早于任何样式/脚本标签
          const charsetMeta = html.match(/<meta[^>]*charset[^>]*>/i);
          if (charsetMeta) {
            html = html.replace(charsetMeta[0], `${charsetMeta[0]}${REDIRECT_SCRIPT}`);
          } else {
            html = html.replace(/<head[^>]*>/i, (tag) => `${tag}${REDIRECT_SCRIPT}`);
          }
          redirects++;
        }

        fs.writeFileSync(file, html, 'utf8');
        pages++;
      }

      console.log(`[language-redirect] 页面 ${pages} 个，首页跳转 ${redirects} 处`);
    },
  };
};
