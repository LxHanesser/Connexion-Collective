import React from 'react';
import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import RandomPostButton from '@site/src/components/RandomPostButton';

export default function NotFound() {
  const {i18n} = useDocusaurusContext();
  const isEn = i18n.currentLocale === 'en';

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
          <Link className="button button--primary button--md" to="/">
            {isEn ? 'Back home' : '回到首页'}
          </Link>
          <Link className="button button--outline button--primary button--md" to="/blog">
            {isEn ? 'Browse the blog' : '翻翻博客'}
          </Link>
          <RandomPostButton className="button button--secondary button--md" />
        </div>
      </div>
    </Layout>
  );
}
