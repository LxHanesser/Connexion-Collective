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
            style={{ borderRadius: '30px', padding: '0.8rem 2rem' }}>
            写在开始
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
      description="梦开始的地方">
      <HomepageHeader />
      <main>
        <HomepageFeatures />
        
        {/* 极客风底部状态栏 */}
        <div className="container" style={{ textAlign: 'center', padding: '4rem 0 6rem', opacity: 0.7 }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', flexWrap: 'wrap', marginBottom: '1.5rem', fontSize: '0.9rem', fontWeight: '500' }}>
            <span>🟢 站点状态：运行良好</span>
            <span>⚡ 驱动引擎：Docusaurus</span>
            <span>☁️ 托管平台：Cloudflare Pages</span>
          </div>
          <p style={{ fontSize: '0.85rem' }}>
            © {new Date().getFullYear()} Connexion Collective. Built with ❤️ & Code.
          </p>
        </div>
        
      </main>
    </Layout>
  );
}