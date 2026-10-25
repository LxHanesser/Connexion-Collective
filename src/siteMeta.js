// 站点元信息：构建时（docusaurus.config.js）和浏览器端（src/clientModules）共用同一份常量。
// 改上线日期只需要改这一行的 LAUNCH_DATE，页脚天数会跟着变，不需要重建。

// 站点上线日（北京时间 00:00），格式 YYYY-MM-DD
export const LAUNCH_DATE = '2026-10-25';

export const LAUNCH_TIME = Date.parse(`${LAUNCH_DATE}T00:00:00+08:00`);

export const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * 站点已运行天数（上线当天算第 1 天，从北京时间零点起算）。
 * @param {number} [now] 时间戳，默认当前时间
 * @returns {number}
 */
export function daysSinceLaunch(now = Date.now()) {
  const elapsed = Math.floor((now - LAUNCH_TIME) / MS_PER_DAY);
  return Math.max(elapsed + 1, 1);
}
