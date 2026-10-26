import React, {useCallback, useRef, useState} from 'react';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import {baseName, downloadBlob, formatBytes} from '@site/src/lib/imageTools';
import {createZip} from '@site/src/lib/zip';
import styles from './shared.module.css';

const COPY = {
  zh: {
    title: 'PDF 合并与拆分',
    description:
      '在浏览器里合并多个 PDF，或按页码范围拆分、把每页导出成单独文件。文件不会上传，全部本地处理。',
    heading: 'PDF 合并 / 拆分',
    lead: '合并时按列表顺序拼接；拆分支持页码区间（如 1-3,5）或每页单独导出为压缩包。所有处理都在你的浏览器里完成。',
    mergeTab: '合并',
    splitTab: '拆分',
    dropMulti: '拖入多个 PDF，或点击选择',
    dropOne: '拖入一个 PDF，或点击选择',
    dropHint: '仅支持 PDF 文件，不上传',
    files: '待合并文件',
    pages: (n) => `${n} 页`,
    merge: '合并并下载',
    split: '按范围拆分',
    splitEvery: '每页单独导出（ZIP）',
    rangeLabel: '页码范围',
    rangeHint: '例如 1-3,5,8-10；留空表示全部',
    working: '处理中…',
    remove: '移除',
    empty: '还没有选择文件',
    badRange: '页码范围无效，请检查是否超出总页数',
    encrypted: '这个 PDF 有密码保护，无法处理',
    notPdf: '请选择 PDF 文件',
    result: (n) => `完成，输出 ${n}`,
    faqTitle: '说明',
    faq: [
      '合并只是把页面按顺序复制到新文档，不会重新压缩画质。',
      '拆分是复制指定页，原有页面内容与矢量元素保持不变。',
      '每页单独导出会打成一个 ZIP，避免浏览器连续弹下载框。',
      '加密 PDF 需要先解密，本工具无法处理。',
    ],
  },
  en: {
    title: 'PDF merge & split',
    description:
      'Merge several PDFs, extract page ranges, or export every page as its own file — all in your browser with nothing uploaded.',
    heading: 'PDF merge / split',
    lead: 'Merging joins files in list order. Splitting accepts page ranges such as 1-3,5, or exports each page as a separate file in a ZIP. Everything runs locally.',
    mergeTab: 'Merge',
    splitTab: 'Split',
    dropMulti: 'Drop several PDFs, or click to choose',
    dropOne: 'Drop one PDF, or click to choose',
    dropHint: 'PDF files only — no upload',
    files: 'Files to merge',
    pages: (n) => `${n} page${n === 1 ? '' : 's'}`,
    merge: 'Merge and download',
    split: 'Extract range',
    splitEvery: 'Export each page (ZIP)',
    rangeLabel: 'Page range',
    rangeHint: 'e.g. 1-3,5,8-10 — leave empty for all',
    working: 'Working…',
    remove: 'Remove',
    empty: 'No files yet',
    badRange: 'Invalid page range — check the page count',
    encrypted: 'This PDF is password-protected and cannot be processed',
    notPdf: 'Please choose PDF files',
    result: (n) => `Done — ${n} written`,
    faqTitle: 'Notes',
    faq: [
      'Merging copies pages into a new document in order; quality is untouched.',
      'Splitting copies the selected pages, so vectors and content stay identical.',
      'Per-page export is bundled into one ZIP to avoid a download prompt per page.',
      'Encrypted PDFs must be decrypted first; this tool cannot open them.',
    ],
  },
};

function parseRanges(input, total) {
  const text = input.trim();
  if (!text) return Array.from({length: total}, (_, index) => index);
  const indices = [];
  for (const part of text.split(/[,，\s]+/).filter(Boolean)) {
    const match = part.match(/^(\d+)(?:\s*[-–]\s*(\d+))?$/);
    if (!match) return null;
    const start = Number(match[1]);
    const end = match[2] ? Number(match[2]) : start;
    if (start < 1 || end < start || end > total) return null;
    for (let page = start; page <= end; page += 1) {
      if (!indices.includes(page - 1)) indices.push(page - 1);
    }
  }
  return indices.length ? indices : null;
}

export default function PdfPage() {
  const {i18n} = useDocusaurusContext();
  const copy = i18n.currentLocale === 'en' ? COPY.en : COPY.zh;

  const [mode, setMode] = useState('merge');
  const [files, setFiles] = useState([]);
  const [range, setRange] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');
  const inputRef = useRef(null);

  const addFiles = useCallback(
    async (list) => {
      setError('');
      setDone('');
      const picked = Array.from(list || []).filter((file) => /pdf$/i.test(file.name) || file.type === 'application/pdf');
      if (!picked.length) {
        setError(copy.notPdf);
        return;
      }
      if (mode === 'split') {
        const file = picked[0];
        const bytes = new Uint8Array(await file.arrayBuffer());
        let pageCount = 0;
        try {
          const {PDFDocument} = await import('pdf-lib');
          const doc = await PDFDocument.load(bytes, {ignoreEncryption: false});
          pageCount = doc.getPageCount();
        } catch {
          setError(copy.encrypted);
          return;
        }
        setFiles([{file, bytes, pageCount}]);
        return;
      }
      const next = [...files];
      for (const file of picked) {
        const bytes = new Uint8Array(await file.arrayBuffer());
        let pageCount = 0;
        try {
          const {PDFDocument} = await import('pdf-lib');
          const doc = await PDFDocument.load(bytes, {ignoreEncryption: false});
          pageCount = doc.getPageCount();
        } catch {
          setError(copy.encrypted);
          return;
        }
        next.push({file, bytes, pageCount});
      }
      setFiles(next);
    },
    [copy.encrypted, copy.notPdf, files, mode],
  );

  const reset = () => {
    setFiles([]);
    setError('');
    setDone('');
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleMerge = async () => {
    if (files.length < 2) return;
    setBusy(true);
    setError('');
    setDone('');
    try {
      const {PDFDocument} = await import('pdf-lib');
      const out = await PDFDocument.create();
      for (const entry of files) {
        const source = await PDFDocument.load(entry.bytes, {ignoreEncryption: false});
        const pages = await out.copyPages(source, source.getPageIndices());
        pages.forEach((page) => out.addPage(page));
      }
      const bytes = await out.save();
      const blob = new Blob([bytes], {type: 'application/pdf'});
      downloadBlob(blob, `merged-${Date.now()}.pdf`);
      setDone(copy.result(formatBytes(blob.size)));
    } catch (err) {
      setError(String(err?.message || err));
    } finally {
      setBusy(false);
    }
  };

  const handleSplit = async (every) => {
    if (!files.length) return;
    setBusy(true);
    setError('');
    setDone('');
    try {
      const {PDFDocument} = await import('pdf-lib');
      const entry = files[0];
      const source = await PDFDocument.load(entry.bytes, {ignoreEncryption: false});
      const total = source.getPageCount();

      if (every) {
        const zipFiles = [];
        for (let index = 0; index < total; index += 1) {
          const out = await PDFDocument.create();
          const [page] = await out.copyPages(source, [index]);
          out.addPage(page);
          const bytes = await out.save();
          zipFiles.push({name: `${baseName(entry.file.name)}-p${index + 1}.pdf`, data: new Uint8Array(bytes)});
        }
        const zip = createZip(zipFiles);
        downloadBlob(zip, `${baseName(entry.file.name)}-pages.zip`);
        setDone(copy.result(formatBytes(zip.size)));
        return;
      }

      const indices = parseRanges(range, total);
      if (!indices) {
        setError(copy.badRange);
        return;
      }
      const out = await PDFDocument.create();
      const pages = await out.copyPages(source, indices);
      pages.forEach((page) => out.addPage(page));
      const bytes = await out.save();
      const blob = new Blob([bytes], {type: 'application/pdf'});
      downloadBlob(blob, `${baseName(entry.file.name)}-extract.pdf`);
      setDone(copy.result(formatBytes(blob.size)));
    } catch (err) {
      setError(String(err?.message || err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Layout title={copy.title} description={copy.description}>
      <main className={styles.page}>
        <header className={styles.header}>
          <Heading as="h1" className={styles.title}>
            {copy.heading}
          </Heading>
          <p className={styles.lead}>{copy.lead}</p>
        </header>

        <div className={styles.tabs} role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'merge'}
            className={`${styles.tab} ${mode === 'merge' ? styles.tabActive : ''}`}
            onClick={() => {
              setMode('merge');
              reset();
            }}
          >
            {copy.mergeTab}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'split'}
            className={`${styles.tab} ${mode === 'split' ? styles.tabActive : ''}`}
            onClick={() => {
              setMode('split');
              reset();
            }}
          >
            {copy.splitTab}
          </button>
        </div>

        <div
          className={styles.dropzone}
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              inputRef.current?.click();
            }
          }}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            addFiles(event.dataTransfer.files);
          }}
        >
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,.pdf"
            multiple={mode === 'merge'}
            className={styles.fileInput}
            onChange={(event) => addFiles(event.target.files)}
          />
          <span className={styles.dropIcon} aria-hidden="true">
            📄
          </span>
          <span className={styles.dropTitle}>{mode === 'merge' ? copy.dropMulti : copy.dropOne}</span>
          <span className={styles.dropHint}>{copy.dropHint}</span>
        </div>

        {error ? <p className={styles.notice}>{error}</p> : null}

        {files.length ? (
          <>
            <Heading as="h2" className={styles.faqTitle} style={{marginTop: '1.5rem'}}>
              {copy.files}
            </Heading>
            <ul className={styles.list}>
              {files.map((entry, index) => (
                <li key={`${entry.file.name}-${index}`} className={styles.item}>
                  <div className={styles.itemMain}>
                    <span className={styles.itemName}>{entry.file.name}</span>
                    <span className={styles.itemMeta}>
                      {copy.pages(entry.pageCount)} · {formatBytes(entry.file.size)}
                    </span>
                  </div>
                  <div className={styles.itemActions}>
                    <button
                      type="button"
                      className={styles.removeButton}
                      aria-label={copy.remove}
                      onClick={() => setFiles(files.filter((_, i) => i !== index))}
                    >
                      ×
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className={styles.fieldHint} style={{marginTop: '1rem'}}>
            {copy.empty}
          </p>
        )}

        {mode === 'split' && files.length ? (
          <div className={styles.settings}>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>{copy.rangeLabel}</span>
              <input
                className={styles.textInput}
                value={range}
                placeholder="1-3,5"
                onChange={(event) => setRange(event.target.value)}
              />
              <span className={styles.fieldHint}>{copy.rangeHint}</span>
            </label>
          </div>
        ) : null}

        <div className={styles.toolbar}>
          {mode === 'merge' ? (
            <button
              type="button"
              className="button button--primary"
              onClick={handleMerge}
              disabled={files.length < 2 || busy}
            >
              {busy ? copy.working : copy.merge}
            </button>
          ) : (
            <>
              <button
                type="button"
                className="button button--primary"
                onClick={() => handleSplit(false)}
                disabled={!files.length || busy}
              >
                {busy ? copy.working : copy.split}
              </button>
              <button
                type="button"
                className="button button--secondary"
                onClick={() => handleSplit(true)}
                disabled={!files.length || busy}
              >
                {copy.splitEvery}
              </button>
            </>
          )}
          {files.length ? (
            <button type="button" className="button button--secondary" onClick={reset}>
              ↺
            </button>
          ) : null}
        </div>

        {done ? <p className={styles.hint}>{done}</p> : null}

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
