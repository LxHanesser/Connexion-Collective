import React, {useCallback, useMemo, useState} from 'react';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import styles from './shared.module.css';

const TABS = [
  {id: 'json', zh: 'JSON 格式化', en: 'JSON formatter'},
  {id: 'base64', zh: 'Base64 / URL', en: 'Base64 / URL'},
  {id: 'hash', zh: '哈希', en: 'Hashing'},
  {id: 'timestamp', zh: '时间戳', en: 'Timestamps'},
  {id: 'uuid', zh: 'UUID', en: 'UUID'},
];

const HASH_ALGOS = ['SHA-256', 'SHA-384', 'SHA-512'];

function bytesToBase64(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBytes(base64) {
  const binary = atob(base64.replace(/\s+/g, ''));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function toHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export default function DevToolsPage() {
  const {i18n} = useDocusaurusContext();
  const isEn = i18n.currentLocale === 'en';
  const t = (zh, en) => (isEn ? en : zh);

  const [tab, setTab] = useState('json');
  const [copied, setCopied] = useState('');

  const copy = useCallback(async (value, key) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      window.setTimeout(() => setCopied(''), 1500);
    } catch {
      setCopied('failed');
    }
  }, []);

  return (
    <Layout
      title={t('开发工具', 'Developer tools')}
      description={t(
        'JSON 格式化、Base64、哈希、时间戳、UUID，全部在浏览器本地运行。',
        'JSON formatting, Base64, hashing, timestamps, and UUIDs — all running locally in your browser.',
      )}>
      <main className={styles.page}>
        <header className={styles.header}>
          <Heading as="h1" className={styles.title}>
            {t('开发工具', 'Developer tools')}
          </Heading>
          <p className={styles.lead}>
            {t(
              'JSON 格式化、Base64 / URL 编解码、哈希、时间戳、UUID。全部在本地计算，输入内容不会上传。',
              'JSON formatting, Base64 / URL encoding, hashing, timestamps, and UUIDs. Everything runs locally; nothing you type is uploaded.',
            )}
          </p>
          <p className={styles.badgeRow}>
            <span className={styles.badge}>{t('🔒 本地运行', '🔒 Runs locally')}</span>
            <span className={styles.badge}>{t('⚡ 无网络请求', '⚡ No network requests')}</span>
            <span className={styles.badge}>{t('🧰 5 个小工具', '🧰 Five utilities')}</span>
          </p>
        </header>

        <div className={styles.tabs} role="tablist">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              className={`${styles.tab} ${tab === item.id ? styles.tabActive : ''}`}
              onClick={() => setTab(item.id)}>
              {isEn ? item.en : item.zh}
            </button>
          ))}
        </div>

        {tab === 'json' && <JsonTool copied={copied} copy={copy} t={t} />}
        {tab === 'base64' && <Base64Tool copied={copied} copy={copy} t={t} />}
        {tab === 'hash' && <HashTool copied={copied} copy={copy} t={t} />}
        {tab === 'timestamp' && <TimestampTool copied={copied} copy={copy} t={t} isEn={isEn} />}
        {tab === 'uuid' && <UuidTool copied={copied} copy={copy} t={t} />}

        <section className={styles.faq}>
          <h2 className={styles.faqTitle}>{t('说明', 'Notes')}</h2>
          <ul className={styles.faqList}>
            {isEn ? (
              <>
                <li>All calculation happens in the browser; the page sends no requests.</li>
                <li>Hashing and clipboard access require HTTPS, which this site uses.</li>
                <li>Nothing is saved; refreshing the page clears everything.</li>
              </>
            ) : (
              <>
                <li>所有计算都在浏览器里完成，页面不会发送任何请求。</li>
                <li>哈希与剪贴板功能需要 HTTPS（本站已启用）。</li>
                <li>这些工具不保存历史记录，刷新即清空。</li>
              </>
            )}
          </ul>
        </section>
      </main>
    </Layout>
  );
}

function JsonTool({copied, copy, t}) {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');

  const run = (indent) => {
    if (!input.trim()) {
      setError('');
      setOutput('');
      return;
    }
    try {
      const parsed = JSON.parse(input);
      setOutput(JSON.stringify(parsed, null, indent));
      setError('');
    } catch (parseError) {
      setOutput('');
      setError(
        t(
          parseError instanceof Error ? parseError.message : '解析失败',
          parseError instanceof Error ? parseError.message : 'Parsing failed',
        ),
      );
    }
  };

  return (
    <div className={styles.panel}>
      <label className={styles.field}>
        <span className={styles.fieldLabel}>{t('输入 JSON', 'Input JSON')}</span>
        <textarea className={styles.textarea} value={input} onChange={(event) => setInput(event.target.value)} rows={8} placeholder='{"hello": "world"}' />
      </label>

      <div className={styles.buttonRow} style={{marginTop: '1rem'}}>
        <button type="button" className="button button--primary" onClick={() => run(2)}>
          {t('格式化', 'Format')}
        </button>
        <button type="button" className="button button--secondary" onClick={() => run(0)}>
          {t('压缩成一行', 'Minify')}
        </button>
        <button type="button" className="button button--secondary" onClick={() => { setInput(''); setOutput(''); setError(''); }}>
          {t('清空', 'Clear')}
        </button>
      </div>

      {error && <p className={styles.notice}>{error}</p>}

      {output && (
        <>
          <label className={styles.field} style={{marginTop: '1.25rem'}}>
            <span className={styles.fieldLabel}>{t('结果', 'Result')}</span>
            <textarea className={styles.textarea} value={output} readOnly rows={10} />
          </label>
          <div className={styles.buttonRow} style={{marginTop: '0.75rem'}}>
            <button type="button" className="button button--secondary" onClick={() => copy(output, 'json')}>
              {copied === 'json' ? t('已复制', 'Copied') : t('复制结果', 'Copy result')}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function Base64Tool({copied, copy, t}) {
  const [mode, setMode] = useState('b64-encode');
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');

  const run = () => {
    try {
      if (mode === 'b64-encode') {
        setOutput(bytesToBase64(new TextEncoder().encode(input)));
      } else if (mode === 'b64-decode') {
        setOutput(new TextDecoder().decode(base64ToBytes(input)));
      } else if (mode === 'url-encode') {
        setOutput(encodeURIComponent(input));
      } else {
        setOutput(decodeURIComponent(input));
      }
      setError('');
    } catch (transformError) {
      setOutput('');
      setError(
        t(
          transformError instanceof Error ? transformError.message : '转换失败',
          transformError instanceof Error ? transformError.message : 'Conversion failed',
        ),
      );
    }
  };

  return (
    <div className={styles.panel}>
      <label className={styles.field}>
        <span className={styles.fieldLabel}>{t('转换方式', 'Conversion')}</span>
        <select className={styles.select} value={mode} onChange={(event) => setMode(event.target.value)}>
          <option value="b64-encode">{t('文本 → Base64', 'Text → Base64')}</option>
          <option value="b64-decode">{t('Base64 → 文本', 'Base64 → Text')}</option>
          <option value="url-encode">{t('URL 编码', 'URL encode')}</option>
          <option value="url-decode">{t('URL 解码', 'URL decode')}</option>
        </select>
      </label>

      <label className={styles.field} style={{marginTop: '1rem'}}>
        <span className={styles.fieldLabel}>{t('输入', 'Input')}</span>
        <textarea className={styles.textarea} value={input} onChange={(event) => setInput(event.target.value)} rows={6} />
      </label>

      <div className={styles.buttonRow} style={{marginTop: '1rem'}}>
        <button type="button" className="button button--primary" onClick={run}>
          {t('转换', 'Convert')}
        </button>
        <button type="button" className="button button--secondary" onClick={() => { setInput(''); setOutput(''); setError(''); }}>
          {t('清空', 'Clear')}
        </button>
      </div>

      {error && <p className={styles.notice}>{error}</p>}

      {output && (
        <>
          <label className={styles.field} style={{marginTop: '1.25rem'}}>
            <span className={styles.fieldLabel}>{t('结果', 'Result')}</span>
            <textarea className={styles.textarea} value={output} readOnly rows={6} />
          </label>
          <div className={styles.buttonRow} style={{marginTop: '0.75rem'}}>
            <button type="button" className="button button--secondary" onClick={() => copy(output, 'b64')}>
              {copied === 'b64' ? t('已复制', 'Copied') : t('复制结果', 'Copy result')}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function HashTool({copied, copy, t}) {
  const [input, setInput] = useState('');
  const [algo, setAlgo] = useState('SHA-256');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    try {
      const data = new TextEncoder().encode(input);
      const digest = await crypto.subtle.digest(algo, data);
      setOutput(toHex(digest));
      setError('');
    } catch (hashError) {
      setOutput('');
      setError(
        t(
          hashError instanceof Error ? hashError.message : '计算失败',
          hashError instanceof Error ? hashError.message : 'Calculation failed',
        ),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.panel}>
      <label className={styles.field}>
        <span className={styles.fieldLabel}>{t('算法', 'Algorithm')}</span>
        <select className={styles.select} value={algo} onChange={(event) => setAlgo(event.target.value)}>
          {HASH_ALGOS.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>
      </label>

      <label className={styles.field} style={{marginTop: '1rem'}}>
        <span className={styles.fieldLabel}>{t('输入文本', 'Input text')}</span>
        <textarea className={styles.textarea} value={input} onChange={(event) => setInput(event.target.value)} rows={6} />
      </label>

      <div className={styles.buttonRow} style={{marginTop: '1rem'}}>
        <button type="button" className="button button--primary" onClick={run} disabled={busy}>
          {busy ? t('计算中…', 'Calculating…') : t('计算哈希', 'Compute hash')}
        </button>
      </div>

      {error && <p className={styles.notice}>{error}</p>}

      {output && (
        <>
          <label className={styles.field} style={{marginTop: '1.25rem'}}>
            <span className={styles.fieldLabel}>{t('结果（十六进制）', 'Result (hex)')}</span>
            <textarea className={styles.textarea} value={output} readOnly rows={3} />
          </label>
          <div className={styles.buttonRow} style={{marginTop: '0.75rem'}}>
            <button type="button" className="button button--secondary" onClick={() => copy(output, 'hash')}>
              {copied === 'hash' ? t('已复制', 'Copied') : t('复制结果', 'Copy result')}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function TimestampTool({copied, copy, t, isEn}) {
  const [value, setValue] = useState(() => String(Math.floor(Date.now() / 1000)));
  const [localDate, setLocalDate] = useState('');

  const parsed = useMemo(() => {
    const raw = value.trim();
    if (!/^\d+$/.test(raw)) {
      return null;
    }
    const number = Number(raw);
    // 10 位按秒，13 位按毫秒
    const ms = raw.length <= 10 ? number * 1000 : number;
    const date = new Date(ms);
    if (Number.isNaN(date.getTime())) {
      return null;
    }
    return {ms, date};
  }, [value]);

  return (
    <div className={styles.panel}>
      <label className={styles.field}>
        <span className={styles.fieldLabel}>{t('Unix 时间戳（秒或毫秒）', 'Unix timestamp (seconds or ms)')}</span>
        <div className={styles.copyRow}>
          <input className={styles.textInput} value={value} onChange={(event) => setValue(event.target.value)} inputMode="numeric" />
          <button type="button" className="button button--secondary button--sm" onClick={() => setValue(String(Math.floor(Date.now() / 1000)))}>
            {t('当前', 'Now')}
          </button>
        </div>
      </label>

      {parsed ? (
        <div style={{marginTop: '1.25rem'}}>
          <p><strong>{t('本地时间：', 'Local time: ')}</strong>{parsed.date.toLocaleString(isEn ? 'en-US' : 'zh-CN', {hour12: false})}</p>
          <p><strong>UTC: </strong>{parsed.date.toISOString()}</p>
          <p><strong>{t('毫秒：', 'Milliseconds: ')}</strong>{parsed.ms}</p>
          <div className={styles.buttonRow}>
            <button type="button" className="button button--secondary" onClick={() => copy(String(parsed.ms), 'ts')}>
              {copied === 'ts' ? t('已复制', 'Copied') : t('复制毫秒值', 'Copy ms')}
            </button>
          </div>
        </div>
      ) : (
        <p className={styles.notice}>
          {t('请输入纯数字时间戳（10 位为秒，13 位为毫秒）', 'Enter a numeric timestamp (10 digits for seconds, 13 for milliseconds)')}
        </p>
      )}

      <div className={styles.field} style={{marginTop: '1.5rem'}}>
        <span className={styles.fieldLabel}>{t('反过来：日期 → 时间戳', 'The other way: date → timestamp')}</span>
        <div className={styles.copyRow}>
          <input className={styles.textInput} type="datetime-local" value={localDate} onChange={(event) => setLocalDate(event.target.value)} />
          <button
            type="button"
            className="button button--secondary button--sm"
            onClick={() => {
              if (!localDate) return;
              const date = new Date(localDate);
              setValue(String(Math.floor(date.getTime() / 1000)));
            }}>
            {t('转换', 'Convert')}
          </button>
        </div>
      </div>
    </div>
  );
}

function UuidTool({copied, copy, t}) {
  const [list, setList] = useState(() => Array.from({length: 5}, () => crypto.randomUUID()));

  return (
    <div className={styles.panel}>
      <div className={styles.buttonRow}>
        <button type="button" className="button button--primary" onClick={() => setList(Array.from({length: 5}, () => crypto.randomUUID()))}>
          {t('重新生成 5 个', 'Generate 5 new')}
        </button>
        <button type="button" className="button button--secondary" onClick={() => copy(list.join('\n'), 'uuid-all')}>
          {copied === 'uuid-all' ? t('已复制全部', 'Copied all') : t('复制全部', 'Copy all')}
        </button>
      </div>

      <ul className={styles.list} style={{marginTop: '1.25rem'}}>
        {list.map((uuid) => (
          <li key={uuid} className={styles.item}>
            <span className={styles.itemName} style={{fontFamily: 'var(--ifm-font-family-monospace)'}}>{uuid}</span>
            <div className={styles.itemActions}>
              <button type="button" className={styles.removeButton} aria-label={t('复制', 'Copy')} onClick={() => copy(uuid, uuid)}>
                {copied === uuid ? '✓' : '⧉'}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
