import React from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';
import Giscus from '@giscus/react';
import { useColorMode } from '@docusaurus/theme-common';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';

export default function GiscusComments() {
  const { colorMode } = useColorMode();
  const { i18n } = useDocusaurusContext();
  const isEn = i18n.currentLocale === 'en';

  return (
    <BrowserOnly fallback={<div>{isEn ? 'Loading comments…' : '加载评论中...'}</div>}>
      {() => (
        <Giscus
          repo="LxHanesser/Connexion-Collective"
          repoId="R_kgDOVWAONQ"
          category="Comments"
          categoryId="DIC_kwDOVWAONc4DJj29"
          mapping="pathname"
          strict="0"
          reactionsEnabled="1"
          emitMetadata="0"
          inputPosition="top"
          theme={colorMode === 'dark' ? 'dark_dimmed' : 'light'}
          lang={isEn ? 'en' : 'zh-CN'}
          loading="lazy"
        />
      )}
    </BrowserOnly>
  );
}
