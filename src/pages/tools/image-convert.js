import React, {useCallback, useEffect, useRef, useState} from 'react';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import styles from './shared.module.css';

const MAX_FILES = 20;
const MAX_FILE_BYTES = 25 * 1024 * 1024;

const FORMATS = [
  {value: 'webp', label: 'WebP', ext: 'webp'},
  {value: 'jpeg', label: 'JPEG', ext: 'jpg'},
  {value: 'png', label: 'PNG', ext: 'png'},
];

let seq = 0;

export default function ImageConvertPage() {
  const [items, setItems] = useState([]);
  const [format, setFormat] = useState('webp');
  const [quality, setQuality] = useState(85);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const inputRef = useRef(null);
  const itemsRef = useRef(items);
  const urlsRef = useRef(new Set());

  itemsRef.current = items;

  useEffect(
    () => () => {
      urlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      urlsRef.current.clear();
    },
    [],
  );

  const patch = useCallback((id, value) => {
    setItems((current) => current.map((item) => (item.id === id ? {...item, ...value} : item)));
  }, []);

  const addFiles = useCallback((fileList) => {
    const incoming = Array.from(fileList ?? []);
    const accepted = [];
    const rejected = [];
    let count = itemsRef.current.length;

    for (const file of incoming) {
      if (!file.type.startsWith('image/')) {
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
      seq += 1;
      accepted.push({id: `c-${seq}`, file, name: file.name, size: file.size, status: 'pending', result: null, error: null});
    }

    setNotice(
      rejected.length ? `已跳过 ${rejected.length} 个文件：${rejected.slice(0, 3).join('、')}` : '',
    );
    if (accepted.length > 0) {
      setItems((current) => [...current, ...accepted]);
    }
  }, []);

  const clearAll = useCallback(() => {
    urlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    urlsRef.current.clear();
    setItems([]);
    setNotice('');
  }, []);

  const run = useCallback(async () => {
    const queue = itemsRef.current.filter((item) => item.status !== 'done');
    if (queue.length === 0) {
      return;
    }
    setBusy(true);
    const {compressImage} = await import('@site/src/lib/imageCompressor');
    const target = FORMATS.find((item) => item.value === format);

    const worker = async () => {
      while (queue.length > 0) {
        const item = queue.shift();
        patch(item.id, {status: 'working', error: null});
        try {
          const result = await compressImage(item.file, {format, quality, maxEdge: 0});
          const url = URL.createObjectURL(result.blob);
          urlsRef.current.add(url);
          patch(item.id, {
            status: 'done',
            result: {
              url,
              size: result.blob.size,
              width: result.width,
              height: result.height,
              downloadName: `${item.name.replace(/\.[^.]+$/, '')}.${target.ext}`,
            },
          });
        } catch (error) {
          patch(item.id, {status: 'error', error: error instanceof Error ? error.message : '转换失败'});
        }
      }
    };

    await Promise.all([worker(), worker()]);
    setBusy(false);
  }, [format, patch, quality]);

  const pending = items.filter((item) => item.status !== 'done').length;

  return (
    <Layout
      title="图片格式转换"
      description="在浏览器里把图片转成 WebP / JPEG / PNG，不上传、不注册。">
      <main className={styles.page}>
        <header className={styles.header}>
          <Heading as="h1" className={styles.title}>
            图片格式转换
          </Heading>
          <p className={styles.lead}>
            选图，挑一个目标格式，转换完直接下载。全程在浏览器里完成，图片不会上传。
          </p>
          <p className={styles.badgeRow}>
            <span className={styles.badge}>🔒 本地处理</span>
            <span className={styles.badge}>🚫 无上传</span>
            <span className={styles.badge}>🖼️ 最多 20 张</span>
          </p>
        </header>

        <label className={styles.dropzone}>
          <input
            ref={inputRef}
            className={styles.fileInput}
            type="file"
            accept="image/*"
            multiple
            onChange={(event) => {
              addFiles(event.target.files);
              if (inputRef.current) inputRef.current.value = '';
            }}
          />
          <span className={styles.dropIcon} aria-hidden="true">🔄</span>
          <span className={styles.dropTitle}>点击选择图片，或拖拽到这里</span>
          <span className={styles.dropHint}>支持 JPG / PNG / WebP，单张不超过 25 MB</span>
        </label>

        <section className={styles.settings} aria-label="转换设置">
          <label className={styles.field}>
            <span className={styles.fieldLabel}>目标格式</span>
            <select className={styles.select} value={format} onChange={(event) => setFormat(event.target.value)}>
              {FORMATS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>
              质量 <span>{quality}</span>
            </span>
            <input
              className={styles.range}
              type="range"
              min="50"
              max="95"
              value={quality}
              disabled={format === 'png'}
              onChange={(event) => setQuality(Number(event.target.value))}
            />
            <span className={styles.fieldHint}>
              {format === 'png' ? 'PNG 为无损导出，质量参数不生效' : '转 WebP 建议 80–90'}
            </span>
          </label>
        </section>

        <div className={styles.toolbar}>
          <button type="button" className="button button--primary" onClick={run} disabled={busy || pending === 0}>
            {busy ? '转换中…' : pending > 0 ? `开始转换（${pending}）` : '开始转换'}
          </button>
          <button type="button" className="button button--secondary" onClick={clearAll} disabled={busy || items.length === 0}>
            清空
          </button>
        </div>

        {notice && <p className={styles.notice} role="status">{notice}</p>}

        {items.length > 0 && (
          <ul className={styles.list}>
            {items.map((item) => (
              <li key={item.id} className={styles.item}>
                <div className={styles.itemMain}>
                  <span className={styles.itemName}>{item.name}</span>
                  <span className={styles.itemMeta}>
                    {item.size < 1024 ? `${item.size} B` : `${Math.round(item.size / 1024)} KB`}
                    {item.status === 'done' && item.result && (
                      <> {' → '} {Math.round(item.result.size / 1024)} KB</>
                    )}
                  </span>
                  {item.status === 'working' && <span className={styles.itemStatus}>转换中…</span>}
                  {item.status === 'error' && <span className={styles.itemError}>{item.error}</span>}
                </div>
                <div className={styles.itemActions}>
                  {item.status === 'done' && item.result && (
                    <a className="button button--primary button--sm" href={item.result.url} download={item.result.downloadName}>
                      下载
                    </a>
                  )}
                  <button
                    type="button"
                    className={styles.removeButton}
                    aria-label={`移除 ${item.name}`}
                    onClick={() => {
                      if (item.result?.url) URL.revokeObjectURL(item.result.url);
                      setItems((current) => current.filter((entry) => entry.id !== item.id));
                    }}>
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
            <li>转换会重新编码图片，JPEG / WebP 为有损，PNG 为无损。</li>
            <li>透明背景转 JPEG 时会自动填充白色。</li>
            <li>整个过程没有网络请求，清理浏览器缓存不会留下文件。</li>
          </ul>
        </section>
      </main>
    </Layout>
  );
}
