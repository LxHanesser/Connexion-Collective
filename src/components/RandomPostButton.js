import React, {useCallback, useState} from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import {pickRandomBlogPost} from '@site/src/lib/randomPost';

// 随机打开一篇博客（React 版本，用在 404 页）。
// 页脚里的链接用 data-random-post + 客户端模块实现，逻辑共用 src/lib/randomPost.js。

export default function RandomPostButton({label, className = 'button button--secondary'}) {
  const {i18n} = useDocusaurusContext();
  const isEn = i18n.currentLocale === 'en';
  const defaultLabel = isEn ? 'Surprise me' : '随便看看';
  const pendingLabel = isEn ? 'Picking…' : '挑选中…';
  const failedLabel = isEn ? 'Failed, try again' : '读取失败，请重试';

  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  const handleClick = useCallback(async () => {
    if (pending) {
      return;
    }
    setPending(true);
    setFailed(false);
    try {
      const post = await pickRandomBlogPost();
      if (!post) {
        setFailed(true);
        return;
      }
      window.location.assign(post);
    } catch {
      setFailed(true);
    } finally {
      setPending(false);
    }
  }, [pending]);

  return (
    <button
      type="button"
      className={className}
      onClick={handleClick}
      disabled={pending}
      aria-live="polite">
      {pending ? pendingLabel : failed ? failedLabel : label ?? defaultLabel}
    </button>
  );
}
