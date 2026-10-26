import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import Heading from '@theme/Heading';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
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
    note: '这些工具都没有服务端：图片、PDF、SVG 都在你的浏览器里处理，关掉页面就什么都不剩。新增工具会先放在合适的分组里，再补上中英文说明。',
    sections: [
      {
        id: 'practical',
        title: '现实工具',
        lead: '处理日常文件：图片、PDF、矢量图、照片元数据，以及开发者常用的小转换。',
        tools: [
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
            title: '图片转 ICO',
            description: '把 PNG / JPG 转成多尺寸 ICO，适用于 Windows 图标与网页 favicon。',
            to: '/tools/image-ico',
            icon: '🪟',
          },
          {
            title: '图片转 Base64',
            description: '生成 Data URI，可直接内联进 HTML、CSS 或 Markdown，省掉一次请求。',
            to: '/tools/image-base64',
            icon: '🖼️',
          },
          {
            title: '像素画转换',
            description: '降采样加有限调色板，生成像素画风格，支持 PICO-8 / Game Boy 配色。',
            to: '/tools/pixel-art',
            icon: '👾',
          },
          {
            title: 'SVG 优化',
            description: '清理编辑器元数据、注释与多余精度，减小体积，保留 id 与引用关系。',
            to: '/tools/svg-optimize',
            icon: '🧬',
          },
          {
            title: 'EXIF 查看 / 清除',
            description: '查看照片的相机、时间与 GPS 信息，确认后一键清除再保存。',
            to: '/tools/exif',
            icon: '🔍',
          },
          {
            title: 'PDF 合并 / 拆分',
            description: '合并多个 PDF，按页码范围拆分，或把每页导出成单独的压缩包。',
            to: '/tools/pdf',
            icon: '📄',
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
        ],
      },
      {
        id: 'games',
        title: '游戏工具',
        lead: '游戏里算坐标、写命令、生成资源包这类事，也都不需要服务端。',
        tools: [
          {
            title: '我的世界坐标换算',
            description: '主世界与下界 8:1 互转，顺带算出区块坐标、区块内偏移与 region 文件名。',
            to: '/tools/mc-coords',
            icon: '🧭',
          },
          {
            title: '我的世界数据包生成器',
            description: '把命令打包成 datapacks 可直接使用的 ZIP，自动生成 pack.mcmeta 与 load/tick 标签。',
            to: '/tools/mc-datapack',
            icon: '📦',
          },
        ],
      },
    ],
  },
  en: {
    title: 'Tools',
    description:
      'Small tools that run in your browser: image processing, PDF, SVG, EXIF, developer utilities, plus Minecraft coordinate conversion and datapack generation. No uploads, no sign-up.',
    heading: 'Tools',
    lead: 'Everything runs in your browser. Files are never uploaded, and there is nothing to sign up for. Each tool loads on demand, so the rest of the site stays fast.',
    open: 'Open tool',
    jump: 'Jump to',
    note: 'There is no server behind any of these: images, PDFs and SVGs are processed locally, and nothing survives closing the tab. New tools land in whichever group fits and ship with both languages.',
    sections: [
      {
        id: 'practical',
        title: 'Everyday tools',
        lead: 'Files you deal with day to day: images, PDFs, vector graphics, photo metadata, and small developer conversions.',
        tools: [
          {
            title: 'Image compression',
            description:
              'Batch compress JPG / PNG / WebP with adjustable quality and size. WebP output and lossless PNG optimisation included.',
            to: '/tools/image-compress',
            icon: '🗜️',
          },
          {
            title: 'Image format converter',
            description:
              'Convert between WebP, JPEG and PNG. Transparency is handled automatically, and batches download directly.',
            to: '/tools/image-convert',
            icon: '🔄',
          },
          {
            title: 'Crop & rotate',
            description:
              'Drag to select a crop area, rotate by 90°, flip horizontally, and use common ratios such as 1:1, 4:3 and 16:9.',
            to: '/tools/image-crop',
            icon: '✂️',
          },
          {
            title: 'Image watermark',
            description:
              'Add a text watermark in one of nine positions, with adjustable size and opacity, exported at the original resolution.',
            to: '/tools/watermark',
            icon: '💧',
          },
          {
            title: 'Image to ICO',
            description: 'Turn PNG / JPG into a multi-size ICO for Windows icons and web favicons.',
            to: '/tools/image-ico',
            icon: '🪟',
          },
          {
            title: 'Image to Base64',
            description: 'Produce a data URI you can inline in HTML, CSS or Markdown to save a request.',
            to: '/tools/image-base64',
            icon: '🖼️',
          },
          {
            title: 'Pixel art converter',
            description: 'Downsample with a limited palette for a pixel-art look, including PICO-8 and Game Boy colours.',
            to: '/tools/pixel-art',
            icon: '👾',
          },
          {
            title: 'SVG optimiser',
            description: 'Strip editor metadata, comments and excess precision while keeping ids and references intact.',
            to: '/tools/svg-optimize',
            icon: '🧬',
          },
          {
            title: 'EXIF viewer / remover',
            description: 'Inspect camera, timestamp and GPS data, then strip it and save a clean copy.',
            to: '/tools/exif',
            icon: '🔍',
          },
          {
            title: 'PDF merge / split',
            description: 'Merge several PDFs, extract page ranges, or export every page in a ZIP.',
            to: '/tools/pdf',
            icon: '📄',
          },
          {
            title: 'QR code generator',
            description:
              'Turn a link or text into a QR code with configurable size, margin, error correction and colours.',
            to: '/tools/qr-code',
            icon: '📱',
          },
          {
            title: 'Developer tools',
            description: 'JSON formatting, Base64 / URL encoding, hashing, timestamps and UUIDs — all on one page.',
            to: '/tools/dev-tools',
            icon: '🧰',
          },
        ],
      },
      {
        id: 'games',
        title: 'Game tools',
        lead: 'Coordinates, commands and resource packs — none of which need a server either.',
        tools: [
          {
            title: 'Minecraft coordinate converter',
            description:
              'Convert Overworld and Nether coordinates at 8:1, plus chunk coordinates, in-chunk offsets and region file names.',
            to: '/tools/mc-coords',
            icon: '🧭',
          },
          {
            title: 'Minecraft datapack generator',
            description:
              'Bundle commands into a ready-to-use datapack ZIP with pack.mcmeta and load/tick tags generated for you.',
            to: '/tools/mc-datapack',
            icon: '📦',
          },
        ],
      },
    ],
  },
};

export default function ToolsPage() {
  const {i18n} = useDocusaurusContext();
  const copy = i18n.currentLocale === 'en' ? COPY.en : COPY.zh;

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
          {copy.sections.map((section) => (
            <a key={section.id} className={styles.anchorLink} href={`#${section.id}`}>
              {section.title}
            </a>
          ))}
        </nav>

        {copy.sections.map((section) => (
          <section key={section.id} id={section.id} className={styles.section}>
            <div className={styles.sectionHead}>
              <Heading as="h2" className={styles.sectionTitle}>
                {section.title}
              </Heading>
              <span className={styles.sectionCount}>{section.tools.length}</span>
            </div>
            <p className={styles.sectionLead}>{section.lead}</p>

            <ul className={styles.grid}>
              {section.tools.map((tool) => (
                <li key={tool.to} className={styles.card}>
                  <span className={styles.icon} aria-hidden="true">
                    {tool.icon}
                  </span>
                  <h3 className={styles.cardTitle}>{tool.title}</h3>
                  <p className={styles.cardText}>{tool.description}</p>
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
