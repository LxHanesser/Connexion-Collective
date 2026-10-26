import React, {useEffect, useMemo, useState} from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import Heading from '@theme/Heading';
import {useLocation} from '@docusaurus/router';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import {TOOL_COUNT, getToolGroups} from '@site/src/toolsCatalog';
import styles from './tools.module.css';

const COPY = {
  zh: {
    title: '在线工具',
    description:
      '浏览器里就能跑的小工具：图片处理、PDF、SVG、EXIF、开发工具，以及我的世界坐标换算与数据包生成。文件不上传、不需要注册。',
    heading: '在线工具',
    lead: '全部在浏览器里运行，文件不会上传，也不需要注册。每个工具按需加载，不会拖慢网站本身。',
    open: '打开工具',
    jump: '快速跳转',
    filterLabel: '筛选工具',
    filterPlaceholder: '搜索工具名或用途，例如 PDF、坐标…',
    count: (shown) => `显示 ${shown} / ${TOOL_COUNT} 个工具`,
    noMatch: '没有匹配的工具，换个关键词试试。',
    note: '这些工具都没有服务端：图片、PDF、SVG 都在你的浏览器里处理，关掉页面就什么都不剩。新增工具只改 src/toolsCatalog.js，导航栏和列表会自动同步。',
  },
  en: {
    title: 'Tools',
    description:
      'Small tools that run in your browser: image processing, PDF, SVG, EXIF, developer utilities, plus Minecraft coordinate conversion and datapack generation. No uploads, no sign-up.',
    heading: 'Tools',
    lead: 'Everything runs in your browser. Files are never uploaded, and there is nothing to sign up for. Each tool loads on demand, so the rest of the site stays fast.',
    open: 'Open tool',
    jump: 'Jump to',
    filterLabel: 'Filter tools',
    filterPlaceholder: 'Search by name or purpose, e.g. PDF, coordinates…',
    count: (shown) => `Showing ${shown} of ${TOOL_COUNT} tools`,
    noMatch: 'No tools match that — try another keyword.',
    note: 'There is no server behind any of these: images, PDFs and SVGs are processed locally, and nothing survives closing the tab. Adding a tool only touches src/toolsCatalog.js — the navbar and this list follow automatically.',
  },
};

export default function ToolsPage() {
  const {i18n} = useDocusaurusContext();
  const copy = i18n.currentLocale === 'en' ? COPY.en : COPY.zh;
  const groups = getToolGroups(i18n.currentLocale);
  const [query, setQuery] = useState('');
  const {search} = useLocation();

  // 导航栏下拉用 ?group=xxx 进分类，这里负责滚到对应分区
  useEffect(() => {
    const group = new URLSearchParams(search).get('group');
    if (!group) return;
    const target = document.getElementById(group);
    if (target) target.scrollIntoView({block: 'start'});
  }, [search]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return groups;
    return groups
      .map((group) => ({
        ...group,
        tools: group.tools.filter((tool) =>
          `${tool.name} ${tool.desc} ${tool.slug}`.toLowerCase().includes(needle),
        ),
      }))
      .filter((group) => group.tools.length > 0);
  }, [groups, query]);

  const shown = filtered.reduce((sum, group) => sum + group.tools.length, 0);

  return (
    <Layout title={copy.title} description={copy.description}>
      <main className={styles.page}>
        <header className={styles.header}>
          <Heading as="h1" className={styles.title}>
            {copy.heading}
          </Heading>
          <p className={styles.lead}>{copy.lead}</p>
        </header>

        <div className={styles.filterWrap}>
          <label className={styles.filterLabel} htmlFor="tool-filter">
            {copy.filterLabel}
          </label>
          <input
            id="tool-filter"
            className={styles.filterInput}
            type="search"
            value={query}
            placeholder={copy.filterPlaceholder}
            onChange={(event) => setQuery(event.target.value)}
          />
          <p className={styles.filterMeta} aria-live="polite">
            {copy.count(shown)}
          </p>
        </div>

        {!query ? (
          <nav className={styles.anchorNav} aria-label={copy.jump}>
            {groups.map((group) => (
              <a key={group.id} className={styles.anchorLink} href={`#${group.id}`}>
                {group.title}
              </a>
            ))}
          </nav>
        ) : null}

        {filtered.map((group) => (
          <section key={group.id} id={group.id} className={styles.section}>
            <div className={styles.sectionHead}>
              <Heading as="h2" className={styles.sectionTitle}>
                {group.title}
              </Heading>
              <span className={styles.sectionCount}>{group.tools.length}</span>
            </div>
            <p className={styles.sectionLead}>{group.lead}</p>

            <ul className={styles.grid}>
              {group.tools.map((tool) => (
                <li key={tool.to} className={styles.card}>
                  <span className={styles.icon} aria-hidden="true">
                    {tool.icon}
                  </span>
                  <h3 className={styles.cardTitle}>{tool.name}</h3>
                  <p className={styles.cardText}>{tool.desc}</p>
                  <Link className="button button--primary" to={tool.to}>
                    {copy.open}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}

        {shown === 0 ? <p className={styles.empty}>{copy.noMatch}</p> : null}

        <p className={styles.footerNote}>{copy.note}</p>
      </main>
    </Layout>
  );
}
