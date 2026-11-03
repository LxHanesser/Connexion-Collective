import React, {useEffect, useState} from 'react';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';

import styles from './consentBanner.module.css';

// 广告/联盟推广的同意横幅。
//
// 设计前提：本站当前没有任何广告与跟踪 Cookie，因此默认**不显示**横幅。
// 只有当 docusaurus.config.js 的 customFields.adsEnabled 为 true（即真的要接广告）
// 时才会出现。这样既保留合规能力，又不会在无广告阶段打扰访客。
//
// 注意：这不是 TCF/GPP 认证的 CMP。接入 Google 等广告平台时，应改用其认证 CMP，
// 本组件只适用于自营的轻量广告或联盟链接。

const STORAGE_KEY = 'cc-consent-v1';

export default function ConsentBanner() {
  const {i18n, siteConfig} = useDocusaurusContext();
  const isEn = i18n.currentLocale === 'en';
  const adsEnabled = Boolean(siteConfig.customFields?.adsEnabled);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!adsEnabled) {
      return;
    }
    try {
      if (!window.localStorage.getItem(STORAGE_KEY)) {
        setVisible(true);
      }
    } catch {
      // 隐私模式禁用存储时，仍然展示一次，交由用户选择
      setVisible(true);
    }
  }, [adsEnabled]);

  if (!adsEnabled || !visible) {
    return null;
  }

  const save = (ads) => {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ads, ts: Date.now()}),
      );
    } catch {
      // 忽略：存储不可用时只关闭本次横幅
    }
    setVisible(false);
  };

  return (
    <div className={styles.banner} role="dialog" aria-live="polite" aria-label={isEn ? 'Consent' : '同意设置'}>
      <div className={styles.inner}>
        <p className={styles.text}>
          {isEn ? (
            <>
              This site uses essential cookies only. With your consent it may also
              use advertising or affiliate cookies. See the{' '}
              <Link to="/en/docs/info/privacy">Privacy Policy</Link> and{' '}
              <Link to="/en/docs/info/advertising">Advertising Disclosure</Link>.
            </>
          ) : (
            <>
              本站默认只使用必要的安全 Cookie；经你同意后，可能使用广告或联盟推广相关的
              Cookie。详见<Link to="/docs/info/privacy">《隐私政策》</Link>与
              <Link to="/docs/info/advertising">《广告与联盟推广说明》</Link>。
            </>
          )}
        </p>
        <div className={styles.actions}>
          <button type="button" className={styles.primary} onClick={() => save(true)}>
            {isEn ? 'Accept all' : '接受全部'}
          </button>
          <button type="button" className={styles.secondary} onClick={() => save(false)}>
            {isEn ? 'Essential only' : '仅必要'}
          </button>
        </div>
      </div>
    </div>
  );
}
