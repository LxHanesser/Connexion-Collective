import React, {useEffect, useMemo, useRef, useState} from 'react';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import {copyText} from '@site/src/lib/clipboard';
import {downloadBlob} from '@site/src/lib/imageTools';
import styles from './shared.module.css';

const COPY = {
  zh: {
    title: 'CS2 视角模型生成器',
    description:
      '调整 viewmodel_fov 与三轴偏移，实时预览并生成控制台命令，支持导出 cfg。纯本地，不上传。',
    heading: 'CS2 视角模型生成器',
    lead: '视角模型决定枪在屏幕上的位置和大小。调好参数后复制命令，或直接下载 cfg 放进 cfg 目录。',
    preset: '预设',
    presetCustom: '自定义',
    presetClassic: '经典 Classic',
    presetDesktop: '桌面 Desktop',
    presetCrouch: '蹲伏 Crouch',
    fov: 'FOV',
    offsetX: '左右 X',
    offsetY: '上下 Y',
    offsetZ: '远近 Z',
    preview: '示意图',
    commands: '控制台命令',
    copy: '复制命令',
    copied: '已复制',
    download: '下载 cfg',
    note: '预设值由游戏自身定义（viewmodel_presetpos 1/2/3）；自定义时用 0 并手动给三轴数值。偏移范围是 -2.5 到 2.5，超出会被游戏截断。',
    faqTitle: '说明',
    faq: [
      'viewmodel_fov 范围约 54–68：数字越大枪越「往外拉」，视野更宽。',
      'offset_x 正数把枪往右移，offset_y 正数往上，offset_z 正数往远（枪变小）。',
      '预设与自定义是互斥的：选了 1/2/3 后手动数值不再生效，需要先切回 0。',
      '示意图只表示相对位置，实际比例受分辨率和 4:3 拉伸影响。',
    ],
  },
  en: {
    title: 'CS2 viewmodel generator',
    description:
      'Tune viewmodel_fov and the three offsets, preview the result and generate console commands or a cfg file. Everything runs locally.',
    heading: 'CS2 viewmodel generator',
    lead: 'The viewmodel decides where your gun sits and how large it looks. Adjust the parameters, then copy the commands or download a cfg.',
    preset: 'Preset',
    presetCustom: 'Custom',
    presetClassic: 'Classic',
    presetDesktop: 'Desktop',
    presetCrouch: 'Crouch',
    fov: 'FOV',
    offsetX: 'Offset X',
    offsetY: 'Offset Y',
    offsetZ: 'Offset Z',
    preview: 'Schematic',
    commands: 'Console commands',
    copy: 'Copy commands',
    copied: 'Copied',
    download: 'Download cfg',
    note: 'Presets are defined by the game itself (viewmodel_presetpos 1/2/3). For custom values use 0 and set the three offsets manually. Offsets range from -2.5 to 2.5; anything beyond is clamped.',
    faqTitle: 'Notes',
    faq: [
      'viewmodel_fov runs roughly 54–68: a higher value pushes the gun further out and widens the view.',
      'Positive offset_x moves the gun right, positive offset_y moves it up, positive offset_z pushes it away (smaller).',
      'Presets and custom values are mutually exclusive: after choosing 1/2/3 your manual numbers no longer apply until you switch back to 0.',
      'The schematic only shows relative placement; real proportions depend on resolution and 4:3 stretching.',
    ],
  },
};

const PRESETS = {
  0: {fov: 60, x: 1, y: 1, z: -1},
  1: {fov: 60, x: 1, y: 1, z: -1},
  2: {fov: 60, x: 0, y: 0, z: 0},
  3: {fov: 60, x: 0.5, y: 1, z: -1},
};

export default function Cs2ViewmodelPage() {
  const {i18n} = useDocusaurusContext();
  const copy = i18n.currentLocale === 'en' ? COPY.en : COPY.zh;

  const [preset, setPreset] = useState(0);
  const [fov, setFov] = useState(60);
  const [x, setX] = useState(1);
  const [y, setY] = useState(1);
  const [z, setZ] = useState(-1);
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef(null);

  const applyPreset = (value) => {
    setPreset(value);
    const data = PRESETS[value];
    if (data) {
      setFov(data.fov);
      setX(data.x);
      setY(data.y);
      setZ(data.z);
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const w = 320;
    const h = 180;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#20232a';
    ctx.fillRect(0, 0, w, h);

    // 中心准心参考
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(w / 2 - 8, h / 2);
    ctx.lineTo(w / 2 + 8, h / 2);
    ctx.moveTo(w / 2, h / 2 - 8);
    ctx.lineTo(w / 2, h / 2 + 8);
    ctx.stroke();

    // 枪体：x/y 平移，z 与 fov 影响大小
    const scale = 1 + (60 - fov) / 60;
    const gunW = 120 * scale;
    const gunH = 42 * scale;
    const cx = w / 2 + x * 26 + 40;
    const cy = h - 30 - y * 20 + z * 10;

    ctx.fillStyle = '#8d99ae';
    ctx.beginPath();
    // roundRect 在旧版 Safari 里没有，做一次降级
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(cx - gunW / 2, cy - gunH / 2, gunW, gunH, 6);
    } else {
      ctx.rect(cx - gunW / 2, cy - gunH / 2, gunW, gunH);
    }
    ctx.fill();

    ctx.fillStyle = '#5c677d';
    ctx.fillRect(cx + gunW / 2 - 18 * scale, cy - 6 * scale, 46 * scale, 12 * scale);

    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = '11px monospace';
    ctx.fillText(`fov ${fov}  x ${x}  y ${y}  z ${z}`, 8, 16);
  }, [fov, x, y, z]);

  const commands = useMemo(
    () => [
      `viewmodel_presetpos ${preset}`,
      `viewmodel_fov ${fov}`,
      `viewmodel_offset_x ${x}`,
      `viewmodel_offset_y ${y}`,
      `viewmodel_offset_z ${z}`,
    ].join('\n'),
    [preset, fov, x, y, z],
  );

  const handleCopy = async () => {
    if (await copyText(commands)) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    }
  };

  const handleDownload = () => {
    const body = `// CS2 viewmodel\n${commands}\nhost_writeconfig\n`;
    downloadBlob(new Blob([body], {type: 'text/plain'}), 'viewmodel.cfg');
  };

  return (
    <Layout title={copy.title} description={copy.description}>
      <main className={styles.page}>
        <header className={styles.header}>
          <Heading as="h1" className={styles.title}>
            {copy.heading}
          </Heading>
          <p className={styles.lead}>{copy.lead}</p>
        </header>

        <div className={styles.previewWrap}>
          <canvas ref={canvasRef} aria-label={copy.preview} style={{borderRadius: 12, maxWidth: '100%'}} />
        </div>

        <div className={styles.settings}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>{copy.preset}</span>
            <select
              className={styles.select}
              value={preset}
              onChange={(event) => applyPreset(Number(event.target.value))}
            >
              <option value={0}>{copy.presetCustom}（0）</option>
              <option value={1}>{copy.presetClassic}（1）</option>
              <option value={2}>{copy.presetDesktop}（2）</option>
              <option value={3}>{copy.presetCrouch}（3）</option>
            </select>
          </label>
        </div>

        <div className={styles.settings}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>
              {copy.fov} · {fov}
            </span>
            <input
              className={styles.range}
              type="range"
              min="54"
              max="68"
              step="1"
              value={fov}
              onChange={(event) => setFov(Number(event.target.value))}
            />
          </label>
        </div>

        <div className={`${styles.settings} ${styles.settingsTwo}`}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>
              {copy.offsetX} · {x}
            </span>
            <input
              className={styles.range}
              type="range"
              min="-2.5"
              max="2.5"
              step="0.5"
              value={x}
              onChange={(event) => setX(Number(event.target.value))}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>
              {copy.offsetY} · {y}
            </span>
            <input
              className={styles.range}
              type="range"
              min="-2"
              max="2"
              step="0.5"
              value={y}
              onChange={(event) => setY(Number(event.target.value))}
            />
          </label>
        </div>

        <div className={styles.settings}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>
              {copy.offsetZ} · {z}
            </span>
            <input
              className={styles.range}
              type="range"
              min="-2"
              max="2"
              step="0.5"
              value={z}
              onChange={(event) => setZ(Number(event.target.value))}
            />
          </label>
        </div>

        <Heading as="h2" className={styles.faqTitle} style={{marginTop: '2rem'}}>
          {copy.commands}
        </Heading>
        <div className={styles.toolbar}>
          <button type="button" className="button button--primary" onClick={handleCopy}>
            {copied ? copy.copied : copy.copy}
          </button>
          <button type="button" className="button button--secondary" onClick={handleDownload}>
            {copy.download}
          </button>
        </div>
        <textarea
          className={styles.textarea}
          readOnly
          value={commands}
          spellCheck={false}
          onFocus={(event) => event.target.select()}
        />
        <p className={styles.fieldHint}>{copy.note}</p>

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
