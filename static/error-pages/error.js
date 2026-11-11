(() => {
  const code = document.body.dataset.code || "1015";
  const params = new URLSearchParams(location.search);
  const stored = localStorage.getItem("cc-error-lang");
  const browserLang = (navigator.language || "zh").toLowerCase().startsWith("zh") ? "zh" : "en";
  let lang = params.get("lang") === "en" || params.get("lang") === "zh" ? params.get("lang") : stored || browserLang;

  const ERROR = {
    "1015": {
      zh: "你的请求触发了站点的安全或速率限制。通常是短时间内请求过多，或你所在的网络出口与其他用户共享，并不代表你的设备被感染或被永久封禁。",
      en: "Your request hit the site's security or rate limits. This usually means too many requests in a short time, or a shared network exit. It does not mean your device is infected or permanently banned.",
    },
    "1020": {
      zh: "你的请求被站点的安全策略拦截。可能是浏览器环境、网络出口或当前访问方式触发了规则；这通常不是你的账号或设备出了问题。",
      en: "A security rule blocked this request. Your browser environment, network exit, or request pattern may have triggered it. This usually does not mean your account or device is compromised.",
    },
    "5xx": {zh: "", en: ""},
  };

  const UI = {
    zh: {
      noteLabel: "站点说明 / Site note",
      noteTitle: "关于这次访问",
      rateTitle: "等待 60 分钟",
      rateText: "然后刷新页面，很多限流会自动解除。",
      contactPrefix: "如果仍然存在问题，请通过",
      contactLink: "GitHub 联系",
      blockedTitles: ["正常访问", "误报处理"],
      blockedLines: [
        "请以正常行为进行访问。如果你没有试图攻击，请注意搜索或链接中不要包含特定字符或代码串，以免被视为不安全请求。",
        "如果你认为这是一次误报，请及时复制 Ray ID，并携带 Ray ID 联系管理员。",
      ],
      home: "返回首页",
      github: "GitHub 联系",
      copy: "复制 Ray ID",
      copied: "已复制",
      warningTitle: "安全警告",
      warningText:
        "严禁任何未经授权的渗透测试、漏洞扫描、压力测试、拒绝服务攻击、绕过安全控制或干扰本站正常运行的行为。无论出于研究、测试或其他目的，未经授权均被禁止。",
      warningText2:
        "未经授权的访问、攻击或干扰可能违反适用法律。在适用法律允许的范围内，本站保留采取民事法律行动、向有关主管部门举报，并将涉嫌刑事违法的行为报告执法机关的权利。如需进行安全测试，必须事先依据《安全政策》取得明确书面授权。",
      warningLink: "查看安全政策",
      serverLines: [
        "边缘节点暂时无法取得页面。这通常是短时故障或维护，不代表你的请求有问题。稍后刷新通常可以恢复。",
        "如果长时间（超过 24 小时）无法访问且依然出现此错误页面，请联系网站管理员。",
      ],
    },
    en: {
      noteLabel: "Site note",
      noteTitle: "About this error",
      rateTitle: "Wait 60 minutes",
      rateText: "Then reload. Many rate limits clear on their own.",
      contactPrefix: "If the problem persists, contact us via",
      contactLink: "GitHub",
      blockedTitles: ["Browse normally", "False positive"],
      blockedLines: [
        "Please browse normally. If you are not attempting an attack, avoid unusual character sequences or code strings in searches and links, as they may be treated as unsafe requests.",
        "If you believe this is a false positive, copy the Ray ID and contact the administrator with it.",
      ],
      home: "Back to homepage",
      github: "Contact via GitHub",
      copy: "Copy Ray ID",
      copied: "Copied",
      warningTitle: "SECURITY WARNING",
      warningText:
        "Unauthorized penetration testing, vulnerability scanning, stress testing, denial-of-service attacks, attempts to bypass security controls, or interference with the normal operation of this site are strictly prohibited. This applies regardless of the stated purpose, including research or testing.",
      warningText2:
        "Unauthorized access, attacks, or interference may violate applicable law. To the fullest extent permitted by applicable law, the site owner reserves the right to take civil legal action, report the conduct to the competent authorities, and refer suspected criminal offenses to law enforcement. Security testing requires prior express written authorization under the Security Policy.",
      warningLink: "Read the Security Policy",
      serverLines: [
        "The edge could not retrieve this page. This is usually a temporary failure or maintenance issue, not a problem with your request. Reloading shortly often helps.",
        "If the page remains unavailable for more than 24 hours, contact the site administrator.",
      ],
    },
  };

  const one = (selector) => document.querySelector(selector);
  const all = (selector) => document.querySelectorAll(selector);
  const set = (selector, value) => {
    const node = one(selector);
    if (node) node.textContent = value;
  };
  const setAll = (selector, value) => {
    all(selector).forEach((node) => {
      node.textContent = value;
    });
  };

  const render = () => {
    const t = UI[lang];
    document.documentElement.lang = lang === "zh" ? "zh-Hans" : "en";
    set("[data-note-label]", t.noteLabel);
    set("[data-note-title]", t.noteTitle);
    set("[data-note-lead]", ERROR[code][lang]);
    set("[data-rate-title]", t.rateTitle);
    set("[data-rate-text]", t.rateText);
    set("[data-contact-prefix]", t.contactPrefix);
    set("[data-contact-link]", t.contactLink);
    set("[data-home]", t.home);
    setAll("[data-github]", t.github);
    setAll("[data-copy-ray]", t.copy);
    set("[data-warning-title]", t.warningTitle);
    set("[data-warning-text]", t.warningText);
    set("[data-warning-text2]", t.warningText2);
    set("[data-warning-link]", t.warningLink);
    set("[data-blocked-title]", t.blockedTitles[0]);
    set("[data-blocked-title2]", t.blockedTitles[1]);
    set("[data-blocked-line]", t.blockedLines[0]);
    set("[data-blocked-line2]", t.blockedLines[1]);
    set("[data-server-line]", t.serverLines[0]);
    set("[data-server-line2]", t.serverLines[1]);

    const isRate = code === "1015";
    const isBlocked = code === "1020";
    const isServer = code === "5xx";

    all("[data-note-lead]").forEach((node) => {
      node.hidden = isServer;
    });
    const toggle = (selector, hidden) => {
      const node = one(selector);
      if (node) node.hidden = hidden;
    };
    toggle("[data-warning]", !isRate && !isBlocked);
    toggle("[data-rate]", !isRate);
    toggle("[data-blocked]", !isBlocked);
    toggle("[data-server]", !isServer);
    toggle("[data-actions]", !isBlocked);

    all("[data-set-lang]").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.setLang === lang));
    });
  };

  all("[data-set-lang]").forEach((button) => {
    button.addEventListener("click", () => {
      lang = button.dataset.setLang;
      localStorage.setItem("cc-error-lang", lang);
      render();
    });
  });

  all("[data-copy-ray]").forEach((button) => {
    button.addEventListener("click", async () => {
      const text = one("[data-ray]")?.textContent || "";
      try {
        await navigator.clipboard.writeText(text);
        all("[data-copy-ray]").forEach((b) => {
          b.dataset.copied = "true";
          b.textContent = UI[lang].copied;
        });
        setTimeout(() => {
          all("[data-copy-ray]").forEach((b) => {
            b.dataset.copied = "false";
            b.textContent = UI[lang].copy;
          });
        }, 1600);
      } catch {
        button.textContent = "Ctrl+C";
      }
    });
  });

  render();
})();
