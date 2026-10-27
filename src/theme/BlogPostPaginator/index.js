import React from 'react';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import {usePluginData} from '@docusaurus/useGlobalData';
import {useBlogPost} from '@docusaurus/plugin-content-blog/client';

// 覆写文章页底部导航：默认只有「较新一篇 / 较旧一篇 + 标题」，
// 这里补上发布日期，以及当前文章在全部文章中的位置（第 N / M 篇）。
// 文章索引由本地插件 plugins/blogPostIndex.cjs 在构建期注入全局数据。

function PagerCard({item, label, direction}) {
  return (
    <Link
      className={`blog-post-pager__card blog-post-pager__card--${direction}`}
      to={item.permalink}
      rel={direction === 'prev' ? 'prev' : 'next'}
    >
      <span className="blog-post-pager__label">{label}</span>
      <span className="blog-post-pager__title">{item.title}</span>
      {item.date ? <span className="blog-post-pager__date">{item.date}</span> : null}
    </Link>
  );
}

export default function BlogPostPaginator({nextItem, prevItem}) {
  const {i18n} = useDocusaurusContext();
  const isEnglish = i18n.currentLocale === 'en';
  const {metadata} = useBlogPost();
  const posts = usePluginData('blog-post-index')?.posts ?? [];

  // 中英文 permalink 的最后一段是同一个 slug
  const slugOf = (permalink) => String(permalink || '').split('/').filter(Boolean).pop();
  const currentSlug = slugOf(metadata.permalink);
  const currentIndex = posts.findIndex((post) => post.slug === currentSlug);
  const position =
    currentIndex >= 0
      ? isEnglish
        ? `Post ${currentIndex + 1} of ${posts.length}`
        : `第 ${currentIndex + 1} / ${posts.length} 篇`
      : null;

  const withDate = (item) => {
    if (!item) return null;
    const match = posts.find((post) => post.slug === slugOf(item.permalink));
    return {...item, date: match?.date || ''};
  };

  const newer = withDate(prevItem);
  const older = withDate(nextItem);

  if (!newer && !older) return null;

  return (
    <nav className="blog-post-pager" aria-label={isEnglish ? 'Blog post navigation' : '博文分页导航'}>
      <div className="blog-post-pager__grid">
        {newer ? (
          <PagerCard item={newer} label={isEnglish ? '← Newer post' : '← 较新一篇'} direction="prev" />
        ) : (
          <span className="blog-post-pager__placeholder" aria-hidden="true" />
        )}
        {older ? (
          <PagerCard item={older} label={isEnglish ? 'Older post →' : '较旧一篇 →'} direction="next" />
        ) : (
          <span className="blog-post-pager__placeholder" aria-hidden="true" />
        )}
      </div>
      {position ? <p className="blog-post-pager__position">{position}</p> : null}
    </nav>
  );
}
