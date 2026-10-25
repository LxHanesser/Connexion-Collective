import React, {lazy, Suspense} from 'react';
import BlogPostItem from '@theme-original/BlogPostItem';
import { useBlogPost } from '@docusaurus/plugin-content-blog/client';

// 评论组件懒加载：只在博客详情页需要，从主包里拆出去，减小首屏体积
const GiscusComments = lazy(() => import('@site/src/components/GiscusComments'));

// 评论加载失败时不把页面搞崩：退化成一句说明 + 去仓库讨论区的链接。
// （注：文章的结构化数据由 Docusaurus 3.10 自带的 useBlogPostStructuredData 输出，
//   这里不要再手写一份 BlogPosting，否则会出现重复的 JSON-LD。）
class CommentsErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {failed: false};
  }

  static getDerivedStateFromError() {
    return {failed: true};
  }

  componentDidCatch() {
    // 静默处理：评论是增强功能，失败不影响正文阅读
  }

  render() {
    if (this.state.failed) {
      return (
        <p>
          评论组件加载失败，可以直接去{' '}
          <a
            href="https://github.com/LxHanesser/Connexion-Collective/discussions"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub 讨论区
          </a>{' '}
          参与讨论。
        </p>
      );
    }
    return this.props.children;
  }
}

export default function BlogPostItemWrapper(props) {
  const { isBlogPostPage } = useBlogPost();

  return (
    <>
      <BlogPostItem {...props} />
      {isBlogPostPage && (
        <CommentsErrorBoundary>
          <Suspense fallback={null}>
            <GiscusComments />
          </Suspense>
        </CommentsErrorBoundary>
      )}
    </>
  );
}
