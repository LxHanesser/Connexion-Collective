import React, {useEffect, useMemo, useRef, useState} from 'react';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import {copyText} from '@site/src/lib/clipboard';
import styles from './shared.module.css';

const COPY = {
  zh: {
    title: 'CS2 准星命令生成器',
    description:
      '可视化调整 CS2 准星参数，实时预览并生成 cl_crosshair* 控制台命令，复制进 autoexec 即可。纯本地，不上传。',
    heading: 'CS2 准星生成器',
    lead: '拖动参数实时预览，右侧生成对应控制台命令。把命令粘进 autoexec.cfg 或直接输入控制台即可生效。',
    preview: '预览',
    styleLabel: '准星样式',
    size: '长度 size',
    thickness: '粗细 thickness',
    gap: '间距 gap',
    alpha: '不透明度 alpha',
    outline: '描边',
    outlineThickness: '描边粗细',
    dot: '中心点',
    tStyle: 'T 形（去掉下方）',
    recoil: '跟随弹道',
    colorLabel: '颜色',
    customColor: '自定义颜色',
    commands: '控制台命令',
    copy: '复制命令',
    copied: '已复制',
    reset: '重置',
    presets: '常用预设',
    presetSmall: '小十字',
    presetClassic: '经典静态',
    presetLarge: '大十字带点',
    note: '命令中不带斜杠；粘进 autoexec.cfg 时一行一条，或直接粘到控制台。改完用 exec autoexec.cfg 或重启游戏生效。',
    faqTitle: '说明',
    faq: [
      'cl_crosshairstyle 4 是「经典静态」，大多数玩家用的就是它；2 是经典动态（开枪会张开）。',
      'size 是每根线的长度，thickness 是线的粗细，gap 是中心留空的距离，可以是负数（线的内侧互相重叠）。',
      'alpha 配合 cl_crosshairusealpha 1 使用，200 左右比较常见；数值越低越透明。',
      '自定义颜色需要 cl_crosshaircolor 5，再用 _r / _g / _b 指定 RGB。',
      '预览只是近似示意图，实际显示还受分辨率和 HUD 缩放影响。',
    ],
  },
  en: {
    title: 'CS2 crosshair command generator',
    description:
      'Tune CS2 crosshair settings with a live preview and generate the matching cl_crosshair* console commands. Everything runs locally.',
    heading: 'CS2 crosshair generator',
    lead: 'Drag the sliders for a live preview, then copy the console commands on the right into autoexec.cfg or paste them straight into the console.',
    preview: 'Preview',
    styleLabel: 'Style',
    size: 'Size',
    thickness: 'Thickness',
    gap: 'Gap',
    alpha: 'Alpha',
    outline: 'Outline',
    outlineThickness: 'Outline thickness',
    dot: 'Center dot',
    tStyle: 'T shape (hide bottom)',
    recoil: 'Follow recoil',
    colorLabel: 'Colour',
    customColor: 'Custom colour',
    commands: 'Console commands',
    copy: 'Copy commands',
    copied: 'Copied',
    reset: 'Reset',
    presets: 'Presets',
    presetSmall: 'Small cross',
    presetClassic: 'Classic static',
    presetLarge: 'Large with dot',
    note: 'Commands have no leading slash. In autoexec.cfg put one per line, or paste them into the console. Apply with exec autoexec.cfg or a restart.',
    faqTitle: 'Notes',
    faq: [
      'cl_crosshairstyle 4 is the classic static crosshair most players use; 2 is classic dynamic (it opens up when firing).',
      'size is the length of each line, thickness is line width, gap is the empty space in the middle — it can be negative, making the inner ends overlap.',
      'alpha works together with cl_crosshairusealpha 1; around 200 is common, lower values are more transparent.',
      'A custom colour needs cl_crosshaircolor 5 plus _r / _g / _b values.',
      'The preview is an approximation; the real crosshair also depends on resolution and HUD scaling.',
    ],
  },
};

const COLORS = [
  {id: 0, label: 'Red', hex: '#e53935'},
  {id: 1, label: 'Green', hex: '#43a047'},
  {id: 2, label: 'Yellow', hex: '#fdd835'},
  {id: 3, label: 'Blue', hex: '#1e88e5'},
  {id: 4, label: 'Cyan', hex: '#00acc1'},
];

const PRESETS = {
  small: {style: 4, size: 2, thickness: 0.5, gap: -1, dot: 0, tStyle: 0, alpha: 200, outline: 1, outlineThickness: 1},
  classic: {style: 4, size: 2.5, thickness: 0.5, gap: 1, dot: 0, tStyle: 0, alpha: 200, outline: 1, outlineThickness: 1},
  large: {style: 4, size: 4, thickness: 1, gap: 2, dot: 1, tStyle: 0, alpha: 220, outline: 1, outlineThickness: 2},
};

const DEFAULTS = {
  style: 4,
  size: 2.5,
  thickness: 0.5,
  gap: 1,
  alpha: 200,
  outline: 1,
  outlineThickness: 1,
  dot: 0,
  tStyle: 0,
  recoil: 0,
  color: 1,
  custom: '#43a047',
};

export default function Cs2CrosshairPage() {
  const {i18n} = useDocusaurusContext();
  const copy = i18n.currentLocale === 'en' ? COPY.en : COPY.zh;

  const [cfg, setCfg] = useState(DEFAULTS);
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef(null);

  const set = (key) => (event) => {
    const raw = event.target.value;
    const numeric = ['size', 'thickness', 'gap', 'alpha', 'outlineThickness'].includes(key);
    setCfg((current) => ({...current, [key]: numeric ? Number(raw) : raw}));
  };

  const activeColor = useMemo(() => {
    if (cfg.color === 5) return cfg.custom;
    return (COLORS.find((item) => item.id === Number(cfg.color)) || COLORS[1]).hex;
  }, [cfg.color, cfg.custom]);

  const rgb = useMemo(() => {
    const match = /^#?([0-9a-f]{6})$/i.exec(String(activeColor).trim());
    if (!match) return {r: 67, g: 160, b: 71};
    const value = parseInt(match[1], 16);
    return {r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255};
  }, [activeColor]);

  // 画预览
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const cssSize = 240;
    canvas.width = cssSize * dpr;
    canvas.height = cssSize * dpr;
    canvas.style.width = `${cssSize}px`;
    canvas.style.height = `${cssSize}px`;

    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssSize, cssSize);

    const scale = 6; // 1 单位 ≈ 6px，仅用于预览
    const center = cssSize / 2;
    const arm = Math.max(0.5, cfg.size * scale);
    const thick = Math.max(1, cfg.thickness * scale);
    const gap = cfg.gap * scale;
    const alpha = Math.max(0, Math.min(1, cfg.alpha / 255));
    const outline = Number(cfg.outline) === 1 ? Math.max(1, cfg.outlineThickness * 2) : 0;

    ctx.globalAlpha = alpha;

    const drawRect = (x, y, w, h) => {
      if (outline) {
        ctx.fillStyle = '#000000';
        ctx.fillRect(x - outline / 2, y - outline / 2, w + outline, h + outline);
      }
      ctx.fillStyle = activeColor;
      ctx.fillRect(x, y, w, h);
    };

    // 左右 / 上下四根线
    const half = gap / 2;
    if (Number(cfg.tStyle) !== 1) {
      drawRect(center - half - arm, center - thick / 2, arm, thick); // 左
      drawRect(center + half, center - thick / 2, arm, thick); // 右
      drawRect(center - thick / 2, center + half, thick, arm); // 下
    } else {
      drawRect(center - half - arm, center - thick / 2, arm, thick);
      drawRect(center + half, center - thick / 2, arm, thick);
    }
    drawRect(center - thick / 2, center - half - arm, thick, arm); // 上

    if (Number(cfg.dot) === 1) {
      const dotSize = Math.max(thick, 2);
      drawRect(center - dotSize / 2, center - dotSize / 2, dotSize, dotSize);
    }
  }, [cfg, activeColor]);

  const commands = useMemo(() => {
    const lines = [
      `cl_crosshairstyle ${cfg.style}`,
      `cl_crosshairsize ${cfg.size}`,
      `cl_crosshairthickness ${cfg.thickness}`,
      `cl_crosshairgap ${cfg.gap}`,
      `cl_crosshairdot ${cfg.dot}`,
      `cl_crosshair_t ${cfg.tStyle}`,
      `cl_crosshair_drawoutline ${cfg.outline}`,
      `cl_crosshair_outlinethickness ${cfg.outlineThickness}`,
      `cl_crosshairusealpha 1`,
      `cl_crosshairalpha ${cfg.alpha}`,
      `cl_crosshaircolor ${cfg.color}`,
    ];
    if (Number(cfg.color) === 5) {
      lines.push(`cl_crosshaircolor_r ${rgb.r}`);
      lines.push(`cl_crosshaircolor_g ${rgb.g}`);
      lines.push(`cl_crosshaircolor_b ${rgb.b}`);
    }
    lines.push(`cl_crosshair_recoil ${cfg.recoil}`);
    return lines.join('\n');
  }, [cfg, rgb]);

  const handleCopy = async () => {
    if (await copyText(commands)) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    }
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

        <div className={styles.buttonRow} style={{justifyContent: 'center', marginBottom: '1rem'}}>
          <button
            type="button"
            className="button button--secondary button--sm"
            onClick={() => setCfg((current) => ({...current, ...PRESETS.small}))}
          >
            {copy.presetSmall}
          </button>
          <button
            type="button"
            className="button button--secondary button--sm"
            onClick={() => setCfg((current) => ({...current, ...PRESETS.classic}))}
          >
            {copy.presetClassic}
          </button>
          <button
            type="button"
            className="button button--secondary button--sm"
            onClick={() => setCfg((current) => ({...current, ...PRESETS.large}))}
          >
            {copy.presetLarge}
          </button>
          <button type="button" className="button button--secondary button--sm" onClick={() => setCfg(DEFAULTS)}>
            {copy.reset}
          </button>
        </div>

        <div className={styles.previewWrap}>
          <canvas ref={canvasRef} aria-label={copy.preview} style={{background: '#1a1a1a', borderRadius: 12}} />
        </div>

        <div className={`${styles.settings} ${styles.settingsTwo}`}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>{copy.styleLabel}</span>
            <select className={styles.select} value={cfg.style} onChange={set('style')}>
              <option value={0}>0 · Default dynamic</option>
              <option value={1}>1 · Default static</option>
              <option value={2}>2 · Classic dynamic</option>
              <option value={4}>4 · Classic static</option>
              <option value={5}>5 · Legacy</option>
            </select>
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>{copy.colorLabel}</span>
            <select className={styles.select} value={cfg.color} onChange={set('color')}>
              {COLORS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
              <option value={5}>{copy.customColor}</option>
            </select>
          </label>
        </div>

        {Number(cfg.color) === 5 ? (
          <div className={styles.settings}>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>{copy.customColor} (RGB {rgb.r}, {rgb.g}, {rgb.b})</span>
              <input
                type="color"
                value={cfg.custom}
                onChange={(event) => setCfg((current) => ({...current, custom: event.target.value}))}
                style={{width: '100%', minHeight: 44, border: 'none', background: 'transparent'}}
              />
            </label>
          </div>
        ) : null}

        <div className={`${styles.settings} ${styles.settingsTwo}`}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>
              {copy.size} · {cfg.size}
            </span>
            <input className={styles.range} type="range" min="0.5" max="10" step="0.5" value={cfg.size} onChange={set('size')} />
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>
              {copy.thickness} · {cfg.thickness}
            </span>
            <input className={styles.range} type="range" min="0.5" max="5" step="0.5" value={cfg.thickness} onChange={set('thickness')} />
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>
              {copy.gap} · {cfg.gap}
            </span>
            <input className={styles.range} type="range" min="-5" max="5" step="0.5" value={cfg.gap} onChange={set('gap')} />
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>
              {copy.alpha} · {cfg.alpha}
            </span>
            <input className={styles.range} type="range" min="50" max="255" step="5" value={cfg.alpha} onChange={set('alpha')} />
          </label>
        </div>

        <div className={`${styles.settings} ${styles.settingsTwo}`}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>{copy.outlineThickness} · {cfg.outlineThickness}</span>
            <input
              className={styles.range}
              type="range"
              min="1"
              max="3"
              step="1"
              value={cfg.outlineThickness}
              onChange={set('outlineThickness')}
            />
          </label>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>{copy.dot}</span>
            <label style={{display: 'flex', alignItems: 'center', gap: '0.5rem', minHeight: 44}}>
              <input
                type="checkbox"
                checked={Number(cfg.dot) === 1}
                onChange={(event) => setCfg((current) => ({...current, dot: event.target.checked ? 1 : 0}))}
                style={{width: '1.25rem', height: '1.25rem', accentColor: 'var(--ifm-color-primary)'}}
              />
              <span>{copy.dot}</span>
            </label>
          </div>
        </div>

        <div className={`${styles.settings} ${styles.settingsTwo}`}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>{copy.tStyle}</span>
            <input
              type="checkbox"
              checked={Number(cfg.tStyle) === 1}
              onChange={(event) => setCfg((current) => ({...current, tStyle: event.target.checked ? 1 : 0}))}
              style={{width: '1.25rem', height: '1.25rem', accentColor: 'var(--ifm-color-primary)'}}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>{copy.recoil}</span>
            <input
              type="checkbox"
              checked={Number(cfg.recoil) === 1}
              onChange={(event) => setCfg((current) => ({...current, recoil: event.target.checked ? 1 : 0}))}
              style={{width: '1.25rem', height: '1.25rem', accentColor: 'var(--ifm-color-primary)'}}
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
