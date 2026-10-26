// @ts-check
import {themes as prismThemes} from 'prism-react-renderer';
import {daysSinceLaunch} from './src/siteMeta.js';

// Docusaurus 逐语言构建时会设置这个变量，配置里少数文案需要据此切换
const currentLocale = process.env.DOCUSAURUS_CURRENT_LOCALE ?? 'zh-Hans';
const isEnglish = currentLocale === 'en';
const uptimeDays = daysSinceLaunch();
const uptimeLabel = isEnglish
  ? `Running ${uptimeDays} ${uptimeDays === 1 ? 'day' : 'days'}`
  : `本站已运行 ${uptimeDays} 天`;

// Cloudflare Web Analytics 的站点 token。留空 = 不加载任何外部脚本。
// 需要统计时：Cloudflare 控制台 → Analytics → Web Analytics 添加站点，把 token 填在这里。
const CF_WEB_ANALYTICS_TOKEN = '';

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Connexion Collective',
  tagline: 'Some Random Stuff',
  favicon: 'img/favicon.ico',

  future: {
    v4: true,
  },

  url: 'https://connexioncollective.com/',
  baseUrl: '/',

  organizationName: 'LxHanesser',
  projectName: 'Connexion-Collective',

  onBrokenLinks: 'throw',

  i18n: {
    defaultLocale: 'zh-Hans',
    locales: ['zh-Hans', 'en'],
    localeConfigs: {
      'zh-Hans': {label: '中文', htmlLang: 'zh-Hans'},
      en: {label: 'English', htmlLang: 'en'},
    },
  },

  // 在浏览器端执行的模块：页脚天数、阅读进度与回到顶部、图片灯箱
  clientModules: [
    './src/clientModules/siteUptime.js',
    './src/clientModules/readingProgress.js',
    './src/clientModules/imageLightbox.js',
    './src/clientModules/randomPostLink.js',
  ],

  // 站点级结构化数据（JSON-LD），帮助搜索引擎理解站点身份
  headTags: [
    // 提前建连：文章配图来自 R2 CDN、评论来自 giscus，各自省一次 TLS 握手
    {
      tagName: 'link',
      attributes: {rel: 'preconnect', href: 'https://cdn.connexioncollective.com', crossorigin: 'anonymous'},
    },
    {
      tagName: 'link',
      attributes: {rel: 'dns-prefetch', href: 'https://cdn.connexioncollective.com'},
    },
    {
      tagName: 'link',
      attributes: {rel: 'preconnect', href: 'https://giscus.app', crossorigin: 'anonymous'},
    },
    {
      tagName: 'link',
      attributes: {rel: 'dns-prefetch', href: 'https://giscus.app'},
    },
    // 默认不加载：只有填了 token 才会插入 Cloudflare 官方的无 Cookie 统计脚本
    ...(CF_WEB_ANALYTICS_TOKEN
      ? [
          {
            tagName: 'script',
            attributes: {
              src: 'https://static.cloudflareinsights.com/beacon.min.js',
              defer: 'defer',
              'data-cf-beacon': JSON.stringify({token: CF_WEB_ANALYTICS_TOKEN}),
            },
          },
        ]
      : []),
    {
      tagName: 'script',
      attributes: {type: 'application/ld+json'},
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'Connexion Collective',
        url: isEnglish
          ? 'https://connexioncollective.com/en/'
          : 'https://connexioncollective.com/',
        inLanguage: currentLocale,
        description: isEnglish
          ? 'A personal site on the logic behind games, the small things in life, and a bit of code tinkering.'
          : '记录游戏背后的设计逻辑、现实生活的碎碎念与代码折腾的个人站点。',
      }),
    },
  ],

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: './sidebars.js',
          editUrl: 'https://github.com/LxHanesser/Connexion-Collective/edit/main/',
        },
        blog: {
          showReadingTime: true,
          blogTitle: '博客与碎碎念',
          blogDescription: '记录关于游戏、现实与代码的随想。',
          postsPerPage: 12,
          // 让 sitemap 能输出 lastmod（信息来自 git 提交时间）
          showLastUpdateTime: true,
          // 侧边栏只显示最近 5 篇，末尾附「查看全部文章」链接
          blogSidebarTitle: '最近发布',
          blogSidebarCount: 5,
          feedOptions: {
            type: ['rss', 'atom'],
            xslt: true,
          },
          editUrl: 'https://github.com/LxHanesser/Connexion-Collective/edit/main/',
          onInlineTags: 'warn',
          onInlineAuthors: 'warn',
          onUntruncatedBlogPosts: 'warn',
        },
        theme: {
          customCss: './src/css/custom.css',
        },
        // 让搜索引擎知道每篇文章的更新时间
        sitemap: {
          lastmod: 'date',
          changefreq: null,
          priority: null,
        },
      }),
    ],
  ],

  // 站内搜索：构建时生成离线索引，浏览器端本地检索（无外部服务、无查询接口）
  themes: [
    [
      require.resolve('@easyops-cn/docusaurus-search-local'),
      {
        hashed: true,
        language: ['zh', 'en'],
        highlightSearchTermsOnTargetPage: true,
        searchResultLimits: 8,
        searchBarShortcutKeymap: 'mod+k',
        docsRouteBasePath: '/docs',
        blogRouteBasePath: '/blog',
        indexPages: false,
      },
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      image: 'img/social-card.png',
      colorMode: {
        defaultMode: 'light',
        disableSwitch: false,
        respectPrefersColorScheme: true,
      },
      navbar: {
        title: 'Connexion Collective',
        logo: {
          // 导航栏里只显示 32px 高，用 117x128 的 WebP（4.9KB）代替 45KB 的 SVG。
          // 文件名带尺寸后缀：/img/* 有缓存，换文件必须换名字才不会被旧缓存挡住。
          alt: 'Connexion Collective',
          src: 'img/logo-128.webp',
        },
        items: [
          {
            to: '/docs/info/about',
            label: '写在开始',
            position: 'left',
          },
          {
            to: '/blog',
            label: '博客',
            position: 'left',
          },
          {
            type: 'dropdown',
            label: '在线工具',
            position: 'left',
            items: [
              {label: '全部工具', to: '/tools'},
              {label: '图片压缩', to: '/tools/image-compress'},
              {label: '格式转换', to: '/tools/image-convert'},
              {label: '裁剪旋转', to: '/tools/image-crop'},
              {label: '加水印', to: '/tools/watermark'},
              {label: '二维码生成', to: '/tools/qr-code'},
              {label: '开发工具', to: '/tools/dev-tools'},
            ],
          },
          {
            to: '/docs/info/changelog',
            label: '网站更新日志',
            position: 'left',
          },
          {
            to: '/docs/info/terms',
            label: '条款',
            position: 'left',
          },
          {
            type: 'localeDropdown',
            position: 'right',
          },
        ],
      },
      
      // 博客的附加配置（按年份归档）
      blog: {
        sidebar: {
          groupByYear: true,
        },
      },

      footer: {
        style: 'dark',
        links: [
          {
            title: 'Connexion Collective',
            className: 'footer-brand',
            items: [
              {
                html: isEnglish
                  ? '<p class="footer-brand__tagline">Connection starts here.</p>'
                  : '<p class="footer-brand__tagline">连接，从这里开始。</p>',
              },
              {
                html: isEnglish
                  ? '<p class="footer-brand__desc">Notes on the logic behind games, the small things in life, and a bit of code tinkering.</p>'
                  : '<p class="footer-brand__desc">记录游戏背后的设计逻辑、现实生活的碎碎念，和一点代码折腾。</p>',
              },
              {
                html: isEnglish
                  ? '<div class="footer-brand__actions"><a class="footer-cta" href="/subscribe">Subscribe</a><a class="footer-cta" href="/blog/archive" data-random-post title="Open a random post">🎲 Surprise me</a><a class="footer-cta" href="https://github.com/LxHanesser" target="_blank" rel="noopener noreferrer">GitHub</a></div>'
                  : '<div class="footer-brand__actions"><a class="footer-cta" href="/subscribe">订阅更新</a><a class="footer-cta" href="/blog/archive" data-random-post title="随机打开一篇博客">🎲 随便看看</a><a class="footer-cta" href="https://github.com/LxHanesser" target="_blank" rel="noopener noreferrer">GitHub</a></div>',
              },
            ],
          },
          {
            title: '站点',
            items: [
              {label: '写在开始', to: '/docs/info/about'},
              {label: '博客', to: '/blog'},
              {label: '订阅更新', to: '/subscribe'},
            ],
          },
          {
            title: '更多',
            items: [
              {label: '在线工具', to: '/tools'},
              {label: '网站更新日志', to: '/docs/info/changelog'},
              {label: '服务条款', to: '/docs/info/terms'},
            ],
          },
        ],
        // 构建时先写入一个正确值做兜底（禁用 JS 也能读到），浏览器端由 siteUptime 换成访问当天
        copyright: `© ${new Date().getFullYear()} Connexion Collective · ${uptimeLabel} · Powered by Docusaurus`,
      },
      prism: {
        theme: prismThemes.github,
        darkTheme: prismThemes.dracula,
      },
    }),
};

export default config;