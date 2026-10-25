// @ts-check
import {themes as prismThemes} from 'prism-react-renderer';
import {daysSinceLaunch} from './src/siteMeta.js';

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

  // 在浏览器端执行的模块：页脚天数、阅读进度与回到顶部
  clientModules: [
    './src/clientModules/siteUptime.js',
    './src/clientModules/readingProgress.js',
  ],

  // 站点级结构化数据（JSON-LD），帮助搜索引擎理解站点身份
  headTags: [
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
        links: [],
        // 构建时先写入一个正确值做兜底（禁用 JS 也能读到），浏览器端由 siteUptime 换成访问当天
        copyright: `本站已运行 ${daysSinceLaunch()} 天 | Powered by Docusaurus`,
      },
      prism: {
        theme: prismThemes.github,
        darkTheme: prismThemes.dracula,
      },
    }),
};

export default config;