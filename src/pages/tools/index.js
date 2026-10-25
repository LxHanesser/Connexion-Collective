import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import Heading from '@theme/Heading';
import styles from './tools.module.css';

const TOOLS = [
  {
    title: '图片压缩',
    description: '批量压缩 JPG / PNG / WebP，可调质量与尺寸，支持 WebP 输出与 PNG 无损优化。',
    to: '/tools/image-compress',
    icon: '🗜️',
  },
  {
    title: '图片格式转换',
    description: '在 WebP / JPEG / PNG 之间互转，透明背景自动处理，批量转换后直接下载。',
    to: '/tools/image-convert',
    icon: '🔄',
  },
  {
    title: '图片裁剪 / 旋转',
    description: '拖拽框选裁剪区域，支持旋转 90°、水平翻转与 1:1 / 4:3 / 16:9 常用比例。',
    to: '/tools/image-crop',
    icon: '✂️',
  },
  {
    title: '图片加水印',
    description: '给图片加文字水印，9 个位置、字号透明度可调，按原图分辨率导出。',
    to: '/tools/watermark',
    icon: '💧',
  },
  {
    title: '二维码生成',
    description: '输入链接或文字实时生成二维码，支持中文、自定义尺寸与纠错级别。',
    to: '/tools/qr-code',
    icon: '📱',
  },
  {
    title: '开发工具',
    description: 'JSON 格式化、Base64 / URL 编解码、哈希、时间戳、UUID，一页搞定。',
    to: '/tools/dev-tools',
    icon: '🧰',
  },
];

export default function ToolsPage() {
  return (
    <Layout
      title="在线工具"
      description="浏览器里就能跑的小工具：图片压缩、格式转换、裁剪、水印、二维码、开发工具，文件不上传、不需要注册。">
      <main className={styles.page}>
        <header className={styles.header}>
          <Heading as="h1" className={styles.title}>
            在线工具
          </Heading>
          <p className={styles.lead}>
            这些工具全部在浏览器里运行，文件不会上传到服务器，也不需要注册或登录。
            每个工具都按需加载，不会拖慢网站本身。
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
              图片转 Base64、SVG 转 PNG、颜色工具都在计划里，慢慢加。
            </p>
            <span className={styles.soon}>敬请期待</span>
          </li>
        </ul>
      </main>
    </Layout>
  );
}
