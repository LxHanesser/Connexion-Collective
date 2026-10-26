import React, {useCallback, useRef, useState} from 'react';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import {formatBytes} from '@site/src/lib/imageTools';
import {copyText} from '@site/src/lib/clipboard';
import styles from './shared.module.css';

const COPY = {
  zh: {
    title: '图片转 Base64',
    description:
      '把图片转成 Base64 Data URI，可直接嵌进 HTML、CSS 或 Markdown。全程在浏览器本地完成，图片不会上传。',
    heading: '图片转 Base64',
    lead: '适合把图标、小贴纸直接内联进页面，省掉一次请求。文件越大 Base64 越长（约为原文件的 1.37 倍），建议控制在 50 KB 以内。',
    dropTitle: '拖入图片，或点击选择',
    dropHint: '支持 PNG / JPEG / WebP / GIF / SVG，不上传',
    resultTitle: '转换结果',
    rawLabel: 'Data URI',
    cssLabel: 'CSS 用法',
    htmlLabel: 'HTML 用法',
    pick: '请选择一张图片',
    copy: '复制',
    copied: '已复制',
    sizeLine: (a, b) => `原文件 ${a}，Base64 文本 ${b}`,
    notice: '文件超过 200 KB，内联进页面会明显拖慢首屏，建议改用普通图片引用。',
    faqTitle: '说明',
    faq: [
      'Base64 编码会让体积增大约 37%，换来的是「零额外请求」。',
      '适合小图标、加载占位图、邮件模板；不适合照片和超过 100 KB 的图。',
      'SVG 直接内联更省，Base64 会失去可读性。',
      '转换结果只存在于当前页面，刷新即清除。',
    ],
  },
  en: {
    title: 'Image to Base64',
    description:
      'Turn an image into a Base64 data URI you can inline in HTML, CSS or Markdown. Everything runs in your browser; nothing is uploaded.',
    heading: 'Image to Base64',
    lead: 'Handy for inlining icons and small stickers to save a request. Base64 is about 1.37× the original size, so keep files under roughly 50 KB.',
    dropTitle: 'Drop an image, or click to choose',
    dropHint: 'PNG / JPEG / WebP / GIF / SVG — no upload',
    resultTitle: 'Result',
    rawLabel: 'Data URI',
    cssLabel: 'CSS usage',
    htmlLabel: 'HTML usage',
    pick: 'Choose an image first',
    copy: 'Copy',
    copied: 'Copied',
    sizeLine: (a, b) => `Original ${a}, Base64 text ${b}`,
    notice: 'This file is over 200 KB. Inlining it will noticeably slow the first paint — link it as a normal image instead.',
    faqTitle: 'Notes',
    faq: [
      'Base64 adds about 37% to the size, in exchange for zero extra requests.',
      'Great for small icons, placeholders and email templates; poor for photos or anything over 100 KB.',
      'For SVG, inline the markup itself — Base64 only makes it opaque.',
      'Nothing is stored: reloading the page clears the result.',
    ],
  },
};

export default function ImageBase64Page() {
  const {i18n} = useDocusaurusContext();
  const copy = i18n.currentLocale === 'en' ? COPY.en : COPY.zh;

  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState('');
  const [error, setError] = useState('');

  const handleFile = useCallback((file) => {
    if (!file) return;
    setError('');
    if (!file.type.startsWith('image/')) {
      setError('请选择图片文件 / Please choose an image file');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUri = String(reader.result || '');
      setResult({name: file.name, size: file.size, dataUri});
    };
    reader.onerror = () => setError('读取失败 / Failed to read the file');
    reader.readAsDataURL(file);
  }, []);

  const handleCopy = async (key, text) => {
    const ok = await copyText(text);
    if (ok) {
      setCopied(key);
      window.setTimeout(() => setCopied(''), 1400);
    }
  };

  const mime = result ? result.dataUri.slice(5, result.dataUri.indexOf(';')) : '';
  const snippets = result
    ? [
        {key: 'raw', label: copy.rawLabel, text: result.dataUri},
        {key: 'css', label: copy.cssLabel, text: `background-image: url("${result.dataUri}");`},
        {key: 'html', label: copy.htmlLabel, text: `<img src="${result.dataUri}" alt="" />`},
      ]
    : [];

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
            🖼️
          </span>
          <span className={styles.dropTitle}>{copy.dropTitle}</span>
          <span className={styles.dropHint}>{copy.dropHint}</span>
        </div>

        {error ? <p className={styles.notice}>{error}</p> : null}

        {result ? (
          <>
            <p className={styles.summary} style={{marginTop: '1rem'}}>
              {copy.sizeLine(formatBytes(result.size), formatBytes(result.dataUri.length))} · {mime}
            </p>
            {result.size > 200 * 1024 ? <p className={styles.notice}>{copy.notice}</p> : null}

            <Heading as="h2" className={styles.faqTitle} style={{marginTop: '1.5rem'}}>
              {copy.resultTitle}
            </Heading>
            {snippets.map((snippet) => (
              <div key={snippet.key} style={{marginTop: '1rem'}}>
                <div className={styles.copyRow}>
                  <strong style={{fontSize: '0.85rem'}}>{snippet.label}</strong>
                  <button
                    type="button"
                    className="button button--secondary button--sm"
                    onClick={() => handleCopy(snippet.key, snippet.text)}
                  >
                    {copied === snippet.key ? copy.copied : copy.copy}
                  </button>
                </div>
                <textarea
                  className={styles.textarea}
                  readOnly
                  value={snippet.text}
                  spellCheck={false}
                  onFocus={(event) => event.target.select()}
                />
              </div>
            ))}
          </>
        ) : (
          <p className={styles.fieldHint} style={{marginTop: '1rem'}}>
            {copy.pick}
          </p>
        )}

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
