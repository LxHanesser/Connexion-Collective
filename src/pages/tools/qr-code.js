import React, {useCallback, useEffect, useRef, useState} from 'react';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import qrcode from 'qrcode-generator';
import {canvasToBlob, downloadBlob} from '@site/src/lib/imageTools';
import styles from './shared.module.css';

// 让二维码支持中文：默认按单字节处理会乱码，这里改成 UTF-8 字节序列
qrcode.stringToBytes = (value) => Array.from(new TextEncoder().encode(value));

const SIZES = [256, 512, 1024];
const LEVELS = [
  {value: 'L', label: 'L（最省空间）'},
  {value: 'M', label: 'M（推荐）'},
  {value: 'Q', label: 'Q（更强纠错）'},
  {value: 'H', label: 'H（最强纠错）'},
];

export default function QrCodePage() {
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
      setError(
        renderError instanceof Error
          ? `内容太长，无法生成二维码：${renderError.message}`
          : '生成失败',
      );
    }
  }, [bg, fg, level, margin, size, text]);

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
      title="二维码生成"
      description="在浏览器里生成二维码，支持中文、自定义尺寸与纠错级别，不上传任何内容。">
      <main className={styles.page}>
        <header className={styles.header}>
          <Heading as="h1" className={styles.title}>
            二维码生成
          </Heading>
          <p className={styles.lead}>
            输入链接或文字，实时生成二维码。内容只在你的浏览器里计算，不会发送到任何服务器。
          </p>
          <p className={styles.badgeRow}>
            <span className={styles.badge}>🔒 本地生成</span>
            <span className={styles.badge}>🀄 支持中文</span>
            <span className={styles.badge}>📦 零依赖请求</span>
          </p>
        </header>

        <div className={styles.panel}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>二维码内容</span>
            <textarea
              className={styles.textarea}
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="输入网址或任意文字，例如 https://connexioncollective.com"
              rows={4}
            />
            <span className={styles.fieldHint}>支持网址、纯文本、WiFi 配置等，最长约 2000 字符</span>
          </label>

          <div className={`${styles.settings} ${styles.settingsTwo}`} style={{marginTop: '1.25rem'}}>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>图片尺寸</span>
              <select className={styles.select} value={size} onChange={(event) => setSize(Number(event.target.value))}>
                {SIZES.map((value) => (
                  <option key={value} value={value}>{value} × {value}</option>
                ))}
              </select>
            </label>

            <label className={styles.field}>
              <span className={styles.fieldLabel}>纠错级别</span>
              <select className={styles.select} value={level} onChange={(event) => setLevel(event.target.value)}>
                {LEVELS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>

            <label className={styles.field}>
              <span className={styles.fieldLabel}>
                边距 <span>{margin}</span>
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
              <span className={styles.fieldLabel}>前景色</span>
              <input className={styles.textInput} type="color" value={fg} onChange={(event) => setFg(event.target.value)} style={{padding: '0.25rem'}} />
            </label>

            <label className={styles.field}>
              <span className={styles.fieldLabel}>背景色</span>
              <input className={styles.textInput} type="color" value={bg} onChange={(event) => setBg(event.target.value)} style={{padding: '0.25rem'}} />
            </label>
          </div>
        </div>

        <div className={styles.previewWrap}>
          <canvas ref={canvasRef} className={styles.previewCanvas} aria-label="二维码预览" />
        </div>

        {error && <p className={styles.notice} role="status">{error}</p>}

        <div className={styles.toolbar}>
          <button type="button" className="button button--primary" onClick={handleDownload} disabled={!text.trim() || Boolean(error)}>
            下载 PNG
          </button>
        </div>

        <section className={styles.faq}>
          <h2 className={styles.faqTitle}>说明</h2>
          <ul className={styles.faqList}>
            <li>纠错级别越高，二维码越密但越耐污损；一般用 M 就够。</li>
            <li>前景色建议比背景色深，否则部分手机识别不出来。</li>
            <li>生成的图片完全在本机，刷新页面后内容不会保留。</li>
          </ul>
        </section>
      </main>
    </Layout>
  );
}
