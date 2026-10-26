import React, {useMemo, useState} from 'react';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import {copyText} from '@site/src/lib/clipboard';
import styles from './shared.module.css';

const COPY = {
  zh: {
    title: 'CS2 灵敏度换算器',
    description:
      '在 CS2、Valorant、Apex、守望先锋之间换算灵敏度，核心是保持 cm/360 一致。纯本地计算，不上传任何数据。',
    heading: 'CS2 灵敏度换算器',
    lead: '换算的依据不是「灵敏度数字相同」，而是「转一圈鼠标走多远相同」（cm/360）。输入你当前游戏的灵敏度和 DPI，下面会算出其它游戏该填多少。',
    gameLabel: '当前游戏',
    sensLabel: '游戏内灵敏度',
    dpiLabel: '鼠标 DPI',
    resultTitle: '你的手感',
    cm360: 'cm / 360°',
    edpi: 'eDPI（灵敏度 × DPI）',
    inches: '英寸 / 360°',
    counts: 'counts / 360°',
    targetTitle: '换算到其它游戏',
    targetGame: '游戏',
    targetSens: '建议灵敏度',
    copied: '已复制',
    copy: '复制',
    note: '只适用于「腰射 / 通用灵敏度」。开镜、狙击镜的倍率由各游戏单独计算（例如 CS2 的 zoom_sensitivity_ratio），换算后需要再按手感微调。',
    faqTitle: '说明',
    faq: [
      'cm/360 是鼠标转满 360° 需要的物理距离，是跨游戏比较手感最可靠的标准。',
      'eDPI = 灵敏度 × DPI，只适合同一款游戏内部比较，跨游戏没有意义。',
      '各游戏的 yaw 值不同：CS2 / Apex 为 0.022，Valorant 为 0.07，守望先锋为 0.0066（每 count 转过的角度）。',
      '换算结果是精确数学值，实际手感还受鼠标垫、握姿、游戏内 FOV 影响。',
      '所有计算都在浏览器里完成，输入的数字不会发送到任何地方。',
    ],
  },
  en: {
    title: 'CS2 sensitivity converter',
    description:
      'Convert sensitivity between CS2, Valorant, Apex and Overwatch while keeping cm/360 constant. Everything is computed locally.',
    heading: 'CS2 sensitivity converter',
    lead: 'The right thing to compare is not the sensitivity number but how far the mouse travels per 360° turn. Enter your current game, sensitivity and DPI, and the other games’ equivalents appear below.',
    gameLabel: 'Current game',
    sensLabel: 'In-game sensitivity',
    dpiLabel: 'Mouse DPI',
    resultTitle: 'Your aim feel',
    cm360: 'cm / 360°',
    edpi: 'eDPI (sensitivity × DPI)',
    inches: 'inches / 360°',
    counts: 'counts / 360°',
    targetTitle: 'Same feel in other games',
    targetGame: 'Game',
    targetSens: 'Suggested sensitivity',
    copied: 'Copied',
    copy: 'Copy',
    note: 'This covers hip-fire / general sensitivity. Scoped multipliers are handled per game (CS2’s zoom_sensitivity_ratio, for example), so fine-tune by feel afterwards.',
    faqTitle: 'Notes',
    faq: [
      'cm/360 is the physical distance your mouse travels for a full 360° turn — the most reliable cross-game comparison.',
      'eDPI = sensitivity × DPI. It only compares configurations inside one game; it means nothing across games.',
      'Yaw differs per game: 0.022 for CS2 and Apex, 0.07 for Valorant, 0.0066 for Overwatch (degrees per count).',
      'The maths is exact, but real feel also depends on your pad, grip and in-game FOV.',
      'Every calculation happens in your browser; nothing you type is sent anywhere.',
    ],
  },
};

// yaw = 每个 count 转过的角度（灵敏度为 1 时）
const GAMES = [
  {id: 'cs2', label: 'CS2', yaw: 0.022},
  {id: 'valorant', label: 'Valorant', yaw: 0.07},
  {id: 'apex', label: 'Apex Legends', yaw: 0.022},
  {id: 'overwatch', label: 'Overwatch 2', yaw: 0.0066},
];

const cm360From = (sens, dpi, yaw) => (360 / (sens * yaw) / dpi) * 2.54;
const sensFrom = (cm360, dpi, yaw) => (360 * 2.54) / (cm360 * dpi * yaw);

export default function Cs2SensitivityPage() {
  const {i18n} = useDocusaurusContext();
  const copy = i18n.currentLocale === 'en' ? COPY.en : COPY.zh;

  const [gameId, setGameId] = useState('cs2');
  const [sens, setSens] = useState('1');
  const [dpi, setDpi] = useState('800');
  const [copied, setCopied] = useState('');

  const game = GAMES.find((item) => item.id === gameId) || GAMES[0];
  const sensValue = Number(sens);
  const dpiValue = Number(dpi);
  const valid = sensValue > 0 && dpiValue > 0;

  const result = useMemo(() => {
    if (!valid) return null;
    const cm360 = cm360From(sensValue, dpiValue, game.yaw);
    return {
      cm360,
      inches: cm360 / 2.54,
      counts: cm360 / 2.54 * dpiValue,
      edpi: sensValue * dpiValue,
      targets: GAMES.filter((item) => item.id !== game.id).map((item) => ({
        ...item,
        sens: sensFrom(cm360, dpiValue, item.yaw),
      })),
    };
  }, [valid, sensValue, dpiValue, game]);

  const handleCopy = async (key, value) => {
    if (await copyText(value)) {
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
            <span className={styles.fieldLabel}>{copy.gameLabel}</span>
            <select
              className={styles.select}
              value={gameId}
              onChange={(event) => setGameId(event.target.value)}
            >
              {GAMES.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>{copy.sensLabel}</span>
            <input
              className={styles.textInput}
              type="number"
              inputMode="decimal"
              step="0.001"
              min="0.001"
              value={sens}
              onChange={(event) => setSens(event.target.value)}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>{copy.dpiLabel}</span>
            <input
              className={styles.textInput}
              type="number"
              inputMode="numeric"
              step="100"
              min="1"
              value={dpi}
              onChange={(event) => setDpi(event.target.value)}
            />
          </label>
        </div>

        {result ? (
          <>
            <Heading as="h2" className={styles.faqTitle} style={{marginTop: '2rem'}}>
              {copy.resultTitle}
            </Heading>
            <ul className={styles.list}>
              {[
                {key: 'cm360', label: copy.cm360, value: result.cm360.toFixed(2), copyable: result.cm360.toFixed(2)},
                {key: 'edpi', label: copy.edpi, value: result.edpi.toFixed(0), copyable: result.edpi.toFixed(0)},
                {key: 'inches', label: copy.inches, value: result.inches.toFixed(2)},
                {key: 'counts', label: copy.counts, value: Math.round(result.counts).toLocaleString()},
              ].map((row) => (
                <li key={row.key} className={styles.item}>
                  <div className={styles.itemMain}>
                    <span className={styles.itemMeta}>{row.label}</span>
                    <span className={styles.itemName}>{row.value}</span>
                  </div>
                  {row.copyable ? (
                    <div className={styles.itemActions}>
                      <button
                        type="button"
                        className="button button--secondary button--sm"
                        onClick={() => handleCopy(row.key, row.copyable)}
                      >
                        {copied === row.key ? copy.copied : copy.copy}
                      </button>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>

            <Heading as="h2" className={styles.faqTitle} style={{marginTop: '2rem'}}>
              {copy.targetTitle}
            </Heading>
            <ul className={styles.list}>
              {result.targets.map((item) => (
                <li key={item.id} className={styles.item}>
                  <div className={styles.itemMain}>
                    <span className={styles.itemMeta}>{copy.targetGame}</span>
                    <span className={styles.itemName}>
                      {item.label} · {item.sens.toFixed(3)}
                    </span>
                  </div>
                  <div className={styles.itemActions}>
                    <button
                      type="button"
                      className="button button--secondary button--sm"
                      onClick={() => handleCopy(item.id, item.sens.toFixed(3))}
                    >
                      {copied === item.id ? copy.copied : copy.copy}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            <p className={styles.fieldHint}>{copy.note}</p>
          </>
        ) : (
          <p className={styles.notice}>请输入大于 0 的灵敏度与 DPI</p>
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
