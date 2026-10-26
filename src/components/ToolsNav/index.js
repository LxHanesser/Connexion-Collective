import React, {useEffect, useRef} from 'react';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import {getToolGroups} from '@site/src/toolsCatalog';
import styles from './styles.module.css';

// 工具页顶部的横向切换条：在任意工具里都能直接跳到别的工具，不用回列表页。
export default function ToolsNav({slug}) {
  const {i18n} = useDocusaurusContext();
  const groups = getToolGroups(i18n.currentLocale);
  const activeRef = useRef(null);

  // 当前工具可能在横向滚动的视口外，进页面或切换工具时把它滚到中间
  useEffect(() => {
    activeRef.current?.scrollIntoView({inline: 'center', block: 'nearest'});
  }, [slug]);

  return (
    <nav className={styles.bar} aria-label={i18n.currentLocale === 'en' ? 'Tools' : '工具'}>
      <div className={styles.inner}>
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
                  ref={active ? activeRef : undefined}
                  className={`${styles.chip} ${active ? styles.active : ''}`}
                  aria-current={active ? 'page' : undefined}
                >
                  <span className={styles.icon} aria-hidden="true">
                    {tool.icon}
                  </span>
                  <span className={styles.label}>{tool.name}</span>
                </Link>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </nav>
  );
}
