import React, {useMemo, useState} from 'react';
import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import {PageMetadata} from '@docusaurus/theme-common';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';

// 覆写 Docusaurus 默认的归档页。
// 默认实现把每个年份放进 1/3 宽的栅格列，只有一个年份时就挤成左侧窄条，
// 每行还重复「10月25日」。这里改为：全年份单列、按月分组、带计数与筛选。

const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function parseDate(iso) {
  const date = new Date(iso);
  // 与站内其它日期展示保持一致：统一按 UTC 处理
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

export default function BlogArchivePage({archive}) {
  const {i18n} = useDocusaurusContext();
  const isEnglish = i18n.currentLocale === 'en';
  const [query, setQuery] = useState('');

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
            tags: (post.metadata.tags ?? []).map((tag) => tag.label),
          };
        })
        .sort((a, b) => (a.metadata.date < b.metadata.date ? 1 : -1)),
    [archive],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return posts;
    return posts.filter((post) =>
      `${post.metadata.title} ${post.tags.join(' ')}`.toLowerCase().includes(needle),
    );
  }, [posts, query]);

  // year -> month -> posts
  const grouped = useMemo(() => {
    const map = new Map();
    for (const post of filtered) {
      if (!map.has(post.year)) map.set(post.year, new Map());
      const months = map.get(post.year);
      if (!months.has(post.month)) months.set(post.month, []);
      months.get(post.month).push(post);
    }
    return Array.from(map, ([year, months]) => ({
      year,
      months: Array.from(months, ([month, list]) => ({month, list})),
      count: Array.from(months.values()).reduce((sum, list) => sum + list.length, 0),
    }));
  }, [filtered]);

  const years = useMemo(() => Array.from(new Set(posts.map((post) => post.year))).sort((a, b) => b - a), [posts]);

  const total = posts.length;
  const range =
    total > 0
      ? isEnglish
        ? `${MONTHS_EN[posts[total - 1].month - 1]} ${posts[total - 1].year} – ${MONTHS_EN[posts[0].month - 1]} ${posts[0].year}`
        : `${posts[total - 1].year} 年 ${posts[total - 1].month} 月 – ${posts[0].year} 年 ${posts[0].month} 月`
      : '';

  const monthLabel = (month) => (isEnglish ? MONTHS_EN[month - 1] : `${month} 月`);

  const jumpTo = (year) => {
    const target = document.getElementById(`archive-year-${year}`);
    if (target) target.scrollIntoView({behavior: 'smooth', block: 'start'});
  };

  return (
    <>
      <PageMetadata
        title={isEnglish ? 'Archive' : '文章归档'}
        description={isEnglish ? 'Every post, grouped by year and month.' : '全部文章，按年月归档。'}
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
                  ? `${total} posts · ${range}`
                  : `共 ${total} 篇文章 · ${range}`
                : isEnglish
                  ? 'No posts yet.'
                  : '还没有文章。'}
            </p>
          </header>

          <div className="archive-toolbar">
            <label className="archive-filter">
              <span className="archive-filter__label">{isEnglish ? 'Filter' : '筛选'}</span>
              <input
                type="search"
                value={query}
                placeholder={isEnglish ? 'Search titles or tags…' : '搜索标题或标签…'}
                onChange={(event) => setQuery(event.target.value)}
                aria-label={isEnglish ? 'Filter posts' : '筛选文章'}
              />
            </label>

            {years.length > 1 && !query ? (
              <div className="archive-years" role="navigation" aria-label={isEnglish ? 'Jump to year' : '跳转到年份'}>
                {years.map((year) => (
                  <button key={year} type="button" className="archive-year-chip" onClick={() => jumpTo(year)}>
                    {year}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          {grouped.length === 0 ? (
            <p className="archive-empty">
              {isEnglish ? 'Nothing matches that keyword.' : '没有匹配的文章。'}
            </p>
          ) : null}

          {grouped.map(({year, months, count}) => (
            <section key={year} id={`archive-year-${year}`} className="archive-year">
              <div className="archive-year__head">
                <Heading as="h2" className="archive-year__title">
                  {year}
                </Heading>
                <span className="archive-year__count">
                  {isEnglish ? `${count} posts` : `${count} 篇`}
                </span>
              </div>

              {months.map(({month, list}) => (
                <div key={month} className="archive-month">
                  <div className="archive-month__head">
                    <Heading as="h3" className="archive-month__title">
                      {monthLabel(month)}
                    </Heading>
                    <span className="archive-month__count">{list.length}</span>
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
        </main>
      </Layout>
    </>
  );
}
