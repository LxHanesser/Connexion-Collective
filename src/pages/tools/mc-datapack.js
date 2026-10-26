import React, {useMemo, useState} from 'react';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import {downloadBlob} from '@site/src/lib/imageTools';
import {createZip} from '@site/src/lib/zip';
import styles from './shared.module.css';

const COPY = {
  zh: {
    title: '我的世界数据包生成器',
    description:
      '把一串命令打包成可直接放进 datapacks 文件夹的 ZIP：自动生成 pack.mcmeta、函数文件与 load/tick 标签。纯本地生成。',
    heading: '数据包生成器',
    lead: '填好名称与命令，生成 ZIP 丢进世界存档的 datapacks 目录即可。/reload 后生效。全部在浏览器里完成，不上传。',
    packName: '数据包名称',
    namespace: '命名空间',
    version: '目标版本',
    functionName: '函数名',
    commands: '命令内容（一行一条，不需要写 /）',
    withLoad: '生成 load 函数（进入世界时自动执行）',
    withTick: '生成 tick 函数（每刻执行，慎用）',
    generate: '生成并下载 ZIP',
    preview: '将生成的文件',
    copy: '复制',
    copied: '已复制',
    badName: '名称只能用小写字母、数字、下划线、点和短横线',
    badCommand: '命令里不要以 / 开头，那是聊天栏的用法',
    emptyCommands: '至少写一条命令',
    result: '已生成，解压后放进 <存档>/datapacks/ 然后执行 /reload',
    faqTitle: '说明',
    faq: [
      '1.21 起目录由 functions 改名为 function（单数），本工具会按你选的版本自动切换。',
      'pack_format 填错不会坏档，只会显示「不兼容」提示，仍可加载。',
      'load 函数在世界加载时跑一次；tick 函数每游戏刻（1/20 秒）跑一次，容易卡。',
      'ZIP 内路径必须是 data/<命名空间>/... 结构，否则游戏读不到。',
    ],
  },
  en: {
    title: 'Minecraft datapack generator',
    description:
      'Bundle commands into a ZIP you can drop into the datapacks folder — pack.mcmeta, function files and load/tick tags are generated for you.',
    heading: 'Datapack generator',
    lead: 'Fill in a name and your commands, then drop the ZIP into your world’s datapacks folder and run /reload. Everything happens locally.',
    packName: 'Pack name',
    namespace: 'Namespace',
    version: 'Target version',
    functionName: 'Function name',
    commands: 'Commands (one per line, no leading /)',
    withLoad: 'Generate a load function (runs when the world loads)',
    withTick: 'Generate a tick function (every tick — use with care)',
    generate: 'Generate and download ZIP',
    preview: 'Files to be created',
    copy: 'Copy',
    copied: 'Copied',
    badName: 'Use lowercase letters, digits, underscore, dot or dash only',
    badCommand: 'Do not start commands with "/" — that is chat syntax',
    emptyCommands: 'Add at least one command',
    result: 'Generated. Unzip into <world>/datapacks/ then run /reload',
    faqTitle: 'Notes',
    faq: [
      'From 1.21 the folder is function (singular) instead of functions — the tool switches based on your version.',
      'A wrong pack_format does not break the pack; the game just marks it incompatible and still loads it.',
      'load runs once when the world loads; tick runs every game tick (1/20 s) and can easily lag the server.',
      'Paths inside the ZIP must follow data/<namespace>/... or the game will not find them.',
    ],
  },
};

const VERSIONS = [
  {id: '1.20.4', label: '1.20.3 – 1.20.4', format: 26, folder: 'functions', tagFolder: 'functions'},
  {id: '1.21.1', label: '1.21 – 1.21.1', format: 48, folder: 'function', tagFolder: 'function'},
  {id: '1.21.4', label: '1.21.4', format: 61, folder: 'function', tagFolder: 'function'},
];

const NAME_PATTERN = /^[a-z0-9_.-]+$/;

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9_.-]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'pack';
}

export default function McDatapackPage() {
  const {i18n} = useDocusaurusContext();
  const copy = i18n.currentLocale === 'en' ? COPY.en : COPY.zh;

  const [packName, setPackName] = useState('my_pack');
  const [namespace, setNamespace] = useState('my_pack');
  const [version, setVersion] = useState('1.21.1');
  const [functionName, setFunctionName] = useState('main');
  const [commands, setCommands] = useState(() =>
    i18n.currentLocale === 'en' ? '# write your commands here\nsay hello' : '# 在这里写命令\nsay hello',
  );
  const [withLoad, setWithLoad] = useState(true);
  const [withTick, setWithTick] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const selected = VERSIONS.find((item) => item.id === version) || VERSIONS[1];

  const files = useMemo(() => {
    const cleanCommands = commands
      .split('\n')
      .map((line) => line.replace(/^\s*\//, ''))
      .join('\n')
      .trim();

    const list = [
      {
        name: 'pack.mcmeta',
        data: JSON.stringify(
          {pack: {pack_format: selected.format, description: packName}},
          null,
          2,
        ),
      },
      {
        name: `data/${namespace}/${selected.folder}/${functionName}.mcfunction`,
        data: `${cleanCommands}\n`,
      },
    ];

    if (withLoad) {
      list.push({
        name: `data/${namespace}/${selected.folder}/load.mcfunction`,
        data: `function ${namespace}:${functionName}\n`,
      });
      list.push({
        name: `data/minecraft/tags/${selected.tagFolder}/load.json`,
        data: JSON.stringify({values: [`${namespace}:load`]}, null, 2),
      });
    }

    if (withTick) {
      list.push({
        name: `data/${namespace}/${selected.folder}/tick.mcfunction`,
        data: `function ${namespace}:${functionName}\n`,
      });
      list.push({
        name: `data/minecraft/tags/${selected.tagFolder}/tick.json`,
        data: JSON.stringify({values: [`${namespace}:tick`]}, null, 2),
      });
    }

    return list;
  }, [commands, functionName, namespace, packName, selected, withLoad, withTick]);

  const handleGenerate = () => {
    setError('');
    setDone(false);

    if (!NAME_PATTERN.test(namespace) || !NAME_PATTERN.test(functionName)) {
      setError(copy.badName);
      return;
    }
    if (!commands.trim()) {
      setError(copy.emptyCommands);
      return;
    }
    if (/(^|\n)\s*\//.test(commands)) {
      setError(copy.badCommand);
      return;
    }

    try {
      const zip = createZip(files.map((file) => ({name: file.name, data: file.data})));
      downloadBlob(zip, `${packName || 'datapack'}.zip`);
      setDone(true);
    } catch (err) {
      setError(String(err?.message || err));
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
            <span className={styles.fieldLabel}>{copy.packName}</span>
            <input
              className={styles.textInput}
              value={packName}
              onChange={(event) => {
                setPackName(event.target.value);
                setNamespace(slugify(event.target.value));
              }}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>{copy.namespace}</span>
            <input
              className={styles.textInput}
              value={namespace}
              onChange={(event) => setNamespace(event.target.value.toLowerCase())}
            />
          </label>
        </div>

        <div className={`${styles.settings} ${styles.settingsTwo}`}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>{copy.version}</span>
            <select
              className={styles.select}
              value={version}
              onChange={(event) => setVersion(event.target.value)}
            >
              {VERSIONS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label} · {item.format}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>{copy.functionName}</span>
            <input
              className={styles.textInput}
              value={functionName}
              onChange={(event) => setFunctionName(event.target.value.toLowerCase())}
            />
          </label>
        </div>

        <div className={styles.settings}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>{copy.commands}</span>
            <textarea
              className={styles.textarea}
              value={commands}
              spellCheck={false}
              onChange={(event) => setCommands(event.target.value)}
            />
          </label>
        </div>

        <div className={`${styles.settings} ${styles.settingsTwo}`}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>{copy.withLoad}</span>
            <input
              type="checkbox"
              checked={withLoad}
              onChange={(event) => setWithLoad(event.target.checked)}
              style={{width: '1.25rem', height: '1.25rem', accentColor: 'var(--ifm-color-primary)'}}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>{copy.withTick}</span>
            <input
              type="checkbox"
              checked={withTick}
              onChange={(event) => setWithTick(event.target.checked)}
              style={{width: '1.25rem', height: '1.25rem', accentColor: 'var(--ifm-color-primary)'}}
            />
          </label>
        </div>

        <div className={styles.toolbar}>
          <button type="button" className="button button--primary" onClick={handleGenerate}>
            {copy.generate}
          </button>
        </div>

        {error ? <p className={styles.notice}>{error}</p> : null}
        {done ? <p className={styles.hint}>{copy.result}</p> : null}

        <Heading as="h2" className={styles.faqTitle} style={{marginTop: '1.5rem'}}>
          {copy.preview}
        </Heading>
        <ul className={styles.list}>
          {files.map((file) => (
            <li key={file.name} className={styles.item}>
              <div className={styles.itemMain}>
                <span
                  className={styles.itemName}
                  style={{
                    fontFamily: 'var(--ifm-font-family-monospace)',
                    whiteSpace: 'normal',
                    wordBreak: 'break-all',
                  }}
                >
                  {file.name}
                </span>
              </div>
            </li>
          ))}
        </ul>

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
