import React, {lazy, Suspense} from 'react';
import BlogPostItem from '@theme-original/BlogPostItem';
import { useBlogPost } from '@docusaurus/plugin-content-blog/client';

// 评论组件懒加载：只在博客详情页需要，从主包里拆出去，减小首屏体积
const GiscusComments = lazy(() => import('@site/src/components/GiscusComments'));

export default function BlogPostItemWrapper(props) {
  const { isBlogPostPage } = useBlogPost();

  return (
    <>
      <BlogPostItem {...props} />
      {isBlogPostPage && (
        <Suspense fallback={null}>
          <GiscusComments />
        </Suspense>
      )}
    </>
  );
}