import React, {useEffect, useState} from 'react';
import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import RandomPostButton from '@site/src/components/RandomPostButton';

export default function NotFoundContent() {
  const {i18n} = useDocusaurusContext();

  // 静态托管只会用根目录的 404.html 兜底，英文路径命中时它的 SSR 文案是中文。
  // 这里在挂载后按真实路径再判一次语言，保证 /en/* 的 404 显示英文。
  const [pathIsEn, setPathIsEn] = useState(false);
  useEffect(() => {
    const {pathname} = window.location;
    setPathIsEn(pathname === '/en' || pathname.startsWith('/en/'));
  }, []);

  const isEn = i18n.currentLocale === 'en' || pathIsEn;
  const homePath = isEn ? '/en/' : '/';
  const blogPath = isEn ? '/en/blog' : '/blog';

  return (
    <Layout
      title={isEn ? 'Page not found' : '页面不存在'}
      description={
        isEn
          ? 'This page does not exist. The link may be wrong, or the content has moved.'
          : '这个页面不存在，可能是链接写错了，或者内容已经移动。'
      }>
      <div
        className="container"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          padding: '4rem 1rem',
          textAlign: 'center',
        }}>
        <p
          style={{
            fontSize: '0.85rem',
            letterSpacing: '0.3em',
            textTransform: 'uppercase',
            opacity: 0.6,
            marginBottom: '0.5rem',
          }}>
          404
        </p>
        <Heading
          as="h1"
          style={{fontSize: '2rem', fontWeight: 800, marginBottom: '1rem'}}>
          {isEn ? 'This link is broken' : '这条连接断开了'}
        </Heading>
        <p style={{maxWidth: '32rem', opacity: 0.75, lineHeight: 1.8}}>
          {isEn ? (
            <>
              The page you are looking for does not exist — the link may be
              mistyped, or the content has moved. Pick a way out below, or press{' '}
              <kbd>Ctrl</kbd> + <kbd>K</kbd> to search.
            </>
          ) : (
            <>
              你访问的页面不存在，可能是链接拼错了，或者这块内容已经搬家。
              可以从下面挑条路继续走，也可以按 <kbd>Ctrl</kbd> + <kbd>K</kbd> 直接搜。
            </>
          )}
        </p>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.75rem',
            justifyContent: 'center',
            marginTop: '1.5rem',
          }}>
          <Link className="button button--primary button--md" to={homePath}>
            {isEn ? 'Back home' : '回到首页'}
          </Link>
          <Link className="button button--outline button--primary button--md" to={blogPath}>
            {isEn ? 'Browse the blog' : '翻翻博客'}
          </Link>
          <RandomPostButton className="button button--secondary button--md" />
        </div>
      </div>
    </Layout>
  );
}
