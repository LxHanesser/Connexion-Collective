import React from 'react';
import Link from '@docusaurus/Link';
import {useLocation} from '@docusaurus/router';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';

// 覆写博客列表分页：默认只有一个「较旧的博文」链接，
// 这里补成「上一页 / 页码 / 下一页」并显示当前页位置。
// 当前页从 URL 推断（/blog/page/2），比依赖 metadata.page 的语义更可靠；
// 总页数取 metadata.totalPages。

function buildPageUrl(sample, page) {
  // 从 nextPage/previousPage 反推分页基址，兼容 /blog 与 /en/blog
  const base = sample ? sample.replace(/\/page\/\d+\/?$/, '') : '/blog';
  return page === 1 ? base : `${base}/page/${page}`;
}

export default function BlogListPaginator({metadata}) {
  const {i18n} = useDocusaurusContext();
  const {pathname} = useLocation();
  const isEnglish = i18n.currentLocale === 'en';

  const total = metadata?.totalPages ?? 1;
  const match = pathname.match(/\/page\/(\d+)\/?$/);
  const current = match ? Number(match[1]) : 1;
  const sample = metadata?.nextPage || metadata?.previousPage;

  if (total <= 1) return null;

  const pages = Array.from({length: total}, (_, index) => index + 1);

  return (
    <nav className="blog-pager" aria-label={isEnglish ? 'Blog list pagination' : '博文列表分页导航'}>
      {metadata.previousPage ? (
        <Link className="blog-pager__arrow" to={metadata.previousPage} rel="prev">
          ← {isEnglish ? 'Newer' : '较新'}
        </Link>
      ) : (
        <span className="blog-pager__arrow blog-pager__arrow--disabled" aria-hidden="true">
          ← {isEnglish ? 'Newer' : '较新'}
        </span>
      )}

      <ol className="blog-pager__pages">
        {pages.map((page) => {
          const active = page === current;
          return (
            <li key={page}>
              <Link
                className={`blog-pager__page ${active ? 'blog-pager__page--active' : ''}`}
                to={buildPageUrl(sample, page)}
                aria-current={active ? 'page' : undefined}
                aria-label={isEnglish ? `Page ${page}` : `第 ${page} 页`}
              >
                {page}
              </Link>
            </li>
          );
        })}
      </ol>

      {metadata.nextPage ? (
        <Link className="blog-pager__arrow" to={metadata.nextPage} rel="next">
          {isEnglish ? 'Older' : '较旧'} →
        </Link>
      ) : (
        <span className="blog-pager__arrow blog-pager__arrow--disabled" aria-hidden="true">
          {isEnglish ? 'Older' : '较旧'} →
        </span>
      )}

      <p className="blog-pager__status">
        {isEnglish ? `Page ${current} of ${total}` : `第 ${current} / ${total} 页`}
      </p>
    </nav>
  );
}
