import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import HomepageFeatures from '@site/src/components/HomepageFeatures';

import Heading from '@theme/Heading';
import styles from './index.module.css';

function HomepageHeader() {
  const {siteConfig, i18n} = useDocusaurusContext();
  const isEn = i18n.currentLocale === 'en';
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <Heading as="h1" className={clsx('hero__title', styles.heroTitle)}>
          {siteConfig.title}
        </Heading>
        <p className={clsx('hero__subtitle', styles.heroSubtitle)}>
          {siteConfig.tagline}
        </p>
        <div className={styles.buttons}>
          <Link
            className="button button--primary button--lg"
            to="/docs/info/about"
            style={{borderRadius: '30px', padding: '0.8rem 2rem'}}>
            {isEn ? 'Start Here' : '写在开始'}
          </Link>
          <Link
            className="button button--lg custom-blog-btn"
            to="/blog"
            style={{borderRadius: '30px', padding: '0.8rem 2rem'}}>
            {isEn ? 'My Blog' : '我的博客'}
          </Link>
        </div>
      </div>
    </header>
  );
}

export default function Home() {
  const {siteConfig, i18n} = useDocusaurusContext();
  const isEn = i18n.currentLocale === 'en';
  return (
    <Layout
      title={`${siteConfig.title}`}
      description={
        isEn
          ? 'A personal site on the logic behind games, the small things in life, and a bit of code. Connection starts here.'
          : 'Connexion Collective：记录游戏背后的设计逻辑、现实生活的碎碎念与代码折腾的个人站点。连接，从这里开始。'
      }>
      
      {/* 顶部滚动公告栏 */}
      <div className="marquee-container">
        <div className="marquee-content">
          {isEn ? (
            <>
              <span>✨ Welcome to Connexion Collective — connection starts here.</span>
              <span>📝 The blog is live. Start with the first post.</span>
              <span>🎮 Still building. More to come...</span>
            </>
          ) : (
            <>
              <span>✨ 欢迎来到 Connexion Collective，连接从这里开始。</span>
              <span>📝 博客系统已上线，欢迎阅读我的第一篇碎碎念。</span>
              <span>🎮 站点仍在建设中，未完待续...</span>
            </>
          )}
        </div>
      </div>

      <HomepageHeader />
      
      <main>
        <HomepageFeatures />
      </main>
    </Layout>
  );
}