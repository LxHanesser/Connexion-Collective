import React, {useMemo} from 'react';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import {usePluginData} from '@docusaurus/useGlobalData';
import {TOOL_GROUPS} from '@site/src/toolsCatalog';
import summary from '@site/src/data/analytics-summary.json';
import styles from './stats.module.css';

// 站点统计页。数据来自 Cloudflare Web Analytics（RUM）的定期导出，
// 存档在 src/data/analytics.json，页面只读预聚合的 analytics-summary.json。
// 抓取脚本：npm run stats:fetch

const STATIC_TITLES = {
  '/': {zh: '首页', en: 'Home'},
  '/blog': {zh: '博客', en: 'Blog'},
  '/blog/archive': {zh: '文章归档', en: 'Archive'},
  '/tools': {zh: '在线工具', en: 'Tools'},
  '/search': {zh: '站内搜索', en: 'Search'},
  '/subscribe': {zh: '订阅更新', en: 'Subscribe'},
  '/docs/info/about': {zh: '写在开始', en: 'Start here'},
  '/docs/info/changelog': {zh: '网站更新日志', en: 'Changelog'},
  '/docs/info/terms': {zh: '条款', en: 'Terms'},
  '/stats': {zh: '站点统计', en: 'Stats'},
};

const format = (n) => new Intl.NumberFormat('en-US').format(n ?? 0);
const shortDate = (d) => (d ? d.slice(5) : '');

export default function StatsPage() {
  const {i18n} = useDocusaurusContext();
  const en = i18n.currentLocale === 'en';
  const t = (zh, eng) => (en ? eng : zh);
  const blogIndex = usePluginData('blog-post-index');

  // 路径 → 标题：工具取目录、文章取博客索引、其余查固定映射
  const resolveTitle = useMemo(() => {
    const tools = new Map();
    for (const group of TOOL_GROUPS) {
      for (const tool of group.tools) {
        tools.set(`/tools/${tool.slug}`, en ? tool.en.name : tool.zh.name);
      }
    }
    const posts = new Map();
    for (const post of blogIndex?.posts ?? []) {
      posts.set(`/blog/${post.slug}`, en && post.titleEn ? post.titleEn : post.title);
    }

    return (path) => {
      const isEn = path === '/en' || path.startsWith('/en/');
      const base = isEn ? path.replace(/^\/en(?=\/|$)/, '') || '/' : path;
      if (tools.has(base)) return {title: tools.get(base), isEn};
      if (posts.has(base)) return {title: posts.get(base), isEn};
      const known = STATIC_TITLES[base];
      if (known) return {title: en ? known.en : known.zh, isEn};
      return {title: base, isEn};
    };
  }, [en, blogIndex]);

  const sinceEarliest = useMemo(
    () => summary.series.filter((d) => summary.earliest && d.date >= summary.earliest),
    [],
  );

  const peak = Math.max(1, ...sinceEarliest.map((d) => d.views));

  // 图表几何：柱子按天分布，访问数连成折线；横轴只标首/中/尾，避免拥挤
  const chart = useMemo(() => {
    const days = sinceEarliest;
    const n = Math.max(days.length, 1);
    const width = Math.min(44, 640 / n);
    const gap = (700 - width * n) / (n + 1);
    const bars = days.map((d, index) => {
      const x = 10 + gap + index * (width + gap);
      const height = (d.views / peak) * 140;
      return {
        date: d.date,
        views: d.views,
        visits: d.visits,
        x,
        width,
        height,
        y: 160 - height,
        cx: x + width / 2,
        vy: 160 - (d.visits / peak) * 140,
      };
    });
    const indexes =
      days.length <= 7 ? days.map((_, i) => i) : [0, Math.floor((days.length - 1) / 2), days.length - 1];
    const xLabels = [...new Set(indexes)].map((i) => ({
      x: bars[i].cx,
      text: shortDate(days[i].date),
    }));
    return {bars, points: bars, xLabels};
  }, [sinceEarliest, peak]);
  const topPages = summary.topPages.slice(0, 10);
  const topViews = Math.max(1, topPages[0]?.views ?? 1);
  const perVisit = summary.totalVisits ? summary.totalViews / summary.totalVisits : 0;

  const updated = summary.updated ? summary.updated.slice(0, 16).replace('T', ' ') : '—';

  return (
    <Layout
      title={t('站点统计', 'Stats')}
      description={t(
        '这个站点被看了多少眼：浏览量、访问数、热门页面，数据来自 Cloudflare Web Analytics。',
        'How many times this site was seen: page views, visits and popular pages, sourced from Cloudflare Web Analytics.',
      )}
    >
      <main className={styles.page}>
        <header className={styles.header}>
          <Heading as="h1" className={styles.title}>
            {t('站点统计', 'Stats')}
          </Heading>
          <p className={styles.lead}>
            {t(
              '数据由 Cloudflare Web Analytics 采集：不使用 Cookie，不做跨站追踪与设备指纹，仅统计真实浏览器上报的聚合页面浏览与访问次数，不含机器人与扫描流量。',
              'Collected by Cloudflare Web Analytics: no cookies, no cross-site tracking, no device fingerprinting. Only aggregate page views and visits reported by real browsers are counted — bots and scanner traffic are excluded.',
            )}
          </p>
        </header>

        {summary.daysTracked === 0 ? (
          <p className={styles.empty}>
            {t('还没有统计数据，抓取一次后就会出现。', 'No data yet — run the fetch script to populate this page.')}
          </p>
        ) : (
          <>
            <section className={styles.kpis} aria-label={t('概览', 'Overview')}>
              <div className={styles.kpi}>
                <span className={styles.kpiValue}>{format(summary.totalViews)}</span>
                <span className={styles.kpiLabel}>{t('总浏览量', 'Page views')}</span>
              </div>
              <div className={styles.kpi}>
                <span className={styles.kpiValue}>{format(summary.totalVisits)}</span>
                <span className={styles.kpiLabel}>{t('总访问数', 'Visits')}</span>
              </div>
              <div className={styles.kpi}>
                <span className={styles.kpiValue}>{format(summary.daysTracked)}</span>
                <span className={styles.kpiLabel}>{t('统计天数', 'Days tracked')}</span>
              </div>
              <div className={styles.kpi}>
                <span className={styles.kpiValue}>{perVisit.toFixed(1)}</span>
                <span className={styles.kpiLabel}>{t('每次访问浏览页数', 'Pages per visit')}</span>
              </div>
            </section>

            <section className={styles.section}>
              <div className={styles.sectionHead}>
                <Heading as="h2" className={styles.sectionTitle}>
                  {t('每日浏览量', 'Daily page views')}
                </Heading>
                <span className={styles.sectionMeta}>
                  {summary.earliest} — {summary.latest}
                </span>
              </div>
              <figure className={styles.chart}>
                <svg
                  viewBox="0 0 720 200"
                  className={styles.chartSvg}
                  role="img"
                  aria-label={t('每日浏览量柱状图', 'Bar chart of daily page views')}
                >
                  {[0, 0.5, 1].map((ratio) => {
                    const y = 20 + (1 - ratio) * 140;
                    return (
                      <g key={ratio}>
                        <line x1="0" y1={y} x2="720" y2={y} className={styles.gridLine} />
                        <text x="4" y={y - 5} className={styles.axisText}>
                          {format(Math.round(peak * ratio))}
                        </text>
                      </g>
                    );
                  })}

                  {chart.bars.map((bar) => (
                    <rect
                      key={bar.date}
                      x={bar.x}
                      y={bar.y}
                      width={bar.width}
                      height={Math.max(bar.height, bar.views > 0 ? 2 : 0)}
                      rx="3"
                      className={styles.bar}
                    >
                      <title>{`${bar.date} · ${bar.views} ${t('浏览', 'views')} / ${bar.visits} ${t('访问', 'visits')}`}</title>
                    </rect>
                  ))}

                  {chart.points.length > 1 ? (
                    <polyline className={styles.visitLine} points={chart.points.map((p) => `${p.cx},${p.vy}`).join(' ')} />
                  ) : null}

                  {chart.points.map((p) =>
                    p.visits > 0 ? <circle key={`v-${p.date}`} cx={p.cx} cy={p.vy} r="2.5" className={styles.visitDot} /> : null,
                  )}

                  {chart.xLabels.map((label) => (
                    <text key={label.x} x={label.x} y="188" className={styles.xAxisText} textAnchor="middle">
                      {label.text}
                    </text>
                  ))}
                </svg>
                <div className={styles.legend}>
                  <span className={styles.legendItem}>
                    <span className={styles.legendBar} /> {t('浏览量', 'Page views')}
                  </span>
                  <span className={styles.legendItem}>
                    <span className={styles.legendLine} /> {t('访问数', 'Visits')}
                  </span>
                  <span className={styles.axisRange}>
                    {shortDate(summary.earliest)} → {shortDate(summary.latest)}
                  </span>
                </div>
              </figure>
            </section>

            <section className={styles.section}>
              <Heading as="h2" className={styles.sectionTitle}>
                {t('热门页面', 'Popular pages')}
              </Heading>
              <ol className={styles.table}>
                {topPages.map((page, index) => {
                  const {title, isEn} = resolveTitle(page.path);
                  return (
                    <li key={page.path} className={styles.row}>
                      <span className={styles.rank}>{String(index + 1).padStart(2, '0')}</span>
                      <span className={styles.rowBody}>
                        <span className={styles.rowTitle}>
                          {title}
                          {isEn ? <span className={styles.langTag}>EN</span> : null}
                        </span>
                        <span className={styles.rowPath}>{page.path}</span>
                      </span>
                      <span className={styles.rowBar} aria-hidden="true">
                        <span
                          className={styles.rowBarFill}
                          style={{width: `${Math.max(4, (page.views / topViews) * 100)}%`}}
                        />
                      </span>
                      <span className={styles.rowValue}>{format(page.views)}</span>
                    </li>
                  );
                })}
              </ol>
            </section>

            <p className={styles.note}>
              {t(
                `数据来源 Cloudflare Web Analytics（RUM），仅统计聚合浏览量，不含个人标识；统计起始 ${summary.earliest ?? '—'}，最近更新 ${updated} UTC。`,
                `Source: Cloudflare Web Analytics (RUM). Aggregate page views only, no personal identifiers. Tracking started ${summary.earliest ?? '—'}; last updated ${updated} UTC.`,
              )}
            </p>
          </>
        )}
      </main>
    </Layout>
  );
}
