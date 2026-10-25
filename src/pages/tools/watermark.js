import React, {useCallback, useEffect, useRef, useState} from 'react';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import {canvasToBlob, createCanvas, downloadBlob, baseName, loadBitmap} from '@site/src/lib/imageTools';
import styles from './shared.module.css';

const POSITIONS = [
  {value: 'top-left', label: '左上'},
  {value: 'top-center', label: '上中'},
  {value: 'top-right', label: '右上'},
  {value: 'middle-left', label: '左中'},
  {value: 'center', label: '居中'},
  {value: 'middle-right', label: '右中'},
  {value: 'bottom-left', label: '左下'},
  {value: 'bottom-center', label: '下中'},
  {value: 'bottom-right', label: '右下'},
];

function drawWatermark(ctx, width, height, {text, sizePct, opacity, color, position}) {
  if (!text.trim()) {
    return;
  }
  const fontSize = Math.max(10, Math.round((width * sizePct) / 100));
  const padding = Math.round(fontSize * 0.9);

  ctx.save();
  ctx.font = `700 ${fontSize}px system-ui, "Microsoft YaHei", "PingFang SC", sans-serif`;
  ctx.fillStyle = color;
  ctx.globalAlpha = opacity;
  ctx.textBaseline = 'top';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
  ctx.shadowBlur = Math.round(fontSize * 0.12);

  const textWidth = ctx.measureText(text).width;
  const textHeight = fontSize;

  let x = padding;
  let y = padding;

  if (position.includes('right')) x = width - textWidth - padding;
  if (position.includes('center') || position === 'center') x = (width - textWidth) / 2;
  if (position.includes('middle') || position === 'center') y = (height - textHeight) / 2;
  if (position.startsWith('bottom')) y = height - textHeight - padding;

  ctx.fillText(text, x, y);
  ctx.restore();
}

export default function WatermarkPage() {
  const [bitmap, setBitmap] = useState(null);
  const [fileName, setFileName] = useState('');
  const [text, setText] = useState('Connexion Collective');
  const [sizePct, setSizePct] = useState(4);
  const [opacity, setOpacity] = useState(0.75);
  const [color, setColor] = useState('#ffffff');
  const [position, setPosition] = useState('bottom-right');
  const [format, setFormat] = useState('image/jpeg');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const previewRef = useRef(null);

  const options = {text, sizePct, opacity, color, position};

  const renderPreview = useCallback(() => {
    const canvas = previewRef.current;
    if (!canvas || !bitmap) {
      return;
    }
    const maxWidth = 640;
    const scale = Math.min(1, maxWidth / bitmap.width);
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, 0, 0, width, height);
    drawWatermark(ctx, width, height, options);
  }, [bitmap, options]);

  useEffect(() => {
    const timer = setTimeout(renderPreview, 120);
    return () => clearTimeout(timer);
  }, [renderPreview]);

  const handleFile = useCallback(async (file) => {
    if (!file) return;
    try {
      const loaded = await loadBitmap(file);
      setBitmap(loaded);
      setFileName(file.name);
      setError('');
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '读取图片失败');
    }
  }, []);

  const handleDownload = useCallback(async () => {
    if (!bitmap) return;
    setBusy(true);
    try {
      const canvas = createCanvas(bitmap.width, bitmap.height);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(bitmap, 0, 0);
      drawWatermark(ctx, bitmap.width, bitmap.height, options);
      const blob = await canvasToBlob(canvas, format, format === 'image/jpeg' ? 0.92 : undefined);
      const ext = format === 'image/jpeg' ? 'jpg' : 'png';
      downloadBlob(blob, `${baseName(fileName || 'image')}-watermark.${ext}`);
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : '导出失败');
    } finally {
      setBusy(false);
    }
  }, [bitmap, fileName, format, options]);

  return (
    <Layout
      title="图片加水印"
      description="给图片加文字水印：位置、大小、透明度、颜色可调，浏览器本地处理。">
      <main className={styles.page}>
        <header className={styles.header}>
          <Heading as="h1" className={styles.title}>
            图片加水印
          </Heading>
          <p className={styles.lead}>
            选一张图，输入水印文字，调好位置和透明度后下载。图片不会离开你的浏览器。
          </p>
          <p className={styles.badgeRow}>
            <span className={styles.badge}>🔒 本地处理</span>
            <span className={styles.badge}>🎨 9 个位置</span>
            <span className={styles.badge}>📐 按原图分辨率导出</span>
          </p>
        </header>

        <label className={styles.dropzone}>
          <input
            className={styles.fileInput}
            type="file"
            accept="image/*"
            onChange={(event) => {
              handleFile(event.target.files?.[0]);
              event.target.value = '';
            }}
          />
          <span className={styles.dropIcon} aria-hidden="true">💧</span>
          <span className={styles.dropTitle}>{fileName || '点击选择一张图片'}</span>
          <span className={styles.dropHint}>支持 JPG / PNG / WebP</span>
        </label>

        <div className={`${styles.settings} ${styles.settingsTwo}`}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>水印文字</span>
            <input className={styles.textInput} value={text} onChange={(event) => setText(event.target.value)} />
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>位置</span>
            <select className={styles.select} value={position} onChange={(event) => setPosition(event.target.value)}>
              {POSITIONS.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>字号（图片宽度的百分比） <span>{sizePct}%</span></span>
            <input className={styles.range} type="range" min="2" max="12" step="0.5" value={sizePct} onChange={(event) => setSizePct(Number(event.target.value))} />
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>透明度 <span>{Math.round(opacity * 100)}%</span></span>
            <input className={styles.range} type="range" min="0.1" max="1" step="0.05" value={opacity} onChange={(event) => setOpacity(Number(event.target.value))} />
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>颜色</span>
            <input className={styles.textInput} type="color" value={color} onChange={(event) => setColor(event.target.value)} style={{padding: '0.25rem'}} />
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>导出格式</span>
            <select className={styles.select} value={format} onChange={(event) => setFormat(event.target.value)}>
              <option value="image/jpeg">JPEG</option>
              <option value="image/png">PNG</option>
            </select>
          </label>
        </div>

        {error && <p className={styles.notice} role="status">{error}</p>}

        {bitmap && (
          <div className={styles.previewWrap}>
            <canvas ref={previewRef} className={styles.previewCanvas} aria-label="加水印预览" />
          </div>
        )}

        <div className={styles.toolbar}>
          <button type="button" className="button button--primary" onClick={handleDownload} disabled={!bitmap || busy}>
            {busy ? '导出中…' : '下载图片'}
          </button>
        </div>

        <section className={styles.faq}>
          <h2 className={styles.faqTitle}>说明</h2>
          <ul className={styles.faqList}>
            <li>预览是缩小的版本，下载时按原图分辨率绘制水印。</li>
            <li>水印文字带轻微阴影，浅色背景上也能看清。</li>
            <li>转 JPEG 会把透明区域填充为黑色，建议透明图用 PNG。</li>
          </ul>
        </section>
      </main>
    </Layout>
  );
}
