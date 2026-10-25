import React from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';
import Giscus from '@giscus/react';
import { useColorMode } from '@docusaurus/theme-common';

export default function GiscusComments() {
  const { colorMode } = useColorMode();

  return (
    <BrowserOnly fallback={<div>加载评论中...</div>}>
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
          lang="zh-CN"
          loading="lazy"
        />
      )}
    </BrowserOnly>
  );
}