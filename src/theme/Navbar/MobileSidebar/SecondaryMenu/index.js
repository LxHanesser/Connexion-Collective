import React from 'react';
import Link from '@docusaurus/Link';
import Translate from '@docusaurus/Translate';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import {useThemeConfig} from '@docusaurus/theme-common';
import {useNavbarSecondaryMenu} from '@docusaurus/theme-common/internal';

// 覆写 Docusaurus 的移动端次级菜单（docs 侧栏 / 博客列表所在的第二列）。
// 原生行为：一进 docs 或博客页，汉堡菜单会直接落在第二列，
// 「博客」「在线工具」被挡在「回到主菜单」后面，需要多点一次。
// 这里在顶部补一行站点入口，保留返回按钮与原有上下文菜单。

function SecondaryMenuBackButton(props) {
  return (
    <button {...props} type="button" className="clean-btn navbar-sidebar__back">
      <Translate
        id="theme.navbar.mobileSidebarSecondaryMenu.backButtonLabel"
        description="The label of the back button to return to main menu, inside the mobile navbar sidebar secondary menu (notably used to display the docs sidebar)">
        ← Back to main menu
      </Translate>
    </button>
  );
}

export default function NavbarMobileSidebarSecondaryMenu() {
  const isPrimaryMenuEmpty = useThemeConfig().navbar.items.length === 0;
  const secondaryMenu = useNavbarSecondaryMenu();
  const {i18n} = useDocusaurusContext();
  const isEnglish = i18n.currentLocale === 'en';

  const quickLinks = isEnglish
    ? [
        {label: 'Home', to: '/'},
        {label: 'Blog', to: '/blog'},
        {label: 'Tools', to: '/tools'},
      ]
    : [
        {label: '首页', to: '/'},
        {label: '博客', to: '/blog'},
        {label: '在线工具', to: '/tools'},
      ];

  return (
    <>
      {!isPrimaryMenuEmpty && <SecondaryMenuBackButton onClick={() => secondaryMenu.hide()} />}

      <nav className="mobile-quicknav" aria-label={isEnglish ? 'Site sections' : '站点导航'}>
        {quickLinks.map((item) => (
          <Link key={item.to} className="mobile-quicknav__link" to={item.to}>
            {item.label}
          </Link>
        ))}
      </nav>

      {secondaryMenu.content}
    </>
  );
}
