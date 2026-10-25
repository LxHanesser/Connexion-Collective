// @ts-check
import {themes as prismThemes} from 'prism-react-renderer';
import {daysSinceLaunch} from './src/siteMeta.js';

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
    locales: ['zh-Hans'],
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
        url: 'https://connexioncollective.com/',
        inLanguage: 'zh-Hans',
        description:
          '记录游戏背后的设计逻辑、现实生活的碎碎念与代码折腾的个人站点。',
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
          postsPerPage: 10,
          // 侧边栏列出全部文章（按时间倒序），不只是最近 5 篇
          blogSidebarTitle: '全部文章',
          blogSidebarCount: 'ALL',
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
      image: 'img/docusaurus-social-card.jpg',
      colorMode: {
        defaultMode: 'light',
        disableSwitch: false,
        respectPrefersColorScheme: true,
      },
      navbar: {
        title: 'Connexion Collective',
        logo: {
          alt: 'My Site Logo',
          src: 'img/logo.svg',
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
                html: '<p class="footer-brand__tagline">连接，从这里开始。</p>',
              },
              {
                html: '<p class="footer-brand__desc">记录游戏背后的设计逻辑、现实生活的碎碎念，和一点代码折腾。</p>',
              },
              {
                html: '<div class="footer-brand__actions"><a class="footer-cta" href="/subscribe">订阅更新</a><a class="footer-cta" href="/blog/archive" data-random-post title="随机打开一篇博客">🎲 随便看看</a><a class="footer-cta" href="https://github.com/LxHanesser" target="_blank" rel="noopener noreferrer">GitHub</a></div>',
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
              {label: '图片压缩', to: '/tools/image-compress'},
              {label: '二维码生成', to: '/tools/qr-code'},
              {label: '开发工具', to: '/tools/dev-tools'},
              {label: '网站更新日志', to: '/docs/info/changelog'},
              {label: '服务条款', to: '/docs/info/terms'},
            ],
          },
        ],
        // 构建时先写入一个正确值做兜底（禁用 JS 也能读到），浏览器端由 siteUptime 换成访问当天
        copyright: `© ${new Date().getFullYear()} Connexion Collective · 本站已运行 ${daysSinceLaunch()} 天 · Powered by Docusaurus`,
      },
      prism: {
        theme: prismThemes.github,
        darkTheme: prismThemes.dracula,
      },
    }),
};

export default config;