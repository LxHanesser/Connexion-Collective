import React from 'react';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import BlogSidebarContent from '@theme-original/BlogSidebar/Content';
import styles from './styles.module.css';

// 在「最近发布」列表末尾追加一条「查看全部文章」，桌面侧边栏和手机二级菜单都会显示。
// 不复制主题内部实现，只包一层，主题升级时改动的风险很小。
export default function BlogSidebarContentWrapper(props) {
  const {i18n} = useDocusaurusContext();
  const isEn = i18n.currentLocale === 'en';

  return (
    <>
      <BlogSidebarContent {...props} />
      <Link className={styles.allPostsLink} to="/blog/archive">
        {isEn ? 'View all posts →' : '查看全部文章 →'}
      </Link>
    </>
  );
}
