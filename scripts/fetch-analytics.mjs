// 从 Cloudflare Web Analytics (RUM) 拉取站点访问数据，合并成长期存档。
//
// 为什么不用数据库：本站是纯静态章程，数据在构建前落盘成 JSON，站点只读文件。
// 每次运行只覆盖「最近一个窗口」的数据，更早的日期原样保留 —— 这样越跑历史越长，
// 而 Cloudflare 自己只保留 6 个月。
//
// 用法：
//   npm run stats:fetch              # 拉取最近 90 天并合并
//   npm run stats:fetch -- --days 180
//
// 凭证（都只从本地读取，绝不写入仓库）：
//   CLOUDFLARE_API_TOKEN 或 ops/.cf-token    —— Account Analytics 只读令牌
//   CF_ACCOUNT           或 ops/.cf-account  —— 32 位 Account ID
import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';

const ROOT = path.resolve(import.meta.dirname, '..');
const TOKEN_FILE = path.join(ROOT, 'ops', '.cf-token');
const ACCOUNT_FILE = path.join(ROOT, 'ops', '.cf-account');
const RAW_FILE = path.join(ROOT, 'src', 'data', 'analytics.json');
const SUMMARY_FILE = path.join(ROOT, 'src', 'data', 'analytics-summary.json');

// Cloudflare 单次查询的时间跨度上限是 13 周 2 天，这里用 90 天留余量
const CHUNK_DAYS = 90;
const TOP_PAGES = 30;
const SERIES_DAYS = 120;

function readSecret(envName, filePath, label) {
  const fromEnv = process.env[envName];
  if (fromEnv && fromEnv.trim()) return fromEnv.trim();
  if (fs.existsSync(filePath)) return fs.readFileSync(filePath, 'utf8').trim();
  throw new Error(`缺少 ${label}：请设置环境变量 ${envName}，或放进 ${path.relative(ROOT, filePath)}（该目录已被 git 排除）`);
}

const TOKEN = readSecret('CLOUDFLARE_API_TOKEN', TOKEN_FILE, 'Cloudflare API Token');
const ACCOUNT = readSecret('CF_ACCOUNT', ACCOUNT_FILE, 'Cloudflare Account ID');

function graphql(query, variables) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({query, variables});
    const req = https.request(
      {
        host: 'api.cloudflare.com',
        path: '/client/v4/graphql',
        method: 'POST',
        headers: {
          authorization: `Bearer ${TOKEN}`,
          'content-type': 'application/json',
          'content-length': Buffer.byteLength(body),
        },
        timeout: 40000,
      },
      (res) => {
        let raw = '';
        res.on('data', (c) => (raw += c));
        res.on('end', () => {
          let json;
          try {
            json = JSON.parse(raw);
          } catch {
            return reject(new Error(`GraphQL 返回非 JSON（HTTP ${res.statusCode}）`));
          }
          if (json.errors?.length) {
            return reject(new Error(json.errors[0].message));
          }
          resolve(json.data);
        });
      },
    );
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('GraphQL 请求超时'));
    });
    req.write(body);
    req.end();
  });
}

const DAILY_QUERY = `
  query($account: String!, $from: Time!, $to: Time!) {
    viewer {
      accounts(filter: {accountTag: $account}) {
        rumPageloadEventsAdaptiveGroups(
          limit: 1000
          filter: {datetime_geq: $from, datetime_leq: $to}
          orderBy: [date_ASC]
        ) {
          count
          sum { visits }
          dimensions { date }
        }
      }
    }
  }
`;

const PAGES_QUERY = `
  query($account: String!, $from: Time!, $to: Time!) {
    viewer {
      accounts(filter: {accountTag: $account}) {
        rumPageloadEventsAdaptiveGroups(
          limit: 10000
          filter: {datetime_geq: $from, datetime_leq: $to}
          orderBy: [count_DESC]
        ) {
          count
          sum { visits }
          dimensions { date requestPath }
        }
      }
    }
  }
`;

// 归一化路径：去掉尾斜杠、合并重复项、丢弃扫描器探测路径。
// 统计里把 /blog 与 /blog/ 当两条路径，不合并会看起来像"两个页面"。
function normalizePath(rawPath) {
  if (!rawPath || typeof rawPath !== 'string') return null;
  let p = rawPath.trim();
  if (!p.startsWith('/')) return null;
  if (p.length > 1) p = p.replace(/\/+$/, '');
  // 明显的扫描/探测请求：含注入特征或常见后台路径
  if (/[=<>"'`%\\]|\.\.|\/wp-|\/admin|\/\.env|\/and1|\/phpmyadmin|\/\.git/i.test(p)) return null;
  return p;
}
function daysAgo(n) {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - n);
  return d;
}

function iso(d) {
  return d.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

async function fetchWindow(from, to) {
  const vars = {account: ACCOUNT, from: iso(from), to: iso(to)};
  const daily = await graphql(DAILY_QUERY, vars);
  const pages = await graphql(PAGES_QUERY, vars);
  return {
    daily: daily.viewer.accounts[0]?.rumPageloadEventsAdaptiveGroups ?? [],
    pages: pages.viewer.accounts[0]?.rumPageloadEventsAdaptiveGroups ?? [],
  };
}

function loadExisting() {
  if (!fs.existsSync(RAW_FILE)) return {daily: {}, pages: {}};
  try {
    const parsed = JSON.parse(fs.readFileSync(RAW_FILE, 'utf8'));
    return {daily: parsed.daily ?? {}, pages: parsed.pages ?? {}};
  } catch {
    return {daily: {}, pages: {}};
  }
}

async function main() {
  const argDays = Number(process.argv.find((a) => a.startsWith('--days='))?.split('=')[1]);
  const spanDays = Number.isFinite(argDays) && argDays > 0 ? argDays : 90;

  const to = daysAgo(0);
  to.setUTCDate(to.getUTCDate() + 1); // 含今天
  const from = daysAgo(spanDays);

  const store = loadExisting();
  let dailyAdded = 0;
  let pageEntries = 0;

  // 按 CHUNK_DAYS 切片，避开接口的 13 周 2 天上限
  for (let start = new Date(from); start < to; start.setUTCDate(start.getUTCDate() + CHUNK_DAYS)) {
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + CHUNK_DAYS);
    const windowEnd = end < to ? end : to;

    const {daily, pages} = await fetchWindow(start, windowEnd);

    for (const row of daily) {
      const date = row.dimensions.date;
      store.daily[date] = {views: row.count, visits: row.sum?.visits ?? 0};
      dailyAdded += 1;
    }

    // 先清掉这个窗口内的旧路径数据，再写入，避免重复累加
    const startKey = start.toISOString().slice(0, 10);
    const endKey = windowEnd.toISOString().slice(0, 10);
    for (const [p, perDay] of Object.entries(store.pages)) {
      for (const date of Object.keys(perDay)) {
        if (date >= startKey && date < endKey) delete perDay[date];
      }
      if (Object.keys(perDay).length === 0) delete store.pages[p];
    }
    for (const row of pages) {
      const {date, requestPath} = row.dimensions;
      const p = normalizePath(requestPath);
      if (!p) continue;
      store.pages[p] ??= {};
      // 归一化后同一路径同一天可能来自多行（如 /blog 与 /blog/），需要累加
      store.pages[p][date] = (store.pages[p][date] ?? 0) + row.count;
      pageEntries += 1;
    }

    process.stdout.write(`  拉取 ${startKey} ~ ${endKey}：${daily.length} 天 / ${pages.length} 条路径记录\n`);
  }

  // 排序，保证输出稳定（便于 git diff）
  const dailySorted = {};
  for (const date of Object.keys(store.daily).sort()) dailySorted[date] = store.daily[date];

  const pagesSorted = {};
  for (const p of Object.keys(store.pages).sort()) {
    const perDay = store.pages[p];
    const days = {};
    for (const date of Object.keys(perDay).sort()) days[date] = perDay[date];
    pagesSorted[p] = days;
  }

  const raw = {
    updated: new Date().toISOString(),
    source: 'cloudflare-web-analytics',
    note: '每日浏览量（views）与访问次数（visits），按路径拆分；由 scripts/fetch-analytics.mjs 生成',
    daily: dailySorted,
    pages: pagesSorted,
  };

  // 摘要：页面只导入这份，避免把完整存档打进 bundle
  const series = [];
  for (let i = SERIES_DAYS - 1; i >= 0; i -= 1) {
    const d = daysAgo(i).toISOString().slice(0, 10);
    series.push({date: d, views: dailySorted[d]?.views ?? 0, visits: dailySorted[d]?.visits ?? 0});
  }

  const pageTotals = Object.entries(pagesSorted).map(([p, perDay]) => ({
    path: p,
    views: Object.values(perDay).reduce((s, n) => s + n, 0),
  }));

  const days = Object.keys(dailySorted);
  const summary = {
    updated: raw.updated,
    earliest: days[0] ?? null,
    latest: days[days.length - 1] ?? null,
    totalViews: Object.values(dailySorted).reduce((s, d) => s + d.views, 0),
    totalVisits: Object.values(dailySorted).reduce((s, d) => s + d.visits, 0),
    daysTracked: days.length,
    series,
    topPages: pageTotals.sort((a, b) => b.views - a.views).slice(0, TOP_PAGES),
  };

  fs.mkdirSync(path.dirname(RAW_FILE), {recursive: true});
  fs.writeFileSync(RAW_FILE, `${JSON.stringify(raw, null, 0)}\n`);
  fs.writeFileSync(SUMMARY_FILE, `${JSON.stringify(summary, null, 2)}\n`);

  const rawKb = (fs.statSync(RAW_FILE).size / 1024).toFixed(1);
  const sumKb = (fs.statSync(SUMMARY_FILE).size / 1024).toFixed(1);
  console.log('');
  console.log(`完成：累计 ${summary.daysTracked} 天，总浏览 ${summary.totalViews}，总访问 ${summary.totalVisits}`);
  console.log(`  存档  src/data/analytics.json          ${rawKb} KB（${Object.keys(pagesSorted).length} 个路径）`);
  console.log(`  摘要  src/data/analytics-summary.json  ${sumKb} KB（页面只导入这份）`);
}

main().catch((err) => {
  console.error('抓取失败：' + err.message);
  process.exit(1);
});
