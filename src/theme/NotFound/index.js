import NotFoundContent from '@site/src/components/NotFoundContent';

// 覆盖主题默认 404：
// - 静态托管对未知路径返回 build/404.html（根目录一份），英文路径命中时 SSR 是中文；
// - 客户端路由未匹配时，主题会渲染 @theme/NotFound，必须一起覆盖才会显示同一份内容。
export default NotFoundContent;
