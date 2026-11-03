import React, {useEffect, useMemo, useRef, useState} from 'react';
import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import {PageMetadata} from '@docusaurus/theme-common';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';

// 覆写 Docusaurus 默认的归档页。
//
// 目标：文章数量增长到几百篇时仍然好用。
// 做法：搜索 + 标签 + 月份三个维度筛选，再对结果分页，一次只渲染 20 条。
// 筛选变化时自动回到第 1 页，避免停在越界页码上白屏。

const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const PAGE_SIZE = 20;

/** 从查询串读取筛选状态（仅浏览器端） */
function readUrlState() {
  if (typeof window === 'undefined') {
    return {query: '', tag: '', monthKey: '', page: 1};
  }
  const params = new URLSearchParams(window.location.search);
  const page = Number(params.get('page') || '1');
  return {
    query: params.get('q') ?? '',
    tag: params.get('tag') ?? '',
    monthKey: params.get('month') ?? '',
    page: Number.isFinite(page) && page > 0 ? Math.floor(page) : 1,
  };
}

function parseDate(iso) {
  const date = new Date(iso);
  // 与站内其它日期展示保持一致：统一按 UTC 处理
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

/** 生成页码序列：1 … 4 5 6 … 12 */
function pageItems(current, total) {
  if (total <= 7) return Array.from({length: total}, (_, i) => i + 1);
  const items = new Set([1, total, current, current - 1, current + 1]);
  const sorted = [...items].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const out = [];
  let prev = 0;
  for (const p of sorted) {
    if (prev && p - prev > 1) out.push('…');
    out.push(p);
    prev = p;
  }
  return out;
}

export default function BlogArchivePage({archive}) {
  const {i18n} = useDocusaurusContext();
  const isEnglish = i18n.currentLocale === 'en';

  const initial = useMemo(readUrlState, []);
  const [query, setQuery] = useState(initial.query);
  const [tag, setTag] = useState(initial.tag);
  const [monthKey, setMonthKey] = useState(initial.monthKey);
  const [page, setPage] = useState(initial.page);
  const listRef = useRef(null);
  const mounted = useRef(false);

  const posts = useMemo(
    () =>
      [...(archive?.blogPosts ?? [])]
        .map((post) => {
          const {year, month, day} = parseDate(post.metadata.date);
          return {
            ...post,
            year,
            month,
            day,
            monthKey: `${year}-${String(month).padStart(2, '0')}`,
            tags: (post.metadata.tags ?? []).map((t) => t.label),
          };
        })
        .sort((a, b) => (a.metadata.date < b.metadata.date ? 1 : -1)),
    [archive],
  );

  // 标签与月份的候选值（带计数），只统计全部文章，不受当前筛选影响
  const tagOptions = useMemo(() => {
    const counts = new Map();
    for (const post of posts) {
      for (const t of post.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
    }
    return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [posts]);

  const monthOptions = useMemo(() => {
    const counts = new Map();
    for (const post of posts) counts.set(post.monthKey, (counts.get(post.monthKey) ?? 0) + 1);
    return [...counts].sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [posts]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return posts.filter((post) => {
      if (tag && !post.tags.includes(tag)) return false;
      if (monthKey && post.monthKey !== monthKey) return false;
      if (!needle) return true;
      return `${post.metadata.title} ${post.tags.join(' ')}`.toLowerCase().includes(needle);
    });
  }, [posts, query, tag, monthKey]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pagePosts = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // 筛选条件变化时回到第一页。
  // 首次渲染要跳过：直接打开带 ?page=2 的链接时，不能把页码重置成 1。
  const firstFilterRun = useRef(true);
  useEffect(() => {
    if (firstFilterRun.current) {
      firstFilterRun.current = false;
      return;
    }
    setPage(1);
  }, [query, tag, monthKey]);

  // 把当前状态写回查询串：便于分享链接、刷新后保持筛选
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (tag) params.set('tag', tag);
    if (monthKey) params.set('month', monthKey);
    if (currentPage > 1) params.set('page', String(currentPage));

    const search = params.toString();
    const next = `${window.location.pathname}${search ? `?${search}` : ''}${window.location.hash}`;
    if (next !== window.location.pathname + window.location.search + window.location.hash) {
      window.history.replaceState(window.history.state, '', next);
    }
  }, [query, tag, monthKey, currentPage]);

  // 浏览器前进/后退时恢复对应状态
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const onPop = () => {
      const next = readUrlState();
      setQuery(next.query);
      setTag(next.tag);
      setMonthKey(next.monthKey);
      setPage(next.page);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // 翻页后回到列表顶部（首次渲染不动，避免打开页面就滚动）
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    const target = listRef.current;
    if (target) {
      target.scrollIntoView({behavior: 'smooth', block: 'start'});
    }
  }, [currentPage]);

  // 计数基于「筛选后的全部文章」，而不是当前页，
  // 否则第 1 页会写「2026 20 篇」，而实际有 31 篇。
  const counts = useMemo(() => {
    const years = new Map();
    const months = new Map();
    for (const post of filtered) {
      years.set(post.year, (years.get(post.year) ?? 0) + 1);
      const key = `${post.year}-${post.month}`;
      months.set(key, (months.get(key) ?? 0) + 1);
    }
    return {years, months};
  }, [filtered]);

  // 按年 → 月分组，只对当前页的数据分组
  const grouped = useMemo(() => {
    const map = new Map();
    for (const post of pagePosts) {
      if (!map.has(post.year)) map.set(post.year, new Map());
      const months = map.get(post.year);
      if (!months.has(post.month)) months.set(post.month, []);
      months.get(post.month).push(post);
    }
    return Array.from(map, ([year, months]) => ({
      year,
      months: Array.from(months, ([month, list]) => ({month, list})),
    }));
  }, [pagePosts]);

  const monthLabel = (month) => (isEnglish ? MONTHS_EN[month - 1] : `${month} 月`);
  const fullMonthLabel = (key) => {
    const [y, m] = key.split('-').map(Number);
    return isEnglish ? `${MONTHS_EN[m - 1]} ${y}` : `${y} 年 ${m} 月`;
  };

  const total = posts.length;
  const from = filtered.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const to = Math.min(currentPage * PAGE_SIZE, filtered.length);
  const hasFilter = Boolean(query || tag || monthKey);
  const pageSizeLabel = isEnglish ? `${from}–${to} of ${filtered.length}` : `${from}–${to} / ${filtered.length}`;

  const clearAll = () => {
    setQuery('');
    setTag('');
    setMonthKey('');
  };

  const goto = (next) => {
    const clamped = Math.min(Math.max(1, next), pageCount);
    if (clamped !== currentPage) setPage(clamped);
  };

  return (
    <>
      <PageMetadata
        title={isEnglish ? 'Archive' : '文章归档'}
        description={
          isEnglish
            ? 'Every post, filterable by tag and month.'
            : '全部文章，可按标签与月份筛选。'
        }
      />
      <Layout>
        <main className="archive-page">
          <header className="archive-header">
            <Heading as="h1" className="archive-title">
              {isEnglish ? 'Archive' : '文章归档'}
            </Heading>
            <p className="archive-lead">
              {total > 0
                ? isEnglish
                  ? `${total} posts in total`
                  : `共 ${total} 篇文章`
                : isEnglish
                  ? 'No posts yet.'
                  : '还没有文章。'}
            </p>
          </header>

          <div className="archive-toolbar">
            <label className="archive-filter">
              <span className="archive-filter__label">{isEnglish ? 'Search' : '搜索'}</span>
              <input
                type="search"
                value={query}
                placeholder={isEnglish ? 'Search titles or tags…' : '搜索标题或标签…'}
                onChange={(event) => setQuery(event.target.value)}
                aria-label={isEnglish ? 'Search posts' : '搜索文章'}
              />
            </label>

            <label className="archive-select">
              <span className="archive-filter__label">{isEnglish ? 'Tag' : '标签'}</span>
              <select
                value={tag}
                onChange={(event) => setTag(event.target.value)}
                aria-label={isEnglish ? 'Filter by tag' : '按标签筛选'}>
                <option value="">{isEnglish ? 'All tags' : '全部标签'}</option>
                {tagOptions.map(([label, count]) => (
                  <option key={label} value={label}>
                    {label} ({count})
                  </option>
                ))}
              </select>
            </label>

            <label className="archive-select">
              <span className="archive-filter__label">{isEnglish ? 'Month' : '月份'}</span>
              <select
                value={monthKey}
                onChange={(event) => setMonthKey(event.target.value)}
                aria-label={isEnglish ? 'Filter by month' : '按月份筛选'}>
                <option value="">{isEnglish ? 'All months' : '全部月份'}</option>
                {monthOptions.map(([key, count]) => (
                  <option key={key} value={key}>
                    {fullMonthLabel(key)} ({count})
                  </option>
                ))}
              </select>
            </label>

            {hasFilter ? (
              <button type="button" className="archive-clear" onClick={clearAll}>
                {isEnglish ? 'Clear' : '清除筛选'}
              </button>
            ) : null}
          </div>

          <div className="archive-status" aria-live="polite">
            <span>
              {hasFilter
                ? isEnglish
                  ? `Matching ${filtered.length} posts`
                  : `命中 ${filtered.length} 篇`
                : isEnglish
                  ? `Page ${currentPage} of ${pageCount}`
                  : `第 ${currentPage} / ${pageCount} 页`}
            </span>
            <span className="archive-status__range">{pageSizeLabel}</span>
          </div>

          <div ref={listRef} />

          {grouped.length === 0 ? (
            <p className="archive-empty">
              {isEnglish ? 'Nothing matches those filters.' : '没有匹配的文章，换个条件试试。'}
            </p>
          ) : null}

          {grouped.map(({year, months}) => (
            <section key={year} className="archive-year">
              <div className="archive-year__head">
                <Heading as="h2" className="archive-year__title">
                  {year}
                </Heading>
                <span className="archive-year__count">
                  {isEnglish
                    ? `${counts.years.get(year) ?? 0} posts`
                    : `${counts.years.get(year) ?? 0} 篇`}
                </span>
              </div>

              {months.map(({month, list}) => (
                <div key={month} className="archive-month">
                  <div className="archive-month__head">
                    <Heading as="h3" className="archive-month__title">
                      {monthLabel(month)}
                    </Heading>
                    <span className="archive-month__count">
                      {counts.months.get(`${year}-${month}`) ?? list.length}
                    </span>
                  </div>

                  <ul className="archive-list">
                    {list.map((post) => (
                      <li key={post.metadata.permalink} className="archive-item">
                        <Link to={post.metadata.permalink} className="archive-item__link">
                          <time className="archive-item__date" dateTime={post.metadata.date}>
                            {String(post.day).padStart(2, '0')}
                          </time>
                          <span className="archive-item__title">{post.metadata.title}</span>
                          <span className="archive-item__meta">
                            {post.tags.length ? (
                              <span className="archive-item__tags">{post.tags.slice(0, 2).join(' · ')}</span>
                            ) : null}
                            {post.metadata.readingTime ? (
                              <span className="archive-item__time">
                                {isEnglish
                                  ? `${Math.max(1, Math.round(post.metadata.readingTime))} min`
                                  : `${Math.max(1, Math.round(post.metadata.readingTime))} 分钟`}
                              </span>
                            ) : null}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>
          ))}

          {pageCount > 1 ? (
            <nav className="archive-pager" aria-label={isEnglish ? 'Pagination' : '分页'}>
              <button
                type="button"
                className="archive-pager__btn"
                onClick={() => goto(currentPage - 1)}
                disabled={currentPage === 1}
                aria-label={isEnglish ? 'Previous page' : '上一页'}>
                {isEnglish ? 'Prev' : '上一页'}
              </button>

              <div className="archive-pager__pages">
                {pageItems(currentPage, pageCount).map((item, index) =>
                  item === '…' ? (
                    <span key={`gap-${index}`} className="archive-pager__gap" aria-hidden="true">
                      …
                    </span>
                  ) : (
                    <button
                      key={item}
                      type="button"
                      className={
                        item === currentPage
                          ? 'archive-pager__page archive-pager__page--active'
                          : 'archive-pager__page'
                      }
                      onClick={() => goto(item)}
                      aria-current={item === currentPage ? 'page' : undefined}>
                      {item}
                    </button>
                  ),
                )}
              </div>

              <button
                type="button"
                className="archive-pager__btn"
                onClick={() => goto(currentPage + 1)}
                disabled={currentPage === pageCount}
                aria-label={isEnglish ? 'Next page' : '下一页'}>
                {isEnglish ? 'Next' : '下一页'}
              </button>
            </nav>
          ) : null}
        </main>
      </Layout>
    </>
  );
}
