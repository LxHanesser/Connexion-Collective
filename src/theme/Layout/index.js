import React from 'react';
import Layout from '@theme-original/Layout';
import {useLocation} from '@docusaurus/router';
import ToolsNav from '@site/src/components/ToolsNav';

// 工具详情页插入横向切换条；/tools 列表页自己有分类导航，不重复加。
const TOOL_PATH = /^\/(?:en\/)?tools\/([^/]+)\/?$/;

export default function LayoutWrapper(props) {
  const {pathname} = useLocation();
  const match = pathname.match(TOOL_PATH);

  return (
    <Layout {...props}>
      {match ? <ToolsNav slug={match[1]} /> : null}
      {props.children}
    </Layout>
  );
}
