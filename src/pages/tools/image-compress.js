import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import styles from './image-compress.module.css';

const MAX_FILES = 20;
const MAX_FILE_BYTES = 25 * 1024 * 1024;
const CONCURRENCY = 2;

const COPY = {
  zh: {
    title: '在线图片压缩',
    description:
      '在浏览器里压缩图片：图片不会上传到任何服务器，支持 WebP / JPEG / PNG，批量处理。',
    heading: '在线图片压缩',
    leadBefore: '选图、压缩、下载。图片全程留在你的浏览器里，',
    leadStrong: '不会上传到任何服务器',
    leadAfter: '，也不需要注册。',
    badges: ['🔒 本地处理', '🚫 无上传', '📦 WASM 编码器'],
    dropTitle: '点击选择图片，或拖拽到这里',
    dropHint: `支持 JPG / PNG / WebP，最多 ${MAX_FILES} 张，单张不超过 25 MB`,
    formatLabel: '输出格式',
    qualityLabel: '质量',
    sizeLabel: '最大尺寸',
    qualityHint: '数值越高越清晰，体积也越大',
    qualityDisabledHint: 'PNG 走无损优化，质量参数不生效',
    sizeHint: '超出时等比缩小，适合手机照片',
    formats: [
      {value: 'auto', label: '保持原格式'},
      {value: 'webp', label: 'WebP（体积最小）'},
      {value: 'jpeg', label: 'JPEG'},
      {value: 'png', label: 'PNG（无损优化）'},
    ],
    sizes: [
      {value: 0, label: '不缩放'},
      {value: 1920, label: '长边 1920px'},
      {value: 1600, label: '长边 1600px'},
      {value: 1200, label: '长边 1200px'},
      {value: 800, label: '长边 800px'},
    ],
    start: (count) => `开始压缩（${count}）`,
    startIdle: '开始压缩',
    recompress: '重新压缩',
    running: '压缩中…',
    clear: '清空',
    summary: (count, before, after, saved) => `已压缩 ${count} 张：${before} → ${after} 省 ${saved}%`,
    skipped: (count, list, more) => `已跳过 ${count} 个文件：${list}${more ? ' 等' : ''}`,
    stale: (count) => `设置已修改：点「重新压缩」按当前参数重跑 ${count} 张图。`,
    download: '下载',
    remove: (name) => `移除 ${name}`,
    workingItem: '压缩中…',
    failed: '压缩失败',
    faqTitle: '说明',
    faq: [
      '图片只在你自己的浏览器里解码、缩放、重新编码，页面不会发起任何上传请求。',
      '压缩会移除照片里的 EXIF（含拍摄地点等隐私信息），只保留像素数据。',
      'iPhone 的 HEIC 原图浏览器无法解码，会提示失败，请先在手机里导出成 JPG。',
      'PNG 选择「保持原格式」时走无损优化，像素完全不变；转 WebP/JPEG 才是有损压缩。',
    ],
    bytes: (value) => `${value} B`,
    kilo: (value) => `${value} KB`,
  },
  en: {
    title: 'Image compression',
    description:
      'Compress images in your browser — nothing is uploaded. Supports WebP, JPEG, and PNG with batch processing.',
    heading: 'Image compression',
    leadBefore: 'Pick images, compress, download. Everything stays in your browser and ',
    leadStrong: 'never touches a server',
    leadAfter: '. No sign-up either.',
    badges: ['🔒 Local processing', '🚫 No uploads', '📦 WASM encoders'],
    dropTitle: 'Click to choose images, or drop them here',
    dropHint: `JPG / PNG / WebP, up to ${MAX_FILES} files, 25 MB each`,
    formatLabel: 'Output format',
    qualityLabel: 'Quality',
    sizeLabel: 'Max dimension',
    qualityHint: 'Higher means sharper and larger',
    qualityDisabledHint: 'PNG uses lossless optimisation; quality does not apply',
    sizeHint: 'Larger images are scaled down proportionally',
    formats: [
      {value: 'auto', label: 'Keep original format'},
      {value: 'webp', label: 'WebP (smallest)'},
      {value: 'jpeg', label: 'JPEG'},
      {value: 'png', label: 'PNG (lossless optimisation)'},
    ],
    sizes: [
      {value: 0, label: 'No scaling'},
      {value: 1920, label: 'Long edge 1920px'},
      {value: 1600, label: 'Long edge 1600px'},
      {value: 1200, label: 'Long edge 1200px'},
      {value: 800, label: 'Long edge 800px'},
    ],
    start: (count) => `Compress (${count})`,
    startIdle: 'Compress',
    recompress: 'Recompress',
    running: 'Compressing…',
    clear: 'Clear',
    summary: (count, before, after, saved) => `${count} done: ${before} → ${after}, saved ${saved}%`,
    skipped: (count, list, more) => `Skipped ${count} file(s): ${list}${more ? ' …' : ''}`,
    stale: (count) => `Settings changed — click “Recompress” to rerun ${count} image(s) with the current settings.`,
    download: 'Download',
    remove: (name) => `Remove ${name}`,
    workingItem: 'Compressing…',
    failed: 'Compression failed',
    faqTitle: 'Notes',
    faq: [
      'Images are decoded, resized, and re-encoded inside your browser; the page never sends an upload request.',
      'Compression strips EXIF metadata (including location) and keeps only pixel data.',
      'Browsers cannot decode HEIC photos from iPhones; export as JPG first.',
      'With “Keep original format”, PNG goes through lossless optimisation and pixels do not change; converting to WebP or JPEG is lossy.',
    ],
    bytes: (value) => `${value} B`,
    kilo: (value) => `${value} KB`,
  },
};

let itemSeq = 0;

function nextId() {
  itemSeq += 1;
  return `img-${itemSeq}`;
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const value = bytes / 1024 ** index;
  return `${value >= 10 || index === 0 ? Math.round(value) : value.toFixed(1)} ${units[index]}`;
}

function savingPercent(before, after) {
  if (!before || before <= 0) return 0;
  return Math.max(0, Math.round((1 - after / before) * 100));
}

export default function ImageCompressPage() {
  const {i18n} = useDocusaurusContext();
  const isEn = i18n.currentLocale === 'en';
  const copy = isEn ? COPY.en : COPY.zh;

  const [items, setItems] = useState([]);
  const [format, setFormat] = useState('auto');
  const [quality, setQuality] = useState(75);
  const [maxEdge, setMaxEdge] = useState(1920);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef(null);
  const itemsRef = useRef(items);
  const urlsRef = useRef(new Set());
  const formatRef = useRef(format);

  itemsRef.current = items;
  formatRef.current = format;

  useEffect(() => {
    return () => {
      urlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      urlsRef.current.clear();
    };
  }, []);

  const patchItem = useCallback((id, patch) => {
    setItems((current) => current.map((item) => (item.id === id ? {...item, ...patch} : item)));
  }, []);

  const prewarm = useCallback(async (sample) => {
    if (!sample) {
      return;
    }
    try {
      const {warmup} = await import('@site/src/lib/imageCompressor');
      await warmup(formatRef.current, sample.type || 'image/jpeg');
    } catch {
      // 预热失败不提示，正式压缩时会再试一次并给出错误
    }
  }, []);

  useEffect(() => {
    if (busy || items.length === 0) {
      return undefined;
    }
    const timer = setTimeout(() => {
      void prewarm(itemsRef.current[0]?.file);
    }, 500);
    return () => clearTimeout(timer);
  }, [busy, format, items.length, prewarm]);

  const addFiles = useCallback(
    (fileList) => {
      const incoming = Array.from(fileList ?? []);
      const current = itemsRef.current;
      const accepted = [];
      const rejected = [];
      let count = current.length;

      for (const file of incoming) {
        if (!file.type.startsWith('image/')) {
          rejected.push(`${file.name}${isEn ? ' (not an image)' : '（不是图片）'}`);
          continue;
        }
        if (file.size > MAX_FILE_BYTES) {
          rejected.push(`${file.name}${isEn ? ' (over 25 MB)' : '（超过 25 MB）'}`);
          continue;
        }
        if (count >= MAX_FILES) {
          rejected.push(`${file.name}${isEn ? ` (max ${MAX_FILES} files)` : `（最多 ${MAX_FILES} 张）`}`);
          continue;
        }
        count += 1;
        accepted.push({
          id: nextId(),
          file,
          name: file.name,
          size: file.size,
          status: 'pending',
          result: null,
          error: null,
        });
      }

      setNotice(
        rejected.length
          ? copy.skipped(rejected.length, rejected.slice(0, 3).join(isEn ? ', ' : '、'), rejected.length > 3)
          : '',
      );

      if (accepted.length === 0) {
        return;
      }

      setItems([...current, ...accepted]);
      void prewarm(accepted[0].file);
    },
    [copy, isEn, prewarm],
  );

  const handleDrop = useCallback(
    (event) => {
      event.preventDefault();
      setDragActive(false);
      addFiles(event.dataTransfer?.files);
    },
    [addFiles],
  );

  const handleInputChange = useCallback(
    (event) => {
      addFiles(event.target.files);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    },
    [addFiles],
  );

  const removeItem = useCallback((id) => {
    setItems((current) => {
      const target = current.find((item) => item.id === id);
      if (target?.result?.url) {
        URL.revokeObjectURL(target.result.url);
        urlsRef.current.delete(target.result.url);
      }
      return current.filter((item) => item.id !== id);
    });
  }, []);

  const clearAll = useCallback(() => {
    setItems([]);
    urlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    urlsRef.current.clear();
    setNotice('');
  }, []);

  const settingsKey = useMemo(() => `${format}:${quality}:${maxEdge}`, [format, maxEdge, quality]);

  const runCompression = useCallback(async () => {
    const pendingItems = itemsRef.current.filter(
      (item) => item.status === 'pending' || item.status === 'error',
    );
    const isRecompress = pendingItems.length === 0;
    const queue = isRecompress ? [...itemsRef.current] : pendingItems;

    if (queue.length === 0) {
      return;
    }

    setBusy(true);
    setNotice('');

    if (isRecompress) {
      for (const item of itemsRef.current) {
        if (item.result?.url) {
          URL.revokeObjectURL(item.result.url);
          urlsRef.current.delete(item.result.url);
        }
      }
      setItems((current) =>
        current.map((item) => ({...item, status: 'working', error: null, result: null})),
      );
    }

    const {compressImage, buildOutputName} = await import('@site/src/lib/imageCompressor');

    const worker = async () => {
      while (queue.length > 0) {
        const item = queue.shift();
        patchItem(item.id, {status: 'working', error: null});
        try {
          const result = await compressImage(item.file, {format, quality, maxEdge, locale: isEn ? 'en' : 'zh'});
          const url = URL.createObjectURL(result.blob);
          urlsRef.current.add(url);
          patchItem(item.id, {
            status: 'done',
            result: {
              url,
              size: result.blob.size,
              width: result.width,
              height: result.height,
              engine: result.engine,
              note: result.note ?? '',
              downloadName: buildOutputName(item.file, result.format),
              settingsKey,
            },
          });
        } catch (error) {
          patchItem(item.id, {
            status: 'error',
            error: error instanceof Error ? error.message : copy.failed,
          });
        }
      }
    };

    await Promise.all(Array.from({length: CONCURRENCY}, worker));
    setBusy(false);
  }, [format, maxEdge, patchItem, quality, settingsKey, copy]);

  const stats = useMemo(() => {
    const done = items.filter((item) => item.status === 'done' && item.result);
    const before = done.reduce((sum, item) => sum + item.size, 0);
    const after = done.reduce((sum, item) => sum + item.result.size, 0);
    return {count: done.length, before, after, saved: savingPercent(before, after)};
  }, [items]);

  const pendingCount = items.filter(
    (item) => item.status === 'pending' || item.status === 'error',
  ).length;

  const doneCount = items.filter((item) => item.status === 'done').length;

  const staleCount = items.filter(
    (item) =>
      item.status === 'done' &&
      item.result?.settingsKey &&
      item.result.settingsKey !== settingsKey,
  ).length;

  const runLabel = busy
    ? copy.running
    : pendingCount > 0
      ? copy.start(pendingCount)
      : doneCount > 0
        ? copy.recompress
        : copy.startIdle;

  const qualityDisabled = format === 'png';

  return (
    <Layout title={copy.title} description={copy.description}>
      <main className={styles.page}>
        <div className={styles.header}>
          <Heading as="h1" className={styles.title}>
            {copy.heading}
          </Heading>
          <p className={styles.lead}>
            {copy.leadBefore}
            <strong>{copy.leadStrong}</strong>
            {copy.leadAfter}
          </p>
          <p className={styles.badgeRow}>
            {copy.badges.map((badge) => (
              <span key={badge} className={styles.badge}>
                {badge}
              </span>
            ))}
          </p>
        </div>

        <label
          className={`${styles.dropzone} ${dragActive ? styles.dropzoneActive : ''}`}
          onDragOver={(event) => {
            event.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}>
          <input
            ref={inputRef}
            className={styles.fileInput}
            type="file"
            accept="image/*"
            multiple
            onChange={handleInputChange}
          />
          <span className={styles.dropIcon} aria-hidden="true">
            🖼️
          </span>
          <span className={styles.dropTitle}>{copy.dropTitle}</span>
          <span className={styles.dropHint}>{copy.dropHint}</span>
        </label>

        <section className={styles.settings} aria-label={copy.formatLabel}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>{copy.formatLabel}</span>
            <select
              className={styles.select}
              value={format}
              onChange={(event) => setFormat(event.target.value)}>
              {copy.formats.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>
              {copy.qualityLabel} <output className={styles.value}>{quality}</output>
            </span>
            <input
              className={styles.range}
              type="range"
              min="40"
              max="95"
              step="1"
              value={quality}
              disabled={qualityDisabled}
              onChange={(event) => setQuality(Number(event.target.value))}
            />
            <span className={styles.fieldHint}>
              {qualityDisabled ? copy.qualityDisabledHint : copy.qualityHint}
            </span>
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>{copy.sizeLabel}</span>
            <select
              className={styles.select}
              value={maxEdge}
              onChange={(event) => setMaxEdge(Number(event.target.value))}>
              {copy.sizes.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <span className={styles.fieldHint}>{copy.sizeHint}</span>
          </label>
        </section>

        <div className={styles.toolbar}>
          <button
            type="button"
            className="button button--primary"
            onClick={runCompression}
            disabled={busy || items.length === 0}>
            {runLabel}
          </button>
          <button
            type="button"
            className="button button--secondary"
            onClick={clearAll}
            disabled={busy || items.length === 0}>
            {copy.clear}
          </button>
          {stats.count > 0 && (
            <p className={styles.summary} aria-live="polite">
              {copy.summary(
                stats.count,
                formatBytes(stats.before),
                formatBytes(stats.after),
                stats.saved,
              )}
            </p>
          )}
        </div>

        {notice && (
          <p className={styles.notice} role="status">
            {notice}
          </p>
        )}

        {staleCount > 0 && !busy && (
          <p className={styles.hint} role="status">
            {copy.stale(staleCount)}
          </p>
        )}

        {items.length > 0 && (
          <ul className={styles.list}>
            {items.map((item) => (
              <li key={item.id} className={styles.item}>
                <div className={styles.itemMain}>
                  <span className={styles.itemName} title={item.name}>
                    {item.name}
                  </span>
                  <span className={styles.itemMeta}>
                    {formatBytes(item.size)}
                    {item.status === 'done' && item.result && (
                      <>
                        {' → '}
                        <strong>{formatBytes(item.result.size)}</strong>
                        <em className={styles.saved}>
                          {' '}
                          -{savingPercent(item.size, item.result.size)}%
                        </em>
                      </>
                    )}
                  </span>
                  {item.status === 'working' && (
                    <span className={styles.itemStatus}>{copy.workingItem}</span>
                  )}
                  {item.status === 'error' && (
                    <span className={styles.itemError}>{item.error}</span>
                  )}
                  {item.status === 'done' && item.result?.note && (
                    <span className={styles.itemStatus}>{item.result.note}</span>
                  )}
                  {item.status === 'done' && item.result?.engine && (
                    <span className={styles.itemEngine}>{item.result.engine}</span>
                  )}
                </div>
                <div className={styles.itemActions}>
                  {item.status === 'done' && item.result && (
                    <a
                      className="button button--primary button--sm"
                      href={item.result.url}
                      download={item.result.downloadName}>
                      {copy.download}
                    </a>
                  )}
                  <button
                    type="button"
                    className={styles.removeButton}
                    onClick={() => removeItem(item.id)}
                    aria-label={copy.remove(item.name)}>
                    ✕
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <section className={styles.faq}>
          <h2 className={styles.faqTitle}>{copy.faqTitle}</h2>
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
