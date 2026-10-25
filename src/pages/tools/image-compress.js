import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import styles from './image-compress.module.css';

const MAX_FILES = 20;
const MAX_FILE_BYTES = 25 * 1024 * 1024;
const CONCURRENCY = 2;

const FORMAT_OPTIONS = [
  {value: 'auto', label: '保持原格式'},
  {value: 'webp', label: 'WebP（体积最小）'},
  {value: 'jpeg', label: 'JPEG'},
  {value: 'png', label: 'PNG（无损优化）'},
];

const MAX_EDGE_OPTIONS = [
  {value: 0, label: '不缩放'},
  {value: 1920, label: '长边 1920px'},
  {value: 1600, label: '长边 1600px'},
  {value: 1200, label: '长边 1200px'},
  {value: 800, label: '长边 800px'},
];

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

  itemsRef.current = items;

  useEffect(() => {
    return () => {
      urlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      urlsRef.current.clear();
    };
  }, []);

  const patchItem = useCallback((id, patch) => {
    setItems((current) => current.map((item) => (item.id === id ? {...item, ...patch} : item)));
  }, []);

  const addFiles = useCallback(
    (fileList) => {
      const incoming = Array.from(fileList ?? []);
      const accepted = [];
      const rejected = [];

      setItems((current) => {
        let count = current.length;
        for (const file of incoming) {
          const isImage = file.type.startsWith('image/');
          if (!isImage) {
            rejected.push(`${file.name}（不是图片）`);
            continue;
          }
          if (file.size > MAX_FILE_BYTES) {
            rejected.push(`${file.name}（超过 25 MB）`);
            continue;
          }
          if (count >= MAX_FILES) {
            rejected.push(`${file.name}（最多 ${MAX_FILES} 张）`);
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
        return accepted.length ? [...current, ...accepted] : current;
      });

      setNotice(
        rejected.length
          ? `已跳过 ${rejected.length} 个文件：${rejected.slice(0, 3).join('、')}${rejected.length > 3 ? ' 等' : ''}`
          : '',
      );
    },
    [],
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

  const runCompression = useCallback(async () => {
    const queue = itemsRef.current.filter(
      (item) => item.status === 'pending' || item.status === 'error',
    );
    if (queue.length === 0) {
      return;
    }

    setBusy(true);
    setNotice('');

    const {compressImage, buildOutputName} = await import('@site/src/lib/imageCompressor');

    const worker = async () => {
      while (queue.length > 0) {
        const item = queue.shift();
        patchItem(item.id, {status: 'working', error: null});
        try {
          const result = await compressImage(item.file, {format, quality, maxEdge});
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
            },
          });
        } catch (error) {
          patchItem(item.id, {
            status: 'error',
            error: error instanceof Error ? error.message : '压缩失败',
          });
        }
      }
    };

    await Promise.all(Array.from({length: CONCURRENCY}, worker));
    setBusy(false);
  }, [format, maxEdge, patchItem, quality]);

  const stats = useMemo(() => {
    const done = items.filter((item) => item.status === 'done' && item.result);
    const before = done.reduce((sum, item) => sum + item.size, 0);
    const after = done.reduce((sum, item) => sum + item.result.size, 0);
    return {count: done.length, before, after, saved: savingPercent(before, after)};
  }, [items]);

  const pendingCount = items.filter(
    (item) => item.status === 'pending' || item.status === 'error',
  ).length;

  const qualityDisabled = format === 'png';

  return (
    <Layout
      title="在线图片压缩"
      description="在浏览器里压缩图片：图片不会上传到任何服务器，支持 WebP / JPEG / PNG，批量处理。">
      <main className={styles.page}>
        <div className={styles.header}>
          <Heading as="h1" className={styles.title}>
            在线图片压缩
          </Heading>
          <p className={styles.lead}>
            选图、压缩、下载。图片全程留在你的浏览器里，
            <strong>不会上传到任何服务器</strong>，也不需要注册。
          </p>
          <p className={styles.badgeRow}>
            <span className={styles.badge}>🔒 本地处理</span>
            <span className={styles.badge}>🚫 无上传</span>
            <span className={styles.badge}>📦 WASM 编码器</span>
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
          <span className={styles.dropTitle}>点击选择图片，或拖拽到这里</span>
          <span className={styles.dropHint}>
            支持 JPG / PNG / WebP，最多 {MAX_FILES} 张，单张不超过 25 MB
          </span>
        </label>

        <section className={styles.settings} aria-label="压缩设置">
          <label className={styles.field}>
            <span className={styles.fieldLabel}>输出格式</span>
            <select
              className={styles.select}
              value={format}
              onChange={(event) => setFormat(event.target.value)}>
              {FORMAT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>
              质量 <output className={styles.value}>{quality}</output>
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
              {qualityDisabled ? 'PNG 走无损优化，质量参数不生效' : '数值越高越清晰，体积也越大'}
            </span>
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>最大尺寸</span>
            <select
              className={styles.select}
              value={maxEdge}
              onChange={(event) => setMaxEdge(Number(event.target.value))}>
              {MAX_EDGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <span className={styles.fieldHint}>超出时等比缩小，适合手机照片</span>
          </label>
        </section>

        <div className={styles.toolbar}>
          <button
            type="button"
            className="button button--primary"
            onClick={runCompression}
            disabled={busy || pendingCount === 0}>
            {busy ? '压缩中…' : pendingCount > 0 ? `开始压缩（${pendingCount}）` : '开始压缩'}
          </button>
          <button
            type="button"
            className="button button--secondary"
            onClick={clearAll}
            disabled={busy || items.length === 0}>
            清空
          </button>
          {stats.count > 0 && (
            <p className={styles.summary} aria-live="polite">
              已压缩 {stats.count} 张：{formatBytes(stats.before)} → {formatBytes(stats.after)}
              <strong className={styles.saved}> 省 {stats.saved}%</strong>
            </p>
          )}
        </div>

        {notice && (
          <p className={styles.notice} role="status">
            {notice}
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
                  {item.status === 'working' && <span className={styles.itemStatus}>压缩中…</span>}
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
                      下载
                    </a>
                  )}
                  <button
                    type="button"
                    className={styles.removeButton}
                    onClick={() => removeItem(item.id)}
                    aria-label={`移除 ${item.name}`}>
                    ✕
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <section className={styles.faq}>
          <h2 className={styles.faqTitle}>说明</h2>
          <ul className={styles.faqList}>
            <li>图片只在你自己的浏览器里解码、缩放、重新编码，页面不会发起任何上传请求。</li>
            <li>压缩会移除照片里的 EXIF（含拍摄地点等隐私信息），只保留像素数据。</li>
            <li>iPhone 的 HEIC 原图浏览器无法解码，会提示失败，请先在手机里导出成 JPG。</li>
            <li>PNG 选择「保持原格式」时走无损优化，像素完全不变；转 WebP/JPEG 才是有损压缩。</li>
          </ul>
        </section>
      </main>
    </Layout>
  );
}
