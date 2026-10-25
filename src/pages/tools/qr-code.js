import React, {useCallback, useEffect, useRef, useState} from 'react';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import qrcode from 'qrcode-generator';
import {canvasToBlob, downloadBlob} from '@site/src/lib/imageTools';
import styles from './shared.module.css';

// 让二维码支持中文：默认按单字节处理会乱码，这里改成 UTF-8 字节序列
qrcode.stringToBytes = (value) => Array.from(new TextEncoder().encode(value));

const SIZES = [256, 512, 1024];
const LEVELS = [
  {value: 'L', zh: 'L（最省空间）', en: 'L (smallest)'},
  {value: 'M', zh: 'M（推荐）', en: 'M (recommended)'},
  {value: 'Q', zh: 'Q（更强纠错）', en: 'Q (stronger)'},
  {value: 'H', zh: 'H（最强纠错）', en: 'H (strongest)'},
];

export default function QrCodePage() {
  const {i18n} = useDocusaurusContext();
  const isEn = i18n.currentLocale === 'en';
  const t = (zh, en) => (isEn ? en : zh);

  const [text, setText] = useState('https://connexioncollective.com');
  const [size, setSize] = useState(512);
  const [margin, setMargin] = useState(2);
  const [level, setLevel] = useState('M');
  const [fg, setFg] = useState('#111827');
  const [bg, setBg] = useState('#ffffff');
  const [error, setError] = useState('');
  const canvasRef = useRef(null);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const ctx = canvas.getContext('2d');
    canvas.width = size;
    canvas.height = size;
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, size, size);

    if (!text.trim()) {
      setError('');
      return;
    }

    try {
      const qr = qrcode(0, level);
      qr.addData(text);
      qr.make();
      const count = qr.getModuleCount();
      const total = count + margin * 2;
      const cell = Math.max(1, Math.floor(size / total));
      const drawn = cell * total;
      const offset = Math.floor((size - drawn) / 2);

      ctx.fillStyle = fg;
      for (let row = 0; row < count; row += 1) {
        for (let col = 0; col < count; col += 1) {
          if (qr.isDark(row, col)) {
            ctx.fillRect(offset + (col + margin) * cell, offset + (row + margin) * cell, cell, cell);
          }
        }
      }
      setError('');
    } catch (renderError) {
      const detail = renderError instanceof Error ? renderError.message : '';
      setError(
        t(`内容太长，无法生成二维码：${detail}`, `Content is too long for a QR code: ${detail}`),
      );
    }
  }, [bg, fg, level, margin, size, text, isEn]);

  useEffect(() => {
    const timer = setTimeout(render, 150);
    return () => clearTimeout(timer);
  }, [render]);

  const handleDownload = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const blob = await canvasToBlob(canvas, 'image/png');
    downloadBlob(blob, `qrcode-${size}.png`);
  }, [size]);

  return (
    <Layout
      title={t('二维码生成', 'QR code generator')}
      description={t(
        '在浏览器里生成二维码，支持中文、自定义尺寸与纠错级别，不上传任何内容。',
        'Generate QR codes in your browser with Chinese support, custom size, and error correction. Nothing is uploaded.',
      )}>
      <main className={styles.page}>
        <header className={styles.header}>
          <Heading as="h1" className={styles.title}>
            {t('二维码生成', 'QR code generator')}
          </Heading>
          <p className={styles.lead}>
            {t(
              '输入链接或文字，实时生成二维码。内容只在你的浏览器里计算，不会发送到任何服务器。',
              'Type a link or text and get a QR code instantly. Everything is computed in your browser and never sent to a server.',
            )}
          </p>
          <p className={styles.badgeRow}>
            <span className={styles.badge}>{t('🔒 本地生成', '🔒 Generated locally')}</span>
            <span className={styles.badge}>{t('🀄 支持中文', '🀄 Unicode support')}</span>
            <span className={styles.badge}>{t('📦 零依赖请求', '📦 No external requests')}</span>
          </p>
        </header>

        <div className={styles.panel}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>{t('二维码内容', 'QR code content')}</span>
            <textarea
              className={styles.textarea}
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder={t(
                '输入网址或任意文字，例如 https://connexioncollective.com',
                'Enter a URL or any text, e.g. https://connexioncollective.com',
              )}
              rows={4}
            />
            <span className={styles.fieldHint}>
              {t(
                '支持网址、纯文本、WiFi 配置等，最长约 2000 字符',
                'URLs, plain text, Wi-Fi configs, and more — up to about 2000 characters',
              )}
            </span>
          </label>

          <div className={`${styles.settings} ${styles.settingsTwo}`} style={{marginTop: '1.25rem'}}>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>{t('图片尺寸', 'Image size')}</span>
              <select className={styles.select} value={size} onChange={(event) => setSize(Number(event.target.value))}>
                {SIZES.map((value) => (
                  <option key={value} value={value}>{value} × {value}</option>
                ))}
              </select>
            </label>

            <label className={styles.field}>
              <span className={styles.fieldLabel}>{t('纠错级别', 'Error correction')}</span>
              <select className={styles.select} value={level} onChange={(event) => setLevel(event.target.value)}>
                {LEVELS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {isEn ? option.en : option.zh}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.field}>
              <span className={styles.fieldLabel}>
                {t('边距', 'Margin')} <span>{margin}</span>
              </span>
              <input
                className={styles.range}
                type="range"
                min="0"
                max="6"
                value={margin}
                onChange={(event) => setMargin(Number(event.target.value))}
              />
            </label>

            <label className={styles.field}>
              <span className={styles.fieldLabel}>{t('前景色', 'Foreground')}</span>
              <input className={styles.textInput} type="color" value={fg} onChange={(event) => setFg(event.target.value)} style={{padding: '0.25rem'}} />
            </label>

            <label className={styles.field}>
              <span className={styles.fieldLabel}>{t('背景色', 'Background')}</span>
              <input className={styles.textInput} type="color" value={bg} onChange={(event) => setBg(event.target.value)} style={{padding: '0.25rem'}} />
            </label>
          </div>
        </div>

        <div className={styles.previewWrap}>
          <canvas ref={canvasRef} className={styles.previewCanvas} aria-label={t('二维码预览', 'QR code preview')} />
        </div>

        {error && <p className={styles.notice} role="status">{error}</p>}

        <div className={styles.toolbar}>
          <button type="button" className="button button--primary" onClick={handleDownload} disabled={!text.trim() || Boolean(error)}>
            {t('下载 PNG', 'Download PNG')}
          </button>
        </div>

        <section className={styles.faq}>
          <h2 className={styles.faqTitle}>{t('说明', 'Notes')}</h2>
          <ul className={styles.faqList}>
            {isEn ? (
              <>
                <li>Higher error correction makes the code denser but more damage-resistant; M is enough for most uses.</li>
                <li>Keep the foreground darker than the background, or some phones will fail to scan it.</li>
                <li>The image is generated entirely on your device; refreshing the page discards it.</li>
              </>
            ) : (
              <>
                <li>纠错级别越高，二维码越密但越耐污损；一般用 M 就够。</li>
                <li>前景色建议比背景色深，否则部分手机识别不出来。</li>
                <li>生成的图片完全在本机，刷新页面后内容不会保留。</li>
              </>
            )}
          </ul>
        </section>
      </main>
    </Layout>
  );
}
