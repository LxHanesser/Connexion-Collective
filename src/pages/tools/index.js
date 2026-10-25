import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import Heading from '@theme/Heading';
import styles from './tools.module.css';

const TOOLS = [
  {
    title: '图片压缩',
    description:
      '把 JPG / PNG / WebP 压到更小，支持批量、可调质量与尺寸。图片只在你的浏览器里处理，不会上传。',
    to: '/tools/image-compress',
    icon: '🖼️',
    ready: true,
  },
];

export default function ToolsPage() {
  return (
    <Layout
      title="在线工具"
      description="浏览器里就能跑的小工具：图片压缩等，文件不上传、不需要注册。">
      <main className={styles.page}>
        <header className={styles.header}>
          <Heading as="h1" className={styles.title}>
            在线工具
          </Heading>
          <p className={styles.lead}>
            这些工具全部在浏览器里运行，文件不会上传到服务器，也不需要注册或登录。
          </p>
        </header>

        <ul className={styles.grid}>
          {TOOLS.map((tool) => (
            <li key={tool.to} className={styles.card}>
              <span className={styles.icon} aria-hidden="true">
                {tool.icon}
              </span>
              <h2 className={styles.cardTitle}>{tool.title}</h2>
              <p className={styles.cardText}>{tool.description}</p>
              <Link className="button button--primary" to={tool.to}>
                打开工具
              </Link>
            </li>
          ))}

          <li className={`${styles.card} ${styles.cardMuted}`}>
            <span className={styles.icon} aria-hidden="true">
              🧪
            </span>
            <h2 className={styles.cardTitle}>更多工具</h2>
            <p className={styles.cardText}>
              图片格式转换、尺寸裁剪这些也在计划里，慢慢加。
            </p>
            <span className={styles.soon}>敬请期待</span>
          </li>
        </ul>
      </main>
    </Layout>
  );
}
