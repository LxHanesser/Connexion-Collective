import React, {useCallback, useMemo, useState} from 'react';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import styles from './shared.module.css';

const TABS = [
  {id: 'json', label: 'JSON 格式化'},
  {id: 'base64', label: 'Base64 / URL'},
  {id: 'hash', label: '哈希'},
  {id: 'timestamp', label: '时间戳'},
  {id: 'uuid', label: 'UUID'},
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
      title="开发工具"
      description="JSON 格式化、Base64、哈希、时间戳、UUID，全部在浏览器本地运行。">
      <main className={styles.page}>
        <header className={styles.header}>
          <Heading as="h1" className={styles.title}>
            开发工具
          </Heading>
          <p className={styles.lead}>
            JSON 格式化、Base64 / URL 编解码、哈希、时间戳、UUID。全部在本地计算，输入内容不会上传。
          </p>
          <p className={styles.badgeRow}>
            <span className={styles.badge}>🔒 本地运行</span>
            <span className={styles.badge}>⚡ 无网络请求</span>
            <span className={styles.badge}>🧰 5 个小工具</span>
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
              {item.label}
            </button>
          ))}
        </div>

        {tab === 'json' && <JsonTool copied={copied} copy={copy} />}
        {tab === 'base64' && <Base64Tool copied={copied} copy={copy} />}
        {tab === 'hash' && <HashTool copied={copied} copy={copy} />}
        {tab === 'timestamp' && <TimestampTool copied={copied} copy={copy} />}
        {tab === 'uuid' && <UuidTool copied={copied} copy={copy} />}

        <section className={styles.faq}>
          <h2 className={styles.faqTitle}>说明</h2>
          <ul className={styles.faqList}>
            <li>所有计算都在浏览器里完成，页面不会发送任何请求。</li>
            <li>哈希与剪贴板功能需要 HTTPS（本站已启用）。</li>
            <li>这些工具不保存历史记录，刷新即清空。</li>
          </ul>
        </section>
      </main>
    </Layout>
  );
}

function JsonTool({copied, copy}) {
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
      setError(parseError instanceof Error ? parseError.message : '解析失败');
    }
  };

  return (
    <div className={styles.panel}>
      <label className={styles.field}>
        <span className={styles.fieldLabel}>输入 JSON</span>
        <textarea className={styles.textarea} value={input} onChange={(event) => setInput(event.target.value)} rows={8} placeholder='{"hello": "world"}' />
      </label>

      <div className={styles.buttonRow} style={{marginTop: '1rem'}}>
        <button type="button" className="button button--primary" onClick={() => run(2)}>格式化</button>
        <button type="button" className="button button--secondary" onClick={() => run(0)}>压缩成一行</button>
        <button type="button" className="button button--secondary" onClick={() => { setInput(''); setOutput(''); setError(''); }}>清空</button>
      </div>

      {error && <p className={styles.notice}>{error}</p>}

      {output && (
        <>
          <label className={styles.field} style={{marginTop: '1.25rem'}}>
            <span className={styles.fieldLabel}>结果</span>
            <textarea className={styles.textarea} value={output} readOnly rows={10} />
          </label>
          <div className={styles.buttonRow} style={{marginTop: '0.75rem'}}>
            <button type="button" className="button button--secondary" onClick={() => copy(output, 'json')}>
              {copied === 'json' ? '已复制' : '复制结果'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function Base64Tool({copied, copy}) {
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
      setError(transformError instanceof Error ? transformError.message : '转换失败');
    }
  };

  return (
    <div className={styles.panel}>
      <label className={styles.field}>
        <span className={styles.fieldLabel}>转换方式</span>
        <select className={styles.select} value={mode} onChange={(event) => setMode(event.target.value)}>
          <option value="b64-encode">文本 → Base64</option>
          <option value="b64-decode">Base64 → 文本</option>
          <option value="url-encode">URL 编码</option>
          <option value="url-decode">URL 解码</option>
        </select>
      </label>

      <label className={styles.field} style={{marginTop: '1rem'}}>
        <span className={styles.fieldLabel}>输入</span>
        <textarea className={styles.textarea} value={input} onChange={(event) => setInput(event.target.value)} rows={6} />
      </label>

      <div className={styles.buttonRow} style={{marginTop: '1rem'}}>
        <button type="button" className="button button--primary" onClick={run}>转换</button>
        <button type="button" className="button button--secondary" onClick={() => { setInput(''); setOutput(''); setError(''); }}>清空</button>
      </div>

      {error && <p className={styles.notice}>{error}</p>}

      {output && (
        <>
          <label className={styles.field} style={{marginTop: '1.25rem'}}>
            <span className={styles.fieldLabel}>结果</span>
            <textarea className={styles.textarea} value={output} readOnly rows={6} />
          </label>
          <div className={styles.buttonRow} style={{marginTop: '0.75rem'}}>
            <button type="button" className="button button--secondary" onClick={() => copy(output, 'b64')}>
              {copied === 'b64' ? '已复制' : '复制结果'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function HashTool({copied, copy}) {
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
      setError(hashError instanceof Error ? hashError.message : '计算失败');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.panel}>
      <label className={styles.field}>
        <span className={styles.fieldLabel}>算法</span>
        <select className={styles.select} value={algo} onChange={(event) => setAlgo(event.target.value)}>
          {HASH_ALGOS.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>
      </label>

      <label className={styles.field} style={{marginTop: '1rem'}}>
        <span className={styles.fieldLabel}>输入文本</span>
        <textarea className={styles.textarea} value={input} onChange={(event) => setInput(event.target.value)} rows={6} />
      </label>

      <div className={styles.buttonRow} style={{marginTop: '1rem'}}>
        <button type="button" className="button button--primary" onClick={run} disabled={busy}>
          {busy ? '计算中…' : '计算哈希'}
        </button>
      </div>

      {error && <p className={styles.notice}>{error}</p>}

      {output && (
        <>
          <label className={styles.field} style={{marginTop: '1.25rem'}}>
            <span className={styles.fieldLabel}>结果（十六进制）</span>
            <textarea className={styles.textarea} value={output} readOnly rows={3} />
          </label>
          <div className={styles.buttonRow} style={{marginTop: '0.75rem'}}>
            <button type="button" className="button button--secondary" onClick={() => copy(output, 'hash')}>
              {copied === 'hash' ? '已复制' : '复制结果'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function TimestampTool({copied, copy}) {
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
        <span className={styles.fieldLabel}>Unix 时间戳（秒或毫秒）</span>
        <div className={styles.copyRow}>
          <input className={styles.textInput} value={value} onChange={(event) => setValue(event.target.value)} inputMode="numeric" />
          <button type="button" className="button button--secondary button--sm" onClick={() => setValue(String(Math.floor(Date.now() / 1000)))}>
            当前
          </button>
        </div>
      </label>

      {parsed ? (
        <div style={{marginTop: '1.25rem'}}>
          <p><strong>本地时间：</strong>{parsed.date.toLocaleString('zh-CN', {hour12: false})}</p>
          <p><strong>UTC：</strong>{parsed.date.toISOString()}</p>
          <p><strong>毫秒：</strong>{parsed.ms}</p>
          <div className={styles.buttonRow}>
            <button type="button" className="button button--secondary" onClick={() => copy(String(parsed.ms), 'ts')}>
              {copied === 'ts' ? '已复制' : '复制毫秒值'}
            </button>
          </div>
        </div>
      ) : (
        <p className={styles.notice}>请输入纯数字时间戳（10 位为秒，13 位为毫秒）</p>
      )}

      <div className={styles.field} style={{marginTop: '1.5rem'}}>
        <span className={styles.fieldLabel}>反过来：日期 → 时间戳</span>
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
            转换
          </button>
        </div>
      </div>
    </div>
  );
}

function UuidTool({copied, copy}) {
  const [list, setList] = useState(() => Array.from({length: 5}, () => crypto.randomUUID()));

  return (
    <div className={styles.panel}>
      <div className={styles.buttonRow}>
        <button type="button" className="button button--primary" onClick={() => setList(Array.from({length: 5}, () => crypto.randomUUID()))}>
          重新生成 5 个
        </button>
        <button type="button" className="button button--secondary" onClick={() => copy(list.join('\n'), 'uuid-all')}>
          {copied === 'uuid-all' ? '已复制全部' : '复制全部'}
        </button>
      </div>

      <ul className={styles.list} style={{marginTop: '1.25rem'}}>
        {list.map((uuid) => (
          <li key={uuid} className={styles.item}>
            <span className={styles.itemName} style={{fontFamily: 'var(--ifm-font-family-monospace)'}}>{uuid}</span>
            <div className={styles.itemActions}>
              <button type="button" className={styles.removeButton} aria-label="复制" onClick={() => copy(uuid, uuid)}>
                {copied === uuid ? '✓' : '⧉'}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
