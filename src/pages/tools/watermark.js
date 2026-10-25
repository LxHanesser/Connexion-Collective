import React, {useCallback, useEffect, useRef, useState} from 'react';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import {canvasToBlob, createCanvas, downloadBlob, baseName, loadBitmap} from '@site/src/lib/imageTools';
import styles from './shared.module.css';

const POSITIONS = [
  {value: 'top-left', zh: '左上', en: 'Top left'},
  {value: 'top-center', zh: '上中', en: 'Top center'},
  {value: 'top-right', zh: '右上', en: 'Top right'},
  {value: 'middle-left', zh: '左中', en: 'Middle left'},
  {value: 'center', zh: '居中', en: 'Center'},
  {value: 'middle-right', zh: '右中', en: 'Middle right'},
  {value: 'bottom-left', zh: '左下', en: 'Bottom left'},
  {value: 'bottom-center', zh: '下中', en: 'Bottom center'},
  {value: 'bottom-right', zh: '右下', en: 'Bottom right'},
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
  const {i18n} = useDocusaurusContext();
  const isEn = i18n.currentLocale === 'en';
  const t = (zh, en) => (isEn ? en : zh);

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

  const handleFile = useCallback(
    async (file) => {
      if (!file) return;
      try {
        const loaded = await loadBitmap(file);
        setBitmap(loaded);
        setFileName(file.name);
        setError('');
      } catch (loadError) {
        const message = loadError instanceof Error ? loadError.message : '';
        setError(
          message.includes('HEIC')
            ? t(
                message,
                'The browser cannot decode this image — it may be HEIC. Export it as JPG/PNG first.',
              )
            : t('读取图片失败', 'Could not read the image'),
        );
      }
    },
    [isEn],
  );

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
      setError(t('导出失败', 'Export failed'));
    } finally {
      setBusy(false);
    }
  }, [bitmap, fileName, format, options, isEn]);

  return (
    <Layout
      title={t('图片加水印', 'Image watermark')}
      description={t(
        '给图片加文字水印：位置、大小、透明度、颜色可调，浏览器本地处理。',
        'Add a text watermark with adjustable position, size, opacity, and colour — processed locally in your browser.',
      )}>
      <main className={styles.page}>
        <header className={styles.header}>
          <Heading as="h1" className={styles.title}>
            {t('图片加水印', 'Image watermark')}
          </Heading>
          <p className={styles.lead}>
            {t(
              '选一张图，输入水印文字，调好位置和透明度后下载。图片不会离开你的浏览器。',
              'Pick an image, type the watermark text, tune position and opacity, then download. The image never leaves your browser.',
            )}
          </p>
          <p className={styles.badgeRow}>
            <span className={styles.badge}>{t('🔒 本地处理', '🔒 Local processing')}</span>
            <span className={styles.badge}>{t('🎨 9 个位置', '🎨 9 positions')}</span>
            <span className={styles.badge}>{t('📐 按原图分辨率导出', '📐 Full-resolution export')}</span>
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
          <span className={styles.dropTitle}>
            {fileName || t('点击选择一张图片', 'Click to choose an image')}
          </span>
          <span className={styles.dropHint}>{t('支持 JPG / PNG / WebP', 'JPG / PNG / WebP')}</span>
        </label>

        <div className={`${styles.settings} ${styles.settingsTwo}`}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>{t('水印文字', 'Watermark text')}</span>
            <input className={styles.textInput} value={text} onChange={(event) => setText(event.target.value)} />
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>{t('位置', 'Position')}</span>
            <select className={styles.select} value={position} onChange={(event) => setPosition(event.target.value)}>
              {POSITIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {isEn ? item.en : item.zh}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>
              {t('字号（图片宽度的百分比）', 'Font size (% of image width)')} <span>{sizePct}%</span>
            </span>
            <input className={styles.range} type="range" min="2" max="12" step="0.5" value={sizePct} onChange={(event) => setSizePct(Number(event.target.value))} />
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>
              {t('透明度', 'Opacity')} <span>{Math.round(opacity * 100)}%</span>
            </span>
            <input className={styles.range} type="range" min="0.1" max="1" step="0.05" value={opacity} onChange={(event) => setOpacity(Number(event.target.value))} />
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>{t('颜色', 'Colour')}</span>
            <input className={styles.textInput} type="color" value={color} onChange={(event) => setColor(event.target.value)} style={{padding: '0.25rem'}} />
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>{t('导出格式', 'Export format')}</span>
            <select className={styles.select} value={format} onChange={(event) => setFormat(event.target.value)}>
              <option value="image/jpeg">JPEG</option>
              <option value="image/png">PNG</option>
            </select>
          </label>
        </div>

        {error && <p className={styles.notice} role="status">{error}</p>}

        {bitmap && (
          <div className={styles.previewWrap}>
            <canvas ref={previewRef} className={styles.previewCanvas} aria-label={t('加水印预览', 'Watermark preview')} />
          </div>
        )}

        <div className={styles.toolbar}>
          <button type="button" className="button button--primary" onClick={handleDownload} disabled={!bitmap || busy}>
            {busy ? t('导出中…', 'Exporting…') : t('下载图片', 'Download image')}
          </button>
        </div>

        <section className={styles.faq}>
          <h2 className={styles.faqTitle}>{t('说明', 'Notes')}</h2>
          <ul className={styles.faqList}>
            {isEn ? (
              <>
                <li>The preview is scaled down; export draws the watermark at the original resolution.</li>
                <li>The text has a slight shadow so it stays readable on light backgrounds.</li>
                <li>JPEG fills transparent areas with black — use PNG for images with transparency.</li>
              </>
            ) : (
              <>
                <li>预览是缩小的版本，下载时按原图分辨率绘制水印。</li>
                <li>水印文字带轻微阴影，浅色背景上也能看清。</li>
                <li>转 JPEG 会把透明区域填充为黑色，建议透明图用 PNG。</li>
              </>
            )}
          </ul>
        </section>
      </main>
    </Layout>
  );
}
