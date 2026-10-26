import React, {useCallback, useRef, useState} from 'react';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import {ICO_SIZES, encodeIco} from '@site/src/lib/ico';
import {
  baseName,
  canvasToBlob,
  createCanvas,
  downloadBlob,
  formatBytes,
  loadBitmap,
} from '@site/src/lib/imageTools';
import styles from './shared.module.css';

const COPY = {
  zh: {
    title: '图片转 ICO',
    description:
      '把 PNG / JPG 转成多尺寸 ICO 图标，适用于 Windows 快捷方式与网页 favicon。浏览器本地生成，不上传。',
    heading: '图片转 ICO',
    lead: '选一张正方形图片，勾选需要的尺寸，生成一个包含多尺寸的 ICO 文件。建议原图至少 256×256。',
    dropTitle: '拖入图片，或点击选择',
    dropHint: 'PNG / JPEG / WebP，推荐正方形、≥256×256',
    sizesLabel: '包含尺寸',
    make: '生成 ICO',
    working: '生成中…',
    download: '下载 .ico',
    source: '原图',
    tooSmall: '原图小于 256×256，放大的尺寸会变模糊。',
    result: (count, size) => `已生成 ${count} 个尺寸，共 ${size}`,
    pick: '请先选择一张图片',
    faqTitle: '说明',
    faq: [
      'ICO 是容器格式，可以同时装多个尺寸，系统会挑最合适的显示。',
      '256 尺寸在 ICO 里用 0 表示，这是格式规范，不是 bug。',
      '浏览器 favicon 通常 16/32/48 就够；桌面快捷方式建议带上 256。',
      '透明背景会保留。',
    ],
  },
  en: {
    title: 'Image to ICO',
    description:
      'Convert PNG / JPG into a multi-size ICO icon for Windows shortcuts and web favicons. Generated in your browser, never uploaded.',
    heading: 'Image to ICO',
    lead: 'Pick a square image, tick the sizes you need, and get one ICO containing all of them. Use a source of at least 256×256.',
    dropTitle: 'Drop an image, or click to choose',
    dropHint: 'PNG / JPEG / WebP — square and ≥256×256 recommended',
    sizesLabel: 'Sizes',
    make: 'Generate ICO',
    working: 'Generating…',
    download: 'Download .ico',
    source: 'Source',
    tooSmall: 'The source is smaller than 256×256; upscaled sizes will look soft.',
    result: (count, size) => `Generated ${count} sizes, ${size} in total`,
    pick: 'Choose an image first',
    faqTitle: 'Notes',
    faq: [
      'ICO is a container: it can hold several sizes and the system picks the best one.',
      'A 256 size is stored as 0 inside the file — that is the format spec, not a bug.',
      'For favicons 16/32/48 is usually enough; add 256 for desktop shortcuts.',
      'Transparency is preserved.',
    ],
  },
};

export default function ImageIcoPage() {
  const {i18n} = useDocusaurusContext();
  const copy = i18n.currentLocale === 'en' ? COPY.en : COPY.zh;

  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [source, setSource] = useState(null);
  const [selected, setSelected] = useState([16, 32, 48, 256]);
  const [icoBlob, setIcoBlob] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleFile = useCallback(async (file) => {
    if (!file) return;
    setError('');
    setIcoBlob(null);
    try {
      const bitmap = await loadBitmap(file);
      setSource({name: file.name, width: bitmap.width, height: bitmap.height, bitmap});
    } catch (err) {
      setError(String(err?.message || err));
    }
  }, []);

  const toggleSize = (size) => {
    setSelected((current) =>
      current.includes(size) ? current.filter((item) => item !== size) : [...current, size].sort((a, b) => a - b),
    );
  };

  const clear = useCallback(() => {
    setIcoBlob(null);
    setError('');
    setSource(null);
    if (inputRef.current) inputRef.current.value = '';
  }, []);

  const handleGenerate = async () => {
    if (!source || !selected.length) return;
    setBusy(true);
    setError('');
    try {
      const images = [];
      for (const size of [...selected].sort((a, b) => a - b)) {
        const canvas = createCanvas(size, size);
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingQuality = 'high';
        // 居中裁切为正方形
        const side = Math.min(source.bitmap.width, source.bitmap.height);
        const sx = (source.bitmap.width - side) / 2;
        const sy = (source.bitmap.height - side) / 2;
        ctx.drawImage(source.bitmap, sx, sy, side, side, 0, 0, size, size);
        const blob = await canvasToBlob(canvas, 'image/png');
        images.push({size, png: new Uint8Array(await blob.arrayBuffer())});
      }
      setIcoBlob(encodeIco(images));
    } catch (err) {
      setError(String(err?.message || err));
    } finally {
      setBusy(false);
    }
  };

  const handleDownload = () => {
    if (!icoBlob || !source) return;
    downloadBlob(icoBlob, `${baseName(source.name)}.ico`);
  };

  const small = source ? Math.min(source.width, source.height) < 256 : false;

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
            accept="image/*"
            className={styles.fileInput}
            onChange={(event) => handleFile(event.target.files?.[0])}
          />
          <span className={styles.dropIcon} aria-hidden="true">
            🪟
          </span>
          <span className={styles.dropTitle}>{copy.dropTitle}</span>
          <span className={styles.dropHint}>{copy.dropHint}</span>
        </div>

        {source ? (
          <p className={styles.summary} style={{marginTop: '1rem'}}>
            {copy.source}: {source.name} · {source.width}×{source.height}
          </p>
        ) : (
          <p className={styles.fieldHint} style={{marginTop: '1rem'}}>
            {copy.pick}
          </p>
        )}
        {small ? <p className={styles.notice}>{copy.tooSmall}</p> : null}
        {error ? <p className={styles.notice}>{error}</p> : null}

        <div className={styles.settings}>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>{copy.sizesLabel}</span>
            <div className={styles.buttonRow}>
              {ICO_SIZES.map((size) => (
                <label
                  key={size}
                  className="button button--secondary button--sm"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    opacity: selected.includes(size) ? 1 : 0.55,
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(size)}
                    onChange={() => toggleSize(size)}
                  />
                  {size}
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className={styles.toolbar}>
          <button
            type="button"
            className="button button--primary"
            onClick={handleGenerate}
            disabled={!source || !selected.length || busy}
          >
            {busy ? copy.working : copy.make}
          </button>
          {icoBlob ? (
            <button type="button" className="button button--secondary" onClick={handleDownload}>
              {copy.download}
            </button>
          ) : null}
          {source ? (
            <button type="button" className="button button--secondary" onClick={clear}>
              ↺
            </button>
          ) : null}
        </div>

        {icoBlob ? (
          <p className={styles.hint}>{copy.result(selected.length, formatBytes(icoBlob.size))}</p>
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
