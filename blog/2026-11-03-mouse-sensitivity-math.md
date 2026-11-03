---
slug: mouse-sensitivity-math
title: 鼠标灵敏度换算：DPI、eDPI 与 cm/360 到底怎么算
authors: [lxhanesser]
tags: [游戏, 技术]
date: 2026-11-03T14:00:00+08:00
description: eDPI 只能同游戏内比较，跨游戏要有 cm/360。本文给出从 DPI 与游戏内灵敏度推导 cm/360 的完整公式、常见游戏的 yaw 常数，以及鼠标加速为什么会毁掉这个换算。
---

“我 CS 是 800 DPI × 1.0，转瓦罗兰特该设多少？” 这是最常见的问题，而网上的答案往往只给一个数字，不给推导过程。换个游戏、换个 DPI，就又不知道了。

只要理解一个量 —— **cm/360**（鼠标在垫子上移动多少厘米，角色刚好转 360°），所有换算都能自己算。

{/* truncate */}

<img src="/img/blog/sensitivity/fig1-chain.svg" alt="灵敏度换算链条：DPI 与游戏内灵敏度得到 eDPI，再结合 yaw 得到 cm/360" width="1000" height="280" loading="lazy" />

## 一、三个概念

| 概念 | 含义 | 能否跨游戏比较 |
|---|---|---|
| **DPI** | 鼠标每移动 1 英寸上报多少个计数 | ✅ 硬件参数 |
| **eDPI** | `DPI × 游戏内灵敏度` | ❌ 只在同一游戏内可比 |
| **cm/360** | 转身 360° 需要移动的物理距离 | ✅ 真正的“手感” |

eDPI 的问题在于：每个游戏的“灵敏度 1.0”对应的旋转速度不同。CS 的 1.0 和瓦罗兰特的 1.0 差了三倍多，所以 eDPI 跨游戏没有意义。

## 二、核心公式

游戏引擎把鼠标计数换算成角度，用的是一常数 `yaw`（每个计数转多少度）：

```
cm/360 = 360 / (DPI × 灵敏度 × yaw) × 2.54
```

`2.54` 是英寸到厘米的换算。其中 `DPI × 灵敏度` 就是 eDPI：

```
cm/360 = 360 × 2.54 / (eDPI × yaw)
```

## 三、常见游戏的 yaw

| 游戏 / 引擎 | yaw（度 / 计数） | 备注 |
|---|---|---|
| CS2 / CS:GO | 0.022 | Source 引擎 |
| Apex Legends | 0.022 | 同为 Source 系 |
| Valorant | 0.07 | 约等于 CS 的 3.18 倍 |
| Overwatch 2 | 0.0066 | 数值很小，所以灵敏度看起来“很低” |

> yaw 的准确值来自引擎配置，不同版本可能微调；做精确换算时建议以游戏内实测为准（转 360° 量一次距离）。

## 四、代码实现

```js
const YAW = {
  cs2: 0.022,
  apex: 0.022,
  valorant: 0.07,
  overwatch: 0.0066,
};

/** 计算 cm/360 */
export function toCm360({dpi, sensitivity, yaw}) {
  if (!(dpi > 0) || !(sensitivity > 0) || !(yaw > 0)) {
    throw new Error('DPI、灵敏度与 yaw 都必须大于 0');
  }
  return (360 / (dpi * sensitivity * yaw)) * 2.54;
}

/** 已知目标 cm/360，反推灵敏度 */
export function toSensitivity({dpi, yaw, cm360}) {
  if (!(dpi > 0) || !(yaw > 0) || !(cm360 > 0)) {
    throw new Error('参数必须大于 0');
  }
  return 360 / ((cm360 / 2.54) * dpi * yaw);
}

/** 跨游戏换算：保持 cm/360 不变 */
export function convert({dpi, sensitivity, from, to}) {
  const cm360 = toCm360({dpi, sensitivity, yaw: YAW[from]});
  return toSensitivity({dpi, yaw: YAW[to], cm360});
}
```

用起来：

```js
const cm = toCm360({dpi: 800, sensitivity: 1.0, yaw: YAW.cs2});
// 800 DPI × 1.0（CS）= 约 51.9 cm/360

const val = convert({dpi: 800, sensitivity: 1.0, from: 'cs2', to: 'valorant'});
// 瓦罗兰特约 0.314
```

## 五、几个容易搞错的地方

### 1. 换 DPI 不等于换灵敏度

cm/360 只取决于 `DPI × 灵敏度` 的乘积。DPI 翻倍、灵敏度减半，cm/360 不变。

但两者并不完全等价：

- 低 DPI + 高灵敏度时，一个计数对应更大的角度，**量化更粗**
- 高 DPI + 低灵敏度更平滑，但对传感器噪声更敏感

所以“800 DPI × 1.0”和“1600 DPI × 0.5”手感接近，但不等同。

### 2. 鼠标加速会毁掉换算

如果系统或游戏里开了鼠标加速（acceleration / 提高指针精确度），移动速度会影响转角，cm/360 就不再是常数。做换算前必须关掉。

### 3. FOV 不影响 cm/360

cm/360 是**转身距离**，与视野无关。FOV 改变的是“同一段鼠标移动在屏幕上看起来移动了多少”，不改变实际旋转角度。这也是为什么换 FOV 后会觉得“变快了”，但转身所需的距离没变。

### 4. 轮询率（1000 Hz / 8000 Hz）不影响

轮询率影响采样密度与延迟，不改变“移动一英寸对应多少计数”这个定义。

## 六、排查表

| 现象 | 原因 | 处理 |
|---|---|---|
| 换算后手感明显不同 | 开了鼠标加速 | 关闭系统与游戏内加速 |
| 同一游戏两个工具结果不同 | yaw 常数版本不同 | 以游戏内 360° 实测为准 |
| 换了 DPI 后感觉“变快” | 只改了 DPI 没动灵敏度 | cm/360 会变，按公式重算 |
| 不同游戏内 eDPI 一样但手感不同 | eDPI 不可跨游戏比较 | 换算成 cm/360 |
| 结果数量级明显不对 | 单位混淆（英寸/厘米） | 公式里记得乘 2.54 |

## 七、小结

- 跨游戏比较只看 **cm/360**，eDPI 只在同游戏内有意义
- 核心公式：`cm/360 = 360 / (DPI × 灵敏度 × yaw) × 2.54`
- 换算前关掉鼠标加速，否则一切都不准
- FOV、轮询率都不改变 cm/360

下一篇回到图像：像素画的降采样与中位切分调色板。
