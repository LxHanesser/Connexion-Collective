import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import Heading from '@theme/Heading';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import {getToolGroups} from '@site/src/toolsCatalog';
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
    note: 'There is no server behind any of these: images, PDFs and SVGs are processed locally, and nothing survives closing the tab. Adding a tool only touches src/toolsCatalog.js — the navbar and this list follow automatically.',
  },
};

export default function ToolsPage() {
  const {i18n} = useDocusaurusContext();
  const copy = i18n.currentLocale === 'en' ? COPY.en : COPY.zh;
  const groups = getToolGroups(i18n.currentLocale);

  return (
    <Layout title={copy.title} description={copy.description}>
      <main className={styles.page}>
        <header className={styles.header}>
          <Heading as="h1" className={styles.title}>
            {copy.heading}
          </Heading>
          <p className={styles.lead}>{copy.lead}</p>
        </header>

        <nav className={styles.anchorNav} aria-label={copy.jump}>
          {groups.map((group) => (
            <a key={group.id} className={styles.anchorLink} href={`#${group.id}`}>
              {group.title}
            </a>
          ))}
        </nav>

        {groups.map((group) => (
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

        <p className={styles.footerNote}>{copy.note}</p>
      </main>
    </Layout>
  );
}
