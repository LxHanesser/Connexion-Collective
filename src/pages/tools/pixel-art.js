import React, {useCallback, useMemo, useRef, useState} from 'react';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import {baseName, canvasToBlob, createCanvas, downloadBlob, loadBitmap} from '@site/src/lib/imageTools';
import styles from './shared.module.css';

const COPY = {
  zh: {
    title: '像素画转换',
    description:
      '把图片降采样并限制调色板，生成像素画风格。可导出 1× 原始尺寸或放大的整数倍版本。浏览器本地处理。',
    heading: '像素画转换',
    lead: '先缩小到目标宽度，再用有限调色板重新上色。预览会按像素放大显示，导出的 PNG 可选 1× 或整数倍。',
    dropTitle: '拖入图片，或点击选择',
    dropHint: 'PNG / JPEG / WebP，本地处理，不上传',
    width: '目标宽度',
    palette: '调色板',
    convertLabel: '转换',
    auto: (count) => `自动 ${count} 色`,
    pico: 'PICO-8（16 色）',
    gameboy: 'Game Boy（4 色）',
    gray: '灰度（4 色）',
    scale: '导出倍数',
    download: '下载 PNG',
    pick: '请先选择一张图片',
    colors: (count) => `实际使用 ${count} 色`,
    faqTitle: '说明',
    faq: [
      '流程是「降采样 → 中位切分取色 → 最近邻映射」，不涉及任何 AI 模型。',
      '目标宽度越小、颜色越少，像素感越强；32–64 是常见的头像尺寸。',
      '自动模式用中位切分法从原图提取主色，能保留原图色调。',
      '固定调色板（PICO-8 / Game Boy）会强行套用经典配色，风格更统一。',
    ],
  },
  en: {
    title: 'Pixel art converter',
    description:
      'Downsample an image and clamp its palette to get a pixel-art look. Export at 1× or in whole-number multiples. Runs locally.',
    heading: 'Pixel art converter',
    lead: 'The image is downsized to a target width, then recoloured with a limited palette. The preview is scaled up with hard pixels; export at 1× or a bigger multiple.',
    dropTitle: 'Drop an image, or click to choose',
    dropHint: 'PNG / JPEG / WebP — processed locally',
    width: 'Target width',
    palette: 'Palette',
    convertLabel: 'Convert',
    auto: (count) => `Auto (${count} colours)`,
    pico: 'PICO-8 (16 colours)',
    gameboy: 'Game Boy (4 colours)',
    gray: 'Grayscale (4 colours)',
    scale: 'Export scale',
    download: 'Download PNG',
    pick: 'Choose an image first',
    colors: (count) => `${count} colours used`,
    faqTitle: 'Notes',
    faq: [
      'Pipeline: downsample → median-cut palette → nearest-colour mapping. No AI model involved.',
      'Smaller width and fewer colours give a stronger pixel look; 32–64 suits avatars.',
      'Auto mode extracts the dominant colours from the source with median cut, keeping its tone.',
      'Fixed palettes (PICO-8 / Game Boy) force a classic look for consistency.',
    ],
  },
};

const PICO8 = [
  [0, 0, 0], [29, 43, 83], [126, 37, 83], [0, 135, 81],
  [171, 82, 54], [95, 87, 79], [194, 195, 199], [255, 241, 232],
  [255, 0, 77], [255, 163, 0], [255, 236, 39], [0, 228, 54],
  [41, 173, 255], [131, 118, 156], [255, 119, 168], [255, 204, 170],
];

const GAMEBOY = [
  [15, 56, 15],
  [48, 98, 48],
  [139, 172, 15],
  [155, 188, 15],
];

const GRAY = [
  [0, 0, 0],
  [85, 85, 85],
  [170, 170, 170],
  [255, 255, 255],
];

function widestChannel(box) {
  let minR = 255, maxR = 0, minG = 255, maxG = 0, minB = 255, maxB = 0;
  for (const [r, g, b] of box) {
    if (r < minR) minR = r;
    if (r > maxR) maxR = r;
    if (g < minG) minG = g;
    if (g > maxG) maxG = g;
    if (b < minB) minB = b;
    if (b > maxB) maxB = b;
  }
  const ranges = [maxR - minR, maxG - minG, maxB - minB];
  const channel = ranges.indexOf(Math.max(...ranges));
  return {range: ranges[channel], channel};
}

function medianCut(pixels, maxColors) {
  if (!pixels.length) return [];
  let boxes = [pixels];
  while (boxes.length < maxColors) {
    let bestIndex = -1;
    let bestRange = 0;
    let bestChannel = 0;
    boxes.forEach((box, index) => {
      if (box.length < 2) return;
      const {range, channel} = widestChannel(box);
      if (range > bestRange) {
        bestRange = range;
        bestIndex = index;
        bestChannel = channel;
      }
    });
    if (bestIndex < 0) break;
    const box = boxes[bestIndex];
    box.sort((a, b) => a[bestChannel] - b[bestChannel]);
    const mid = box.length >> 1;
    boxes.splice(bestIndex, 1, box.slice(0, mid), box.slice(mid));
  }
  return boxes
    .filter((box) => box.length)
    .map((box) => {
      let r = 0;
      let g = 0;
      let b = 0;
      for (const pixel of box) {
        r += pixel[0];
        g += pixel[1];
        b += pixel[2];
      }
      return [Math.round(r / box.length), Math.round(g / box.length), Math.round(b / box.length)];
    });
}

function nearest(palette, r, g, b) {
  let best = palette[0];
  let bestDistance = Infinity;
  for (const color of palette) {
    const dr = color[0] - r;
    const dg = color[1] - g;
    const db = color[2] - b;
    const distance = dr * dr + dg * dg + db * db;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = color;
    }
  }
  return best;
}

export default function PixelArtPage() {
  const {i18n} = useDocusaurusContext();
  const copy = i18n.currentLocale === 'en' ? COPY.en : COPY.zh;

  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [source, setSource] = useState(null);
  const [width, setWidth] = useState(48);
  const [paletteMode, setPaletteMode] = useState('auto');
  const [autoColors, setAutoColors] = useState(16);
  const [scale, setScale] = useState(8);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleFile = useCallback(async (file) => {
    if (!file) return;
    setError('');
    setResult(null);
    try {
      const bitmap = await loadBitmap(file);
      setSource({name: file.name, bitmap, width: bitmap.width, height: bitmap.height});
    } catch (err) {
      setError(String(err?.message || err));
    }
  }, []);

  const convert = useCallback(() => {
    if (!source) return;
    const targetWidth = Math.min(width, source.bitmap.width);
    const ratio = source.bitmap.height / source.bitmap.width;
    const targetHeight = Math.max(1, Math.round(targetWidth * ratio));

    const small = createCanvas(targetWidth, targetHeight);
    const smallCtx = small.getContext('2d', {willReadFrequently: true});
    smallCtx.imageSmoothingEnabled = false;
    smallCtx.drawImage(source.bitmap, 0, 0, targetWidth, targetHeight);

    const imageData = smallCtx.getImageData(0, 0, targetWidth, targetHeight);
    const data = imageData.data;

    const samples = [];
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 16) continue;
      samples.push([data[i], data[i + 1], data[i + 2]]);
    }

    let palette;
    if (paletteMode === 'pico') palette = PICO8;
    else if (paletteMode === 'gameboy') palette = GAMEBOY;
    else if (paletteMode === 'gray') palette = GRAY;
    else palette = medianCut(samples, autoColors);

    if (!palette.length) {
      setError('图片没有可见像素');
      return;
    }

    const used = new Set();
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 16) continue;
      const [r, g, b] = nearest(palette, data[i], data[i + 1], data[i + 2]);
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      used.add(`${r},${g},${b}`);
    }
    smallCtx.putImageData(imageData, 0, 0);

    setResult({canvas: small, width: targetWidth, height: targetHeight, colors: used.size});
  }, [source, width, paletteMode, autoColors]);

  const handleDownload = useCallback(async () => {
    if (!result) return;
    const out = createCanvas(result.width * scale, result.height * scale);
    const ctx = out.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(result.canvas, 0, 0, out.width, out.height);
    const blob = await canvasToBlob(out, 'image/png');
    downloadBlob(blob, `${baseName(source.name)}-${result.width}px-${scale}x.png`);
  }, [result, scale, source]);

  const previewUrl = useMemo(() => {
    if (!result) return '';
    return result.canvas.toDataURL('image/png');
  }, [result]);

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
            👾
          </span>
          <span className={styles.dropTitle}>{copy.dropTitle}</span>
          <span className={styles.dropHint}>{copy.dropHint}</span>
        </div>

        {error ? <p className={styles.notice}>{error}</p> : null}
        {!source && !error ? (
          <p className={styles.fieldHint} style={{marginTop: '1rem'}}>
            {copy.pick}
          </p>
        ) : null}

        <div className={`${styles.settings} ${styles.settingsTwo}`}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>{copy.width}</span>
            <select
              className={styles.select}
              value={width}
              onChange={(event) => setWidth(Number(event.target.value))}
            >
              {[16, 24, 32, 48, 64, 96, 128].map((value) => (
                <option key={value} value={value}>
                  {value} px
                </option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>{copy.palette}</span>
            <select
              className={styles.select}
              value={paletteMode}
              onChange={(event) => setPaletteMode(event.target.value)}
            >
              <option value="auto">{copy.auto(autoColors)}</option>
              <option value="pico">{copy.pico}</option>
              <option value="gameboy">{copy.gameboy}</option>
              <option value="gray">{copy.gray}</option>
            </select>
          </label>
        </div>

        {paletteMode === 'auto' ? (
          <div className={`${styles.settings} ${styles.settingsTwo}`}>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>{copy.auto(autoColors)}</span>
              <input
                className={styles.range}
                type="range"
                min="4"
                max="32"
                step="4"
                value={autoColors}
                onChange={(event) => setAutoColors(Number(event.target.value))}
              />
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>{copy.scale}</span>
              <select
                className={styles.select}
                value={scale}
                onChange={(event) => setScale(Number(event.target.value))}
              >
                {[1, 2, 4, 8, 16].map((value) => (
                  <option key={value} value={value}>
                    {value}×
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : (
          <div className={`${styles.settings} ${styles.settingsTwo}`}>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>{copy.scale}</span>
              <select
                className={styles.select}
                value={scale}
                onChange={(event) => setScale(Number(event.target.value))}
              >
                {[1, 2, 4, 8, 16].map((value) => (
                  <option key={value} value={value}>
                    {value}×
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}

        <div className={styles.toolbar}>
          <button type="button" className="button button--primary" onClick={convert} disabled={!source}>
            {copy.convertLabel}
          </button>
          {result ? (
            <button type="button" className="button button--secondary" onClick={handleDownload}>
              {copy.download}
            </button>
          ) : null}
        </div>

        {result ? (
          <>
            <p className={styles.summary} style={{marginTop: '1rem'}}>
              {result.width}×{result.height} · {copy.colors(result.colors)}
            </p>
            <div className={styles.previewWrap}>
              <img
                src={previewUrl}
                alt="pixel preview"
                style={{
                  width: `min(100%, ${Math.max(160, result.width * 6)}px)`,
                  imageRendering: 'pixelated',
                  borderRadius: 8,
                  border: '1px solid var(--ifm-color-emphasis-200)',
                }}
              />
            </div>
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
