#!/usr/bin/env node
/**
 * 站点体检：横向溢出（320/375px）+ CSP 违规 + 被阻断的资源。
 *
 * 零依赖，用本机 Edge/Chrome 的 CDP 驱动。适用于本地预览和生产（生产需要能通过
 * Cloudflare 人机校验，脚本会自动重试）。
 *
 * 用法：
 *   node scripts/audit/site-audit.mjs --url http://localhost:4173
 *   node scripts/audit/site-audit.mjs --url https://connexioncollective.com --retries 4
 *
 * 退出码：0 = 全部通过；1 = 发现问题。
 */

import {spawn} from 'node:child_process';
import {existsSync} from 'node:fs';
import {mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

const ROUTES = [
  '/',
  '/blog',
  '/blog/r2-media-hosting',
  '/en/',
  '/search?q=Cloudflare',
  '/tools',
  '/tools/qr-code',
  '/docs/info/about',
  '/subscribe',
];

const BROWSERS = [
  process.env.BROWSER_PATH,
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function parseArgs(argv) {
  const opts = {url: 'http://localhost:4173', retries: 1, port: 9300, width: null};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = () => argv[(i += 1)];
    if (arg === '--url') opts.url = next();
    else if (arg === '--retries') opts.retries = Number(next());
    else if (arg === '--port') opts.port = Number(next());
    else if (arg === '--help' || arg === '-h') {
      console.log('node scripts/audit/site-audit.mjs --url <base> [--retries n] [--port n]');
      process.exit(0);
    }
  }
  return opts;
}

function findBrowser() {
  const found = BROWSERS.find((p) => existsSync(p));
  if (!found) {
    throw new Error('找不到浏览器，请用 BROWSER_PATH 环境变量指定 Edge/Chrome 路径');
  }
  return found;
}

async function waitDevtools(port, attempts = 120) {
  for (let i = 0; i < attempts; i += 1) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (res.ok) return await res.json();
    } catch {
      /* 还没起来 */
    }
    await sleep(250);
  }
  throw new Error('DevTools 端口未就绪');
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const base = opts.url.replace(/\/$/, '');
  const browser = findBrowser();
  const profile = await mkdtemp(join(tmpdir(), 'site-audit-'));
  const proc = spawn(
    browser,
    [
      '--disable-gpu',
      '--no-first-run',
      '--no-default-browser-check',
      '--window-size=1280,900',
      '--window-position=3000,3000',
      `--remote-debugging-port=${opts.port}`,
      `--user-data-dir=${profile}`,
      'about:blank',
    ],
    {stdio: 'ignore'},
  );

  let ws;
  let failures = 0;
  try {
    await waitDevtools(opts.port);
    const target = await (
      await fetch(`http://127.0.0.1:${opts.port}/json/new?about:blank`, {method: 'PUT'})
    ).json();
    ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      ws.onopen = resolve;
      ws.onerror = () => reject(new Error('WebSocket 连接失败'));
    });

    let nextId = 1;
    const pending = new Map();
    const requests = new Map();
    const blocked = [];
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && pending.has(msg.id)) {
        pending.get(msg.id)(msg);
        pending.delete(msg.id);
      }
      if (msg.method === 'Network.requestWillBeSent') {
        requests.set(msg.params.requestId, msg.params.request.url);
      }
      if (msg.method === 'Network.loadingFailed' && msg.params.blockedReason) {
        blocked.push({
          url: (requests.get(msg.params.requestId) || '(unknown)').slice(-70),
          reason: msg.params.blockedReason,
        });
      }
    };
    const send = (method, params = {}) =>
      new Promise((resolve) => {
        const id = nextId++;
        pending.set(id, resolve);
        ws.send(JSON.stringify({id, method, params}));
      });
    const evaluate = async (expression) => {
      const res = await send('Runtime.evaluate', {expression, returnByValue: true, awaitPromise: true});
      if (res.result?.exceptionDetails) return {error: res.result.exceptionDetails.text};
      return res.result?.result?.value;
    };

    await send('Network.enable');
    await send('Page.enable');
    await send('Runtime.enable');
    await send('Emulation.setDeviceMetricsOverride', {
      width: 1280,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await send('Page.addScriptToEvaluateOnNewDocument', {
      source: `window.__csp = [];
        document.addEventListener('securitypolicyviolation', (e) => {
          window.__csp.push({directive: e.effectiveDirective, blocked: (e.blockedURI || '').slice(0, 90), disposition: e.disposition});
        });`,
    });

    const load = async (route) => {
      for (let attempt = 1; attempt <= opts.retries; attempt += 1) {
        await send('Page.navigate', {url: base + route});
        await sleep(opts.retries > 1 ? 13000 : 3500);
        const ok = await evaluate('document.readyState === "complete" && !!document.body');
        if (ok === true) return true;
      }
      return false;
    };

    console.log(`站点体检: ${base}\n`);
    console.log('路由'.padEnd(30) + '320 溢出   375 溢出   CSP 违规');
    console.log('-'.repeat(62));

    for (const route of ROUTES) {
      await send('Emulation.setDeviceMetricsOverride', {width: 375, height: 812, deviceScaleFactor: 1, mobile: true});
      await load(route);
      const overflows = {};
      for (const width of [320, 375]) {
        await send('Emulation.setDeviceMetricsOverride', {width, height: 812, deviceScaleFactor: 1, mobile: true});
        await sleep(600);
        overflows[width] = await evaluate(
          `document.documentElement.scrollWidth > document.documentElement.clientWidth`,
        );
      }
      const violations = (await evaluate('JSON.stringify(window.__csp || [])')) || '[]';
      let count = 0;
      try {
        count = JSON.parse(violations).length;
      } catch {
        count = 0;
      }
      if (overflows[320]) failures += 1;
      if (overflows[375]) failures += 1;
      if (count > 0) failures += 1;
      console.log(
        route.padEnd(30) +
          `${overflows[320] ? '有 ⚠' : '无'}        ${overflows[375] ? '有 ⚠' : '无'}       ${count}`,
      );
    }

    const cspBlocked = blocked.filter((b) => b.reason.includes('csp'));
    console.log('\n被 CSP 阻断的资源: ' + cspBlocked.length);
    for (const b of cspBlocked.slice(0, 10)) console.log(`  ${b.reason} ← ${b.url}`);
    if (cspBlocked.length > 0) failures += 1;
  } finally {
    try {
      ws?.close();
    } catch {
      /* ignore */
    }
    proc.kill();
  }

  console.log(failures === 0 ? '\n✓ 全部通过' : `\n✗ 发现 ${failures} 项问题`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error('✗ ' + (error?.message ?? error));
  process.exit(1);
});
