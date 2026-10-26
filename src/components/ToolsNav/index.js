import React from 'react';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import {useHistory} from '@docusaurus/router';
import {getToolGroups} from '@site/src/toolsCatalog';
import styles from './styles.module.css';

// 工具页顶部导航：
// - 宽屏用横向 chip（一次点击直达）
// - 窄屏换成原生 <select> 分组选择器（不横向滚动、单手可用、工具再多也不挤）
export default function ToolsNav({slug}) {
  const {i18n} = useDocusaurusContext();
  const history = useHistory();
  const groups = getToolGroups(i18n.currentLocale);
  const isEnglish = i18n.currentLocale === 'en';
  const prefix = i18n.currentLocale === i18n.defaultLocale ? '' : `/${i18n.currentLocale}`;

  const handleChange = (event) => {
    const next = event.target.value;
    if (next && next !== slug) {
      history.push(`${prefix}/tools/${next}/`);
    }
  };

  return (
    <nav className={styles.bar} aria-label={isEnglish ? 'Tools' : '工具'}>
      <div className={styles.inner}>
        <div className={styles.chips}>
          {groups.map((group) => (
            <React.Fragment key={group.id}>
              <span className={styles.group} aria-hidden="true">
                {group.title}
              </span>
              {group.tools.map((tool) => {
                const active = tool.slug === slug;
                return (
                  <Link
                    key={tool.slug}
                    to={tool.to}
                    className={`${styles.chip} ${active ? styles.active : ''}`}
                    aria-current={active ? 'page' : undefined}
                  >
                    <span className={styles.icon} aria-hidden="true">
                      {tool.icon}
                    </span>
                    <span>{tool.name}</span>
                  </Link>
                );
              })}
            </React.Fragment>
          ))}
        </div>

        <label className={styles.selectWrap}>
          <span className={styles.selectLabel}>{isEnglish ? 'Switch tool' : '切换工具'}</span>
          <select className={styles.select} value={slug} onChange={handleChange}>
            {groups.map((group) => (
              <optgroup key={group.id} label={group.title}>
                {group.tools.map((tool) => (
                  <option key={tool.slug} value={tool.slug}>
                    {tool.icon} {tool.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <Link className={styles.allLink} to="/tools">
            {isEnglish ? 'All' : '全部'}
          </Link>
        </label>
      </div>
    </nav>
  );
}
