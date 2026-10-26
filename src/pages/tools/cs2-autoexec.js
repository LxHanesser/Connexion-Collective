import React, {useMemo, useState} from 'react';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import {copyText} from '@site/src/lib/clipboard';
import {downloadBlob} from '@site/src/lib/imageTools';
import styles from './shared.module.css';

const COPY = {
  zh: {
    title: 'CS2 autoexec.cfg 生成器',
    description:
      '勾选常用设置，生成可直接使用的 autoexec.cfg，含灵敏度、HUD、雷达、音量等。纯本地生成，不上传。',
    heading: 'CS2 autoexec.cfg 生成器',
    lead: '选好要写的设置，下面实时生成 cfg 内容。复制或下载后放进游戏目录的 cfg 文件夹，再用启动项 +exec autoexec.cfg 加载。',
    basicsTitle: '基础',
    sensitivity: '灵敏度',
    hudScaling: 'HUD 缩放',
    volume: '主音量',
    optionalTitle: '可选设置',
    optRadarCentered: '雷达始终居中',
    optRadarScale: '雷达缩放',
    optTeamId: '始终显示队友 ID',
    optShowFps: '显示 FPS',
    optAutoWeaponSwitch: '捡枪时不自动切换',
    optMuteLoseFocus: '失焦时静音',
    customTitle: '自定义命令（每行一条，不需要斜杠）',
    resultTitle: 'autoexec.cfg',
    launchTitle: '启动项',
    launchNote: 'Steam → 右键 CS2 → 属性 → 启动选项，粘贴下面这行：',
    copy: '复制 cfg',
    copied: '已复制',
    copyLaunch: '复制启动项',
    download: '下载 autoexec.cfg',
    note: 'cfg 里的 // 是注释。CS2 中部分老指令会被忽略（控制台提示 Unknown command），不影响游戏运行，删掉对应行即可。',
    faqTitle: '说明',
    faq: [
      'autoexec.cfg 必须放在 ...\\Counter-Strike Global Offensive\\game\\csgo\\cfg\\ 下。',
      '启动项里加 +exec autoexec.cfg，游戏启动时才会自动执行。',
      'host_writeconfig 会把当前设置写回 config.cfg，避免被后续改动覆盖。',
      '不同版本的指令有效性会变，生成后如果控制台报 Unknown command，删掉那一行重试。',
      '这里生成的内容只保存在你的浏览器里，关闭页面就没了。',
    ],
  },
  en: {
    title: 'CS2 autoexec.cfg generator',
    description:
      'Tick the settings you want and generate a ready-to-use autoexec.cfg covering sensitivity, HUD, radar and audio. Built locally.',
    heading: 'CS2 autoexec.cfg generator',
    lead: 'Pick the settings you want and the cfg is generated live below. Copy or download it into the game’s cfg folder, then load it with +exec autoexec.cfg in your launch options.',
    basicsTitle: 'Basics',
    sensitivity: 'Sensitivity',
    hudScaling: 'HUD scaling',
    volume: 'Master volume',
    optionalTitle: 'Optional',
    optRadarCentered: 'Radar always centred',
    optRadarScale: 'Radar scale',
    optTeamId: 'Always show teammate IDs',
    optShowFps: 'Show FPS',
    optAutoWeaponSwitch: 'Do not auto-switch on pickup',
    optMuteLoseFocus: 'Mute when unfocused',
    customTitle: 'Custom commands (one per line, no slash)',
    resultTitle: 'autoexec.cfg',
    launchTitle: 'Launch options',
    launchNote: 'Steam → right-click CS2 → Properties → Launch Options, then paste this:',
    copy: 'Copy cfg',
    copied: 'Copied',
    copyLaunch: 'Copy launch options',
    download: 'Download autoexec.cfg',
    note: 'Lines starting with // are comments. Some legacy commands are ignored by CS2 (the console says Unknown command); that does not break anything — just remove the line.',
    faqTitle: 'Notes',
    faq: [
      'autoexec.cfg goes in ...\\Counter-Strike Global Offensive\\game\\csgo\\cfg\\.',
      'Add +exec autoexec.cfg to your launch options so it runs at startup.',
      'host_writeconfig writes the current settings back to config.cfg so they survive later changes.',
      'Command validity changes between versions. If the console reports Unknown command, delete that line and retry.',
      'What you generate here only lives in your browser; closing the page discards it.',
    ],
  },
};

const LAUNCH = '-novid -console +exec autoexec.cfg -freq 240';

export default function Cs2AutoexecPage() {
  const {i18n} = useDocusaurusContext();
  const copy = i18n.currentLocale === 'en' ? COPY.en : COPY.zh;

  const [sens, setSens] = useState('1');
  const [hud, setHud] = useState(0.85);
  const [volume, setVolume] = useState(0.3);
  const [radarScale, setRadarScale] = useState(0.3);
  const [options, setOptions] = useState({
    radarCentered: true,
    radarScale: true,
    teamId: true,
    showFps: true,
    autoWeaponSwitch: true,
    muteLoseFocus: true,
  });
  const [custom, setCustom] = useState('');
  const [copied, setCopied] = useState('');
  const [error, setError] = useState('');

  const toggle = (key) => setOptions((current) => ({...current, [key]: !current[key]}));

  const cfg = useMemo(() => {
    const lines = [
      '// autoexec.cfg',
      '// generated locally in the browser — nothing uploaded',
      `sensitivity ${Number(sens) || 1}`,
      `hud_scaling ${hud}`,
    ];
    if (options.radarCentered) lines.push('cl_radar_always_centered 0');
    if (options.radarScale) lines.push(`cl_radar_scale ${radarScale}`);
    if (options.teamId) lines.push('cl_teamid_overhead_always 1');
    if (options.showFps) lines.push('cl_showfps 1');
    if (options.autoWeaponSwitch) lines.push('cl_autowepswitch 0');
    if (options.muteLoseFocus) lines.push('snd_mute_losefocus 0');
    lines.push(`volume ${volume}`);

    const extra = custom
      .split('\n')
      .map((line) => line.replace(/^\s*\//, '').trim())
      .filter(Boolean);
    if (extra.length) {
      lines.push('', '// custom');
      lines.push(...extra);
    }

    lines.push('', 'host_writeconfig');
    return lines.join('\n');
  }, [sens, hud, volume, radarScale, options, custom]);

  const handleCopy = async (key, text) => {
    if (await copyText(text)) {
      setCopied(key);
      window.setTimeout(() => setCopied(''), 1500);
    }
  };

  const handleDownload = () => {
    if (!/^\s*sensitivity\s+[0-9.]+/m.test(cfg)) {
      setError(copy.sensitivity);
      return;
    }
    setError('');
    downloadBlob(new Blob([cfg], {type: 'text/plain'}), 'autoexec.cfg');
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

        <Heading as="h2" className={styles.faqTitle}>
          {copy.basicsTitle}
        </Heading>
        <div className={`${styles.settings} ${styles.settingsTwo}`}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>{copy.sensitivity}</span>
            <input
              className={styles.textInput}
              type="number"
              inputMode="decimal"
              min="0.01"
              step="0.01"
              value={sens}
              onChange={(event) => setSens(event.target.value)}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>
              {copy.hudScaling} · {hud.toFixed(2)}
            </span>
            <input
              className={styles.range}
              type="range"
              min="0.5"
              max="0.95"
              step="0.05"
              value={hud}
              onChange={(event) => setHud(Number(event.target.value))}
            />
          </label>
        </div>

        <Heading as="h2" className={styles.faqTitle} style={{marginTop: '1.5rem'}}>
          {copy.optionalTitle}
        </Heading>
        <ul className={styles.list}>
          {[
            ['radarCentered', copy.optRadarCentered],
            ['teamId', copy.optTeamId],
            ['showFps', copy.optShowFps],
            ['autoWeaponSwitch', copy.optAutoWeaponSwitch],
            ['muteLoseFocus', copy.optMuteLoseFocus],
          ].map(([key, label]) => (
            <li key={key} className={styles.item}>
              <label style={{display: 'flex', alignItems: 'center', gap: '0.6rem', minHeight: 44, width: '100%'}}>
                <input
                  type="checkbox"
                  checked={options[key]}
                  onChange={() => toggle(key)}
                  style={{width: '1.25rem', height: '1.25rem', accentColor: 'var(--ifm-color-primary)'}}
                />
                <span>{label}</span>
              </label>
            </li>
          ))}
          <li className={styles.item}>
            <label style={{display: 'flex', alignItems: 'center', gap: '0.6rem', minHeight: 44, width: '100%'}}>
              <input
                type="checkbox"
                checked={options.radarScale}
                onChange={() => toggle('radarScale')}
                style={{width: '1.25rem', height: '1.25rem', accentColor: 'var(--ifm-color-primary)'}}
              />
              <span>{copy.optRadarScale}</span>
            </label>
            <input
              className={styles.range}
              type="range"
              min="0.25"
              max="1"
              step="0.05"
              value={radarScale}
              onChange={(event) => setRadarScale(Number(event.target.value))}
              disabled={!options.radarScale}
              aria-label={copy.optRadarScale}
              style={{maxWidth: 160}}
            />
          </li>
        </ul>

        <div className={styles.settings} style={{marginTop: '1rem'}}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>
              {copy.volume} · {volume.toFixed(2)}
            </span>
            <input
              className={styles.range}
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={(event) => setVolume(Number(event.target.value))}
            />
          </label>
        </div>

        <div className={styles.settings} style={{marginTop: '1.5rem'}}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>{copy.customTitle}</span>
            <textarea
              className={styles.textarea}
              value={custom}
              spellCheck={false}
              placeholder="cl_crosshairstyle 4"
              onChange={(event) => setCustom(event.target.value)}
            />
          </label>
        </div>

        <Heading as="h2" className={styles.faqTitle} style={{marginTop: '2rem'}}>
          {copy.resultTitle}
        </Heading>
        <div className={styles.toolbar}>
          <button type="button" className="button button--primary" onClick={() => handleCopy('cfg', cfg)}>
            {copied === 'cfg' ? copy.copied : copy.copy}
          </button>
          <button type="button" className="button button--secondary" onClick={handleDownload}>
            {copy.download}
          </button>
        </div>
        {error ? <p className={styles.notice}>{error}</p> : null}
        <textarea
          className={styles.textarea}
          readOnly
          value={cfg}
          spellCheck={false}
          onFocus={(event) => event.target.select()}
        />

        <Heading as="h2" className={styles.faqTitle} style={{marginTop: '2rem'}}>
          {copy.launchTitle}
        </Heading>
        <p className={styles.fieldHint}>{copy.launchNote}</p>
        <div className={styles.copyRow}>
          <code style={{flex: 1, padding: '0.6rem', overflowX: 'auto'}}>{LAUNCH}</code>
          <button
            type="button"
            className="button button--secondary button--sm"
            onClick={() => handleCopy('launch', LAUNCH)}
          >
            {copied === 'launch' ? copy.copied : copy.copyLaunch}
          </button>
        </div>

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
