import React, {useMemo, useState} from 'react';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import {copyText} from '@site/src/lib/clipboard';
import styles from './shared.module.css';

const COPY = {
  zh: {
    title: '我的世界坐标换算',
    description:
      '主世界与下界坐标互转，顺带算出区块坐标、区块内偏移与 region 文件名。纯本地计算，不上传任何数据。',
    heading: '坐标换算',
    lead: '主世界与下界按 8:1 换算。输入任意一组坐标，下面是全部对应结果，点数值即可复制。',
    xLabel: 'X 坐标',
    zLabel: 'Z 坐标',
    yLabel: 'Y 坐标（可选）',
    fromLabel: '我输入的是',
    overworld: '主世界',
    nether: '下界',
    results: '换算结果',
    copied: '已复制',
    copyHint: '点击任意数值复制',
    faqTitle: '说明',
    faq: [
      '主世界 ÷ 8 = 下界，下界 × 8 = 主世界。Y 轴不参与换算。',
      '区块坐标 = floor(坐标 ÷ 16)，区块内偏移 = 坐标 mod 16（结果恒为 0–15）。',
      'region 文件 = floor(区块坐标 ÷ 32)，文件名为 r.<x>.<z>.mca。',
      '四舍五入误差：Minecraft 内部用整数坐标，负数取整规则与本工具一致（向下取整）。',
    ],
  },
  en: {
    title: 'Minecraft coordinate converter',
    description:
      'Convert between Overworld and Nether coordinates, plus chunk coordinates, in-chunk offsets and region file names. Everything runs locally.',
    heading: 'Coordinate converter',
    lead: 'The Overworld and the Nether map at 8:1. Enter any coordinate pair and every equivalent value appears below — click a value to copy it.',
    xLabel: 'X coordinate',
    zLabel: 'Z coordinate',
    yLabel: 'Y coordinate (optional)',
    fromLabel: 'These coordinates are',
    overworld: 'Overworld',
    nether: 'Nether',
    results: 'Results',
    copied: 'Copied',
    copyHint: 'Click any value to copy',
    faqTitle: 'Notes',
    faq: [
      'Overworld ÷ 8 = Nether, Nether × 8 = Overworld. Y is not scaled.',
      'Chunk = floor(coordinate ÷ 16); offset inside the chunk = coordinate mod 16 (always 0–15).',
      'Region file = floor(chunk ÷ 32), named r.<x>.<z>.mca.',
      'Minecraft uses integer coordinates; this tool floors negative numbers the same way the game does.',
    ],
  },
};

const floorDiv = (value, size) => Math.floor(value / size);
const mod = (value, size) => ((value % size) + size) % size;

export default function McCoordsPage() {
  const {i18n} = useDocusaurusContext();
  const copy = i18n.currentLocale === 'en' ? COPY.en : COPY.zh;

  const [x, setX] = useState('0');
  const [z, setZ] = useState('0');
  const [dimension, setDimension] = useState('overworld');
  const [copied, setCopied] = useState('');

  const rows = useMemo(() => {
    const px = Number(x);
    const pz = Number(z);
    if (!Number.isFinite(px) || !Number.isFinite(pz)) return null;

    const nether = dimension === 'nether';
    const owX = nether ? px * 8 : px;
    const owZ = nether ? pz * 8 : pz;
    const neX = nether ? px : Math.floor(px / 8);
    const neZ = nether ? pz : Math.floor(pz / 8);
    const chunkX = floorDiv(px, 16);
    const chunkZ = floorDiv(pz, 16);

    return [
      {key: 'ow', label: copy.overworld, value: `${owX}, ${owZ}`},
      {key: 'ne', label: copy.nether, value: `${neX}, ${neZ}`},
      {key: 'chunk', label: 'Chunk', value: `${chunkX}, ${chunkZ}`},
      {key: 'offset', label: 'In-chunk', value: `${mod(px, 16)}, ${mod(pz, 16)}`},
      {
        key: 'region',
        label: 'Region',
        value: `r.${floorDiv(chunkX, 32)}.${floorDiv(chunkZ, 32)}.mca`,
      },
    ];
  }, [x, z, dimension, copy.overworld, copy.nether]);

  const handleCopy = async (key, value) => {
    const ok = await copyText(value);
    if (ok) {
      setCopied(key);
      window.setTimeout(() => setCopied(''), 1400);
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

        <div className={`${styles.settings} ${styles.settingsTwo}`}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>{copy.xLabel}</span>
            <input
              className={styles.textInput}
              type="number"
              inputMode="numeric"
              value={x}
              onChange={(event) => setX(event.target.value)}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>{copy.zLabel}</span>
            <input
              className={styles.textInput}
              type="number"
              inputMode="numeric"
              value={z}
              onChange={(event) => setZ(event.target.value)}
            />
          </label>
        </div>

        <div className={styles.settings}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>{copy.fromLabel}</span>
            <select
              className={styles.select}
              value={dimension}
              onChange={(event) => setDimension(event.target.value)}
            >
              <option value="overworld">{copy.overworld}</option>
              <option value="nether">{copy.nether}</option>
            </select>
          </label>
        </div>

        <Heading as="h2" className={styles.faqTitle} style={{marginTop: '2rem'}}>
          {copy.results}
        </Heading>
        <p className={styles.fieldHint}>{copy.copyHint}</p>

        {rows ? (
          <ul className={styles.list}>
            {rows.map((row) => (
              <li key={row.key} className={styles.item}>
                <div className={styles.itemMain}>
                  <span className={styles.itemMeta}>{row.label}</span>
                  <span className={styles.itemName} style={{fontFamily: 'var(--ifm-font-family-monospace)'}}>
                    {row.value}
                  </span>
                </div>
                <div className={styles.itemActions}>
                  <button
                    type="button"
                    className="button button--secondary button--sm"
                    onClick={() => handleCopy(row.key, row.value)}
                  >
                    {copied === row.key ? copy.copied : 'Copy'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.notice}>请输入有效数字</p>
        )}

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
