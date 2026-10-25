import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import HomepageFeatures from '@site/src/components/HomepageFeatures';

import Heading from '@theme/Heading';
import styles from './index.module.css';

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <Heading as="h1" className="hero__title" style={{ fontSize: '3.5rem', fontWeight: '800' }}>
          {siteConfig.title}
        </Heading>
        <p className="hero__subtitle" style={{ fontSize: '1.2rem', opacity: 0.85, marginBottom: '2.5rem' }}>
          {siteConfig.tagline}
        </p>
        <div className={styles.buttons}>
          <Link
            className="button button--primary button--lg"
            to="/docs/info/about"
            style={{ borderRadius: '30px', padding: '0.8rem 2rem', marginRight: '1rem' }}>
            写在开始
          </Link>
          <Link
            className="button button--lg custom-blog-btn"
            to="/blog"
            style={{ borderRadius: '30px', padding: '0.8rem 2rem' }}>
            我的博客
          </Link>
        </div>
      </div>
    </header>
  );
}

export default function Home() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title={`${siteConfig.title}`}
      description="开始">
      
      {/* 顶部滚动公告栏 */}
      <div className="marquee-container">
        <div className="marquee-content">
          <span>✨ 欢迎来到 Connexion Collective，连接从这里开始。</span>
          <span>📝 博客系统已上线，欢迎阅读我的第一篇碎碎念。</span>
          <span>🎮 站点仍在建设中，未完待续...</span>
        </div>
      </div>

      <HomepageHeader />
      
      <main>
        <HomepageFeatures />
        
        {/* 丰富版的底部信息栏 */}
        <div style={{ borderTop: '1px solid rgba(128,128,128,0.1)', padding: '3rem 0', marginTop: '2rem' }}>
          <div className="container">
            <div className="row" style={{ textAlign: 'center', opacity: 0.7, fontSize: '0.9rem' }}>
              <div className="col col--4" style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ fontWeight: 'bold' }}>关于</h4>
                <p>Connexion Collective</p>
                <p>连接，从这里开始。</p>
              </div>
              <div className="col col--4" style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ fontWeight: 'bold' }}>快速导航</h4>
                <p><Link to="/docs/info/about">写在开始</Link></p>
                <p><Link to="/blog">我的博客</Link></p>
              </div>
              <div className="col col--4" style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ fontWeight: 'bold' }}>技术栈</h4>
                <p>🟢 站点状态：运行良好</p>
                <p>⚡ Docusaurus / Cloudflare</p>
              </div>
            </div>
            <div style={{ textAlign: 'center', marginTop: '2rem', opacity: 0.5, fontSize: '0.8rem' }}>
              © {new Date().getFullYear()} Connexion Collective. Built with ❤️ & Code.
            </div>
          </div>
        </div>
        
      </main>
    </Layout>
  );
}