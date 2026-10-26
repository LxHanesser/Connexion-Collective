import React, {useCallback, useRef, useState} from 'react';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import {downloadBlob, formatBytes} from '@site/src/lib/imageTools';
import {copyText} from '@site/src/lib/clipboard';
import styles from './shared.module.css';

const COPY = {
  zh: {
    title: 'SVG 优化',
    description:
      '清理 SVG 里的编辑器元数据、注释与多余精度，减小体积。纯浏览器本地处理，文件不上传。',
    heading: 'SVG 优化',
    lead: '从 Figma、Illustrator、Inkscape 导出的 SVG 往往带着大量无用信息。这里会去掉注释、编辑器命名空间、多余空白，并把小数位收敛到你选的精度。',
    dropTitle: '拖入 SVG，或点击选择',
    dropHint: '只接受 .svg 文本文件，不上传',
    precision: '小数精度',
    keepMeta: '保留标题与描述（无障碍）',
    optimize: '优化',
    result: '优化结果',
    before: '原始',
    after: '优化后',
    saved: (pct) => `减少 ${pct}%`,
    grow: '没有可压缩的内容（可能已经是精简版本）',
    download: '下载 SVG',
    copy: '复制代码',
    copied: '已复制',
    preview: '预览',
    pick: '请先选择一个 SVG 文件',
    error: '这个文件看起来不是有效的 SVG',
    faqTitle: '说明',
    faq: [
      '会被移除：XML 声明、注释、DOCTYPE、metadata、inkscape/sodipodi 等编辑器命名空间。',
      '精度建议：图标用 1–2 位，插画用 2–3 位；0 位会明显看到折角。',
      '不会动 id 和引用，避免破坏 <use>、渐变与裁剪路径。',
      '真正的体积大头通常是路径数据本身，这个工具不改动路径形状。',
    ],
  },
  en: {
    title: 'SVG optimiser',
    description:
      'Strip editor metadata, comments and excess precision from SVG files. Runs entirely in your browser; nothing is uploaded.',
    heading: 'SVG optimiser',
    lead: 'SVGs exported from Figma, Illustrator or Inkscape carry a lot of dead weight. This removes comments, editor namespaces and redundant whitespace, and rounds decimals to the precision you pick.',
    dropTitle: 'Drop an SVG, or click to choose',
    dropHint: 'Text .svg files only — no upload',
    precision: 'Decimal precision',
    keepMeta: 'Keep title and description (accessibility)',
    optimize: 'Optimise',
    result: 'Result',
    before: 'Original',
    after: 'Optimised',
    saved: (pct) => `${pct}% smaller`,
    grow: 'Nothing to squeeze — it may already be tight',
    download: 'Download SVG',
    copy: 'Copy code',
    copied: 'Copied',
    preview: 'Preview',
    pick: 'Choose an SVG file first',
    error: 'That file does not look like valid SVG',
    faqTitle: 'Notes',
    faq: [
      'Removed: XML declaration, comments, DOCTYPE, metadata, and editor namespaces such as inkscape/sodipodi.',
      'Precision: 1–2 decimals for icons, 2–3 for illustrations. Zero decimals makes corners visibly angular.',
      'IDs and references are left alone so <use>, gradients and clip paths keep working.',
      'Most of the weight is usually the path data itself; this tool does not reshape paths.',
    ],
  },
};

const byteLength = (text) => new TextEncoder().encode(text).length;

function roundNumbers(text, precision) {
  const factor = 10 ** precision;
  return text.replace(/-?\d+\.\d+/g, (match) => {
    const rounded = Math.round(Number(match) * factor) / factor;
    return String(rounded);
  });
}

function optimizeSvg(source, {precision, keepMeta}) {
  let output = source;

  output = output.replace(/<\?xml[\s\S]*?\?>/g, '');
  output = output.replace(/<!DOCTYPE[\s\S]*?>/gi, '');
  output = output.replace(/<!--[\s\S]*?-->/g, '');

  if (!keepMeta) {
    output = output.replace(/<metadata[\s\S]*?<\/metadata>/gi, '');
    output = output.replace(/<title[\s\S]*?<\/title>/gi, '');
    output = output.replace(/<desc[\s\S]*?<\/desc>/gi, '');
  }

  // 编辑器命名空间与对应属性（xlink 必须保留，<use> 依赖它）
  output = output.replace(/\s+xmlns:(inkscape|sodipodi|dc|cc|rdf|i|serif)=("[^"]*"|'[^']*')/g, '');
  output = output.replace(/\s+(inkscape|sodipodi|dc|cc|rdf):[\w-]+=("[^"]*"|'[^']*')/g, '');

  // 编辑器专用元素（sodipodi:namedview 之类）整块删掉
  output = output.replace(/<(sodipodi|inkscape):[\w-]+[^>]*\/>/g, '');
  output = output.replace(/<(sodipodi|inkscape):[\w-]+[^>]*>[\s\S]*?<\/\1:[\w-]+>/g, '');

  // 空白压缩
  output = output.replace(/>\s+</g, '><');
  output = output.replace(/\s{2,}/g, ' ');
  output = output.replace(/\s+\/>/g, '/>');
  output = output.trim();

  // 数字精度
  output = roundNumbers(output, precision);

  // 空组
  output = output.replace(/<g[^>]*><\/g>/g, '');

  return output;
}

export default function SvgOptimizePage() {
  const {i18n} = useDocusaurusContext();
  const copy = i18n.currentLocale === 'en' ? COPY.en : COPY.zh;

  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState('');
  const [original, setOriginal] = useState('');
  const [optimized, setOptimized] = useState('');
  const [precision, setPrecision] = useState(2);
  const [keepMeta, setKeepMeta] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const handleFile = useCallback(async (file) => {
    if (!file) return;
    setError('');
    if (!/\.svg$/i.test(file.name) && file.type !== 'image/svg+xml') {
      setError(copy.error);
      return;
    }
    const text = await file.text();
    if (!/<svg[\s>]/i.test(text)) {
      setError(copy.error);
      return;
    }
    setFileName(file.name);
    setOriginal(text);
    setOptimized('');
  }, [copy.error]);

  const handleOptimize = () => {
    if (!original) return;
    setOptimized(optimizeSvg(original, {precision, keepMeta}));
  };

  const beforeSize = byteLength(original);
  const afterSize = optimized ? byteLength(optimized) : 0;
  const pct = beforeSize ? Math.round((1 - afterSize / beforeSize) * 100) : 0;

  const handleDownload = () => {
    if (!optimized) return;
    const name = fileName.replace(/\.svg$/i, '') || 'optimized';
    downloadBlob(new Blob([optimized], {type: 'image/svg+xml'}), `${name}.min.svg`);
  };

  const previewUri = optimized
    ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(optimized)}`
    : '';

  return (
    <Layout title={copy.title} description={copy.description}>
      <main className={styles.page}>
        <header className={styles.header}>
          <Heading as="h1" className={styles.title}>
            {copy.heading}
          </Heading>
          <p className={styles.lead}>{copy.lead}</p>
        </header>

        <div
          className={`${styles.dropzone} ${dragging ? styles.dropzoneActive : ''}`}
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              inputRef.current?.click();
            }
          }}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            handleFile(event.dataTransfer.files?.[0]);
          }}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".svg,image/svg+xml"
            className={styles.fileInput}
            onChange={(event) => handleFile(event.target.files?.[0])}
          />
          <span className={styles.dropIcon} aria-hidden="true">
            🧬
          </span>
          <span className={styles.dropTitle}>{copy.dropTitle}</span>
          <span className={styles.dropHint}>{copy.dropHint}</span>
        </div>

        {error ? <p className={styles.notice}>{error}</p> : null}
        {!original && !error ? (
          <p className={styles.fieldHint} style={{marginTop: '1rem'}}>
            {copy.pick}
          </p>
        ) : null}

        <div className={`${styles.settings} ${styles.settingsTwo}`}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>{copy.precision}</span>
            <select
              className={styles.select}
              value={precision}
              onChange={(event) => setPrecision(Number(event.target.value))}
            >
              {[0, 1, 2, 3, 4].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.field} style={{justifyContent: 'flex-end'}}>
            <span className={styles.fieldLabel}>{copy.keepMeta}</span>
            <input
              type="checkbox"
              checked={keepMeta}
              onChange={(event) => setKeepMeta(event.target.checked)}
              style={{width: '1.25rem', height: '1.25rem', accentColor: 'var(--ifm-color-primary)'}}
            />
          </label>
        </div>

        <div className={styles.toolbar}>
          <button type="button" className="button button--primary" onClick={handleOptimize} disabled={!original}>
            {copy.optimize}
          </button>
          {optimized ? (
            <>
              <button type="button" className="button button--secondary" onClick={handleDownload}>
                {copy.download}
              </button>
              <button
                type="button"
                className="button button--secondary"
                onClick={async () => {
                  if (await copyText(optimized)) {
                    setCopied(true);
                    window.setTimeout(() => setCopied(false), 1400);
                  }
                }}
              >
                {copied ? copy.copied : copy.copy}
              </button>
            </>
          ) : null}
        </div>

        {optimized ? (
          <>
            <p className={styles.summary} style={{marginTop: '1rem'}}>
              {copy.before}: {formatBytes(beforeSize)} → {copy.after}: {formatBytes(afterSize)} ·{' '}
              {pct > 0 ? copy.saved(pct) : copy.grow}
            </p>
            <div className={styles.previewWrap}>
              <img
                src={previewUri}
                alt={copy.preview}
                className={styles.previewCanvas}
                style={{background: '#fff', padding: '0.5rem', maxHeight: 320}}
              />
            </div>
            <textarea
              className={styles.textarea}
              readOnly
              value={optimized}
              spellCheck={false}
              onFocus={(event) => event.target.select()}
              style={{marginTop: '1rem'}}
            />
          </>
        ) : null}

        <section className={styles.faq}>
          <Heading as="h2" className={styles.faqTitle}>
            {copy.faqTitle}
          </Heading>
          <ul className={styles.faqList}>
            {copy.faq.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </section>
      </main>
    </Layout>
  );
}
