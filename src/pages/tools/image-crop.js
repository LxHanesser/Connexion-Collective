import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import {canvasToBlob, createCanvas, downloadBlob, baseName, loadBitmap} from '@site/src/lib/imageTools';
import styles from './shared.module.css';
import local from './image-crop.module.css';

const ASPECTS = [
  {value: 'free', zh: '自由比例', en: 'Free ratio', ratio: null},
  {value: '1:1', zh: '1:1 方形', en: '1:1 square', ratio: 1},
  {value: '4:3', zh: '4:3', en: '4:3', ratio: 4 / 3},
  {value: '3:4', zh: '3:4', en: '3:4', ratio: 3 / 4},
  {value: '16:9', zh: '16:9', en: '16:9', ratio: 16 / 9},
];

const MAX_PREVIEW_WIDTH = 640;
const MAX_PREVIEW_HEIGHT = 460;

export default function ImageCropPage() {
  const {i18n} = useDocusaurusContext();
  const isEn = i18n.currentLocale === 'en';
  const t = (zh, en) => (isEn ? en : zh);

  const [bitmap, setBitmap] = useState(null);
  const [fileName, setFileName] = useState('');
  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [aspect, setAspect] = useState('free');
  const [crop, setCrop] = useState({x: 0, y: 0, w: 1, h: 1});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const canvasRef = useRef(null);
  const dragRef = useRef(null);

  const rotated = useMemo(() => {
    if (!bitmap) return null;
    const width = rotation % 180 === 0 ? bitmap.width : bitmap.height;
    const height = rotation % 180 === 0 ? bitmap.height : bitmap.width;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    ctx.translate(width / 2, height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    if (flipH) ctx.scale(-1, 1);
    ctx.drawImage(bitmap, -bitmap.width / 2, -bitmap.height / 2);
    return {canvas, width, height};
  }, [bitmap, flipH, rotation]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !rotated) return;
    const scale = Math.min(
      MAX_PREVIEW_WIDTH / rotated.width,
      MAX_PREVIEW_HEIGHT / rotated.height,
      1,
    );
    const width = Math.round(rotated.width * scale);
    const height = Math.round(rotated.height * scale);
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = 'rgba(15, 23, 42, 0.55)';
    ctx.fillRect(0, 0, width, height);

    const cx = crop.x * width;
    const cy = crop.y * height;
    const cw = crop.w * width;
    const ch = crop.h * height;

    ctx.save();
    ctx.beginPath();
    ctx.rect(cx, cy, cw, ch);
    ctx.clip();
    ctx.drawImage(rotated.canvas, 0, 0, width, height);
    ctx.restore();

    ctx.strokeStyle = '#25c2a0';
    ctx.lineWidth = 2;
    ctx.strokeRect(cx + 1, cy + 1, Math.max(cw - 2, 0), Math.max(ch - 2, 0));
  }, [crop, rotated]);

  useEffect(() => {
    draw();
  }, [draw]);

  const handleFile = useCallback(
    async (file) => {
      if (!file) return;
      try {
        const loaded = await loadBitmap(file);
        setBitmap(loaded);
        setFileName(file.name);
        setRotation(0);
        setFlipH(false);
        setCrop({x: 0, y: 0, w: 1, h: 1});
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

  const pointFromEvent = (event) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height)),
      rectW: rect.width,
      rectH: rect.height,
    };
  };

  const ratio = ASPECTS.find((item) => item.value === aspect)?.ratio ?? null;

  const handlePointerDown = (event) => {
    if (!rotated) return;
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // 合成事件或旧浏览器不支持指针捕获时忽略
    }
    const point = pointFromEvent(event);
    dragRef.current = point;
    setCrop({x: point.x, y: point.y, w: 0, h: 0});
  };

  const handlePointerMove = (event) => {
    const start = dragRef.current;
    if (!start || !rotated) return;
    const point = pointFromEvent(event);
    let x1 = Math.min(start.x, point.x);
    let y1 = Math.min(start.y, point.y);
    let x2 = Math.max(start.x, point.x);
    let y2 = Math.max(start.y, point.y);

    if (ratio) {
      const displayW = (x2 - x1) * point.rectW;
      const displayH = (y2 - y1) * point.rectH;
      const targetH = displayW / ratio;
      if (displayH > targetH) {
        y2 = y1 + targetH / point.rectH;
      } else {
        x2 = x1 + (displayH * ratio) / point.rectW;
      }
    }

    x2 = Math.min(1, x2);
    y2 = Math.min(1, y2);
    x1 = Math.min(x1, x2);
    y1 = Math.min(y1, y2);

    setCrop({x: x1, y: y1, w: Math.max(0.01, x2 - x1), h: Math.max(0.01, y2 - y1)});
  };

  const handlePointerUp = (event) => {
    dragRef.current = null;
    try {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    } catch {
      // 忽略不支持指针捕获的情况
    }
  };

  const resetCrop = () => setCrop({x: 0, y: 0, w: 1, h: 1});

  const handleDownload = useCallback(async () => {
    if (!rotated) return;
    setBusy(true);
    try {
      const sx = Math.round(crop.x * rotated.width);
      const sy = Math.round(crop.y * rotated.height);
      const sw = Math.max(1, Math.round(crop.w * rotated.width));
      const sh = Math.max(1, Math.round(crop.h * rotated.height));
      const out = createCanvas(sw, sh);
      out.getContext('2d').drawImage(rotated.canvas, sx, sy, sw, sh, 0, 0, sw, sh);
      const blob = await canvasToBlob(out, 'image/png');
      downloadBlob(blob, `${baseName(fileName || 'image')}-cropped.png`);
    } catch (downloadError) {
      setError(t('导出失败', 'Export failed'));
    } finally {
      setBusy(false);
    }
  }, [crop, fileName, rotated, isEn]);

  const outputSize = rotated
    ? {
        w: Math.round(crop.w * rotated.width),
        h: Math.round(crop.h * rotated.height),
      }
    : null;

  return (
    <Layout
      title={t('图片裁剪', 'Crop & rotate')}
      description={t(
        '在浏览器里裁剪、旋转、翻转图片，支持常用比例，图片不上传。',
        'Crop, rotate, and flip images in your browser with common aspect ratios. Nothing is uploaded.',
      )}>
      <main className={styles.page}>
        <header className={styles.header}>
          <Heading as="h1" className={styles.title}>
            {t('图片裁剪 / 旋转', 'Crop & rotate')}
          </Heading>
          <p className={styles.lead}>
            {t(
              '选图后在预览图上拖拽框出要保留的区域，可以旋转、翻转，最后导出 PNG。图片不上传。',
              'Pick an image, drag on the preview to select the area to keep, rotate or flip it, then export as PNG. Nothing is uploaded.',
            )}
          </p>
          <p className={styles.badgeRow}>
            <span className={styles.badge}>{t('🔒 本地处理', '🔒 Local processing')}</span>
            <span className={styles.badge}>{t('✋ 拖拽框选', '✋ Drag to select')}</span>
            <span className={styles.badge}>{t('📐 常用比例', '📐 Common ratios')}</span>
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
          <span className={styles.dropIcon} aria-hidden="true">✂️</span>
          <span className={styles.dropTitle}>
            {fileName || t('点击选择一张图片', 'Click to choose an image')}
          </span>
          <span className={styles.dropHint}>{t('支持 JPG / PNG / WebP', 'JPG / PNG / WebP')}</span>
        </label>

        {error && <p className={styles.notice} role="status">{error}</p>}

        {rotated && (
          <>
            <div className={local.canvasWrap}>
              <canvas
                ref={canvasRef}
                className={local.cropCanvas}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                aria-label={t('裁剪区域预览，拖拽以框选', 'Crop preview — drag to select an area')}
              />
            </div>

            <div className={`${styles.settings} ${styles.settingsTwo}`}>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>{t('裁剪比例', 'Crop ratio')}</span>
                <select className={styles.select} value={aspect} onChange={(event) => setAspect(event.target.value)}>
                  {ASPECTS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {isEn ? item.en : item.zh}
                    </option>
                  ))}
                </select>
              </label>

              <div className={styles.field}>
                <span className={styles.fieldLabel}>{t('旋转与翻转', 'Rotate & flip')}</span>
                <div className={styles.buttonRow}>
                  <button type="button" className="button button--secondary button--sm" onClick={() => setRotation((value) => (value + 270) % 360)}>
                    {t('↺ 左转', '↺ Left')}
                  </button>
                  <button type="button" className="button button--secondary button--sm" onClick={() => setRotation((value) => (value + 90) % 360)}>
                    {t('↻ 右转', '↻ Right')}
                  </button>
                  <button type="button" className="button button--secondary button--sm" onClick={() => setFlipH((value) => !value)}>
                    {t('⇋ 水平翻转', '⇋ Flip')}
                  </button>
                  <button type="button" className="button button--secondary button--sm" onClick={resetCrop}>
                    {t('全选', 'Select all')}
                  </button>
                </div>
              </div>
            </div>

            <div className={styles.toolbar}>
              <button type="button" className="button button--primary" onClick={handleDownload} disabled={busy}>
                {busy
                  ? t('导出中…', 'Exporting…')
                  : t(
                      `导出裁剪结果${outputSize ? `（${outputSize.w} × ${outputSize.h}）` : ''}`,
                      `Export crop${outputSize ? ` (${outputSize.w} × ${outputSize.h})` : ''}`,
                    )}
              </button>
              <span className={styles.summary}>
                {t(
                  `原图 ${rotated.width} × ${rotated.height}，当前选区 ${outputSize ? `${outputSize.w} × ${outputSize.h}` : '—'}`,
                  `Original ${rotated.width} × ${rotated.height}, selection ${outputSize ? `${outputSize.w} × ${outputSize.h}` : '—'}`,
                )}
              </span>
            </div>
          </>
        )}

        <section className={styles.faq}>
          <h2 className={styles.faqTitle}>{t('说明', 'Notes')}</h2>
          <ul className={styles.faqList}>
            {isEn ? (
              <>
                <li>Press and drag on the preview to select an area; releasing finishes it. Dragging again replaces the selection.</li>
                <li>With a fixed ratio selected, dragging is constrained to that ratio.</li>
                <li>Export is lossless PNG. For JPG, crop here and then use the format converter.</li>
              </>
            ) : (
              <>
                <li>在预览图上按住拖动即可框选，松手完成；重新拖一次会覆盖选区。</li>
                <li>选择固定比例后，拖拽方向会自动约束到该比例。</li>
                <li>导出为 PNG（无损）；需要 JPG 可以先裁剪再用「图片格式转换」。</li>
              </>
            )}
          </ul>
        </section>
      </main>
    </Layout>
  );
}
