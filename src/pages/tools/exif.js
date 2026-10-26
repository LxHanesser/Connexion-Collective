import React, {useCallback, useRef, useState} from 'react';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import {baseName, canvasToBlob, createCanvas, downloadBlob, formatBytes, loadBitmap} from '@site/src/lib/imageTools';
import styles from './shared.module.css';

const COPY = {
  zh: {
    title: 'EXIF 查看与清除',
    description:
      '查看照片里的 EXIF 信息（相机、时间、GPS 等），或一键清除后再保存。全程本地处理，图片不会上传。',
    heading: 'EXIF 查看 / 清除',
    lead: '很多照片带着拍摄地点和设备信息。这里可以先把它们列出来，确认后再决定是否清除。清除方式是重新编码，会连同 ICC 之外的元数据一起去掉。',
    dropTitle: '拖入照片，或点击选择',
    dropHint: 'JPEG / PNG / HEIC 等，本地解析，不上传',
    metaTitle: '检测到的元数据',
    none: '没有找到 EXIF 信息（可能已被清除，或格式不支持）。',
    gpsWarn: '⚠️ 这张照片包含 GPS 位置信息。',
    gps: '位置',
    strip: '清除元数据并下载',
    working: '处理中…',
    quality: 'JPEG 质量',
    done: (before, after) => `已清除：${before} → ${after}`,
    note: '清除会重新编码 JPEG，画面会有极轻微损失；PNG 为无损重绘。',
    error: '读取失败，可能是不支持的格式',
    faqTitle: '说明',
    faq: [
      'EXIF 可能包含：拍摄时间、相机型号、镜头、光圈快门 ISO，以及 GPS 经纬度。',
      '社交平台通常会自行剥离 EXIF，但原图发送时会完整保留。',
      '「清除」通过 canvas 重绘实现，因此会同时丢掉 MakerNote 等私有字段。',
      '方向信息（Orientation）会被统一为「已旋转」的像素，避免看图时倒过来。',
    ],
  },
  en: {
    title: 'EXIF viewer & remover',
    description:
      'Inspect the EXIF data in a photo — camera, timestamp, GPS — then strip it and save. All local; the image is never uploaded.',
    heading: 'EXIF viewer / remover',
    lead: 'Many photos carry the location and device they were shot on. Inspect them here, then decide whether to strip. Stripping re-encodes the image, which removes metadata along with it.',
    dropTitle: 'Drop a photo, or click to choose',
    dropHint: 'JPEG / PNG / HEIC and more — parsed locally',
    metaTitle: 'Detected metadata',
    none: 'No EXIF found — it may already be stripped, or the format is unsupported.',
    gpsWarn: '⚠️ This photo contains GPS location data.',
    gps: 'Location',
    strip: 'Strip metadata and download',
    working: 'Working…',
    quality: 'JPEG quality',
    done: (before, after) => `Stripped: ${before} → ${after}`,
    note: 'Stripping re-encodes JPEG with a tiny quality loss; PNG is redrawn losslessly.',
    error: 'Could not read the file — unsupported format?',
    faqTitle: 'Notes',
    faq: [
      'EXIF can hold capture time, camera model, lens, aperture/shutter/ISO, and GPS coordinates.',
      'Social platforms usually strip EXIF, but sending the original file preserves everything.',
      'Stripping redraws the image on a canvas, so private MakerNote fields go too.',
      'Orientation is baked into the pixels, so the result never appears rotated.',
    ],
  },
};

const KEYS = [
  ['Make', '相机厂商'],
  ['Model', '相机型号'],
  ['LensModel', '镜头'],
  ['DateTimeOriginal', '拍摄时间'],
  ['CreateDate', '创建时间'],
  ['ModifyDate', '修改时间'],
  ['ExposureTime', '快门'],
  ['FNumber', '光圈'],
  ['ISO', 'ISO'],
  ['FocalLength', '焦距'],
  ['ExposureProgram', '曝光模式'],
  ['WhiteBalance', '白平衡'],
  ['Flash', '闪光灯'],
  ['Orientation', '方向'],
  ['Software', '软件'],
  ['ColorSpace', '色彩空间'],
];

function formatValue(value) {
  if (value instanceof Date) return value.toLocaleString();
  if (Array.isArray(value)) return value.join(', ');
  if (value && typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export default function ExifPage() {
  const {i18n} = useDocusaurusContext();
  const copy = i18n.currentLocale === 'en' ? COPY.en : COPY.zh;

  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [meta, setMeta] = useState(null);
  const [gps, setGps] = useState(null);
  const [quality, setQuality] = useState(0.95);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState('');
  const [error, setError] = useState('');

  const handleFile = useCallback(async (picked) => {
    if (!picked) return;
    setError('');
    setDone('');
    setMeta(null);
    setGps(null);
    setFile(picked);
    try {
      const mod = await import('exifr');
      const parse = mod.parse || mod.default?.parse;
      if (!parse) throw new Error('exifr unavailable');
      const data = await parse(picked, {
        tiff: true,
        exif: true,
        gps: true,
        ifd0: true,
        interop: false,
        makerNote: false,
        userComment: false,
      });
      if (data) {
        setMeta(data);
        if (typeof data.latitude === 'number' && typeof data.longitude === 'number') {
          setGps({lat: data.latitude, lon: data.longitude});
        }
      }
    } catch {
      setMeta(null);
    }
  }, []);

  const handleStrip = async () => {
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      const bitmap = await loadBitmap(file);
      const canvas = createCanvas(bitmap.width, bitmap.height);
      canvas.getContext('2d').drawImage(bitmap, 0, 0);
      const isPng = /png/i.test(file.type);
      const blob = await canvasToBlob(canvas, isPng ? 'image/png' : 'image/jpeg', isPng ? undefined : quality);
      const extension = isPng ? 'png' : 'jpg';
      downloadBlob(blob, `${baseName(file.name)}-clean.${extension}`);
      setDone(copy.done(formatBytes(file.size), formatBytes(blob.size)));
    } catch (err) {
      setError(String(err?.message || err));
    } finally {
      setBusy(false);
    }
  };

  const rows = meta
    ? KEYS.map(([key, zhLabel]) => ({key, label: i18n.currentLocale === 'en' ? key : zhLabel, value: meta[key]}))
        .filter((row) => row.value !== undefined && row.value !== null && row.value !== '')
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
            🔍
          </span>
          <span className={styles.dropTitle}>{copy.dropTitle}</span>
          <span className={styles.dropHint}>{copy.dropHint}</span>
        </div>

        {error ? <p className={styles.notice}>{error}</p> : null}

        {file ? (
          <p className={styles.summary} style={{marginTop: '1rem'}}>
            {file.name} · {formatBytes(file.size)}
          </p>
        ) : null}

        {gps ? <p className={styles.notice}>{copy.gpsWarn}</p> : null}

        {file ? (
          <>
            <Heading as="h2" className={styles.faqTitle} style={{marginTop: '1.5rem'}}>
              {copy.metaTitle}
            </Heading>
            {rows.length ? (
              <ul className={styles.list}>
                {rows.map((row) => (
                  <li key={row.key} className={styles.item}>
                    <div className={styles.itemMain}>
                      <span className={styles.itemMeta}>{row.label}</span>
                      <span className={styles.itemName}>{formatValue(row.value)}</span>
                    </div>
                  </li>
                ))}
                {gps ? (
                  <li className={styles.item}>
                    <div className={styles.itemMain}>
                      <span className={styles.itemMeta}>{copy.gps}</span>
                      <span className={styles.itemName}>
                        {gps.lat.toFixed(6)}, {gps.lon.toFixed(6)}
                      </span>
                    </div>
                    <div className={styles.itemActions}>
                      <a
                        className="button button--secondary button--sm"
                        href={`https://www.openstreetmap.org/?mlat=${gps.lat}&mlon=${gps.lon}#map=15/${gps.lat}/${gps.lon}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Map
                      </a>
                    </div>
                  </li>
                ) : null}
              </ul>
            ) : (
              <p className={styles.fieldHint}>{copy.none}</p>
            )}

            <div className={`${styles.settings} ${styles.settingsTwo}`} style={{marginTop: '1.5rem'}}>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>{copy.quality}</span>
                <input
                  className={styles.range}
                  type="range"
                  min="0.6"
                  max="1"
                  step="0.05"
                  value={quality}
                  onChange={(event) => setQuality(Number(event.target.value))}
                />
              </label>
              <div className={styles.field} style={{justifyContent: 'flex-end'}}>
                <button type="button" className="button button--primary" onClick={handleStrip} disabled={busy}>
                  {busy ? copy.working : copy.strip}
                </button>
              </div>
            </div>

            <p className={styles.fieldHint}>{copy.note}</p>
            {done ? <p className={styles.hint}>{done}</p> : null}
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
