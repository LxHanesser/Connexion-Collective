---
slug: mouse-sensitivity-math
title: "Mouse sensitivity maths: DPI, eDPI, and cm/360"
authors: [lxhanesser]
tags: [Games, Engineering]
date: 2026-11-03T14:00:00+08:00
description: eDPI only compares within one game; cm/360 is what actually transfers. The full formula from DPI and in-game sensitivity, the yaw constants for common shooters, and why mouse acceleration breaks the whole conversion.
---

"I play CS at 800 DPI × 1.0 — what should I set in Valorant?" It is the most common question in the genre, and most answers hand you a number without the derivation. Change game or DPI and you are stuck again.

Understand one quantity — **cm/360** (how far the mouse travels to turn the character a full circle) — and every conversion is arithmetic.

{/* truncate */}

<img src="/img/blog/sensitivity/fig1-chain-en.svg" alt="Sensitivity chain: DPI times in-game sensitivity gives eDPI, then yaw gives cm/360" width="1000" height="280" loading="lazy" />

## 1. Three concepts

| Concept | Meaning | Comparable across games? |
|---|---|---|
| **DPI** | Counts reported per inch of mouse movement | ✅ Hardware property |
| **eDPI** | `DPI × in-game sensitivity` | ❌ Only within the same game |
| **cm/360** | Physical distance for a full turn | ✅ The real "feel" |

The problem with eDPI is that every game's "sensitivity 1.0" rotates at a different rate. CS 1.0 and Valorant 1.0 differ by more than three times, so eDPI comparisons across games are meaningless.

## 2. The core formula

Engines convert mouse counts into degrees using a constant `yaw` (degrees per count):

```
cm/360 = 360 / (DPI × sensitivity × yaw) × 2.54
```

The `2.54` converts inches to centimetres, and `DPI × sensitivity` is exactly eDPI:

```
cm/360 = 360 × 2.54 / (eDPI × yaw)
```

## 3. Yaw constants for common shooters

| Game / engine | yaw (degrees per count) | Notes |
|---|---|---|
| CS2 / CS:GO | 0.022 | Source engine |
| Apex Legends | 0.022 | Also Source-derived |
| Valorant | 0.07 | About 3.18× CS |
| Overwatch 2 | 0.0066 | Very small, so sensitivity numbers look low |

> Exact yaw values come from engine configs and can shift between versions. For precision work, measure a full 360° in-game and derive from that.

## 4. Implementation

```js
const YAW = {
  cs2: 0.022,
  apex: 0.022,
  valorant: 0.07,
  overwatch: 0.0066,
};

/** cm/360 */
export function toCm360({dpi, sensitivity, yaw}) {
  if (!(dpi > 0) || !(sensitivity > 0) || !(yaw > 0)) {
    throw new Error('DPI, sensitivity, and yaw must all be positive');
  }
  return (360 / (dpi * sensitivity * yaw)) * 2.54;
}

/** Invert: sensitivity for a target cm/360 */
export function toSensitivity({dpi, yaw, cm360}) {
  if (!(dpi > 0) || !(yaw > 0) || !(cm360 > 0)) {
    throw new Error('All arguments must be positive');
  }
  return 360 / ((cm360 / 2.54) * dpi * yaw);
}

/** Cross-game conversion: keep cm/360 constant */
export function convert({dpi, sensitivity, from, to}) {
  const cm360 = toCm360({dpi, sensitivity, yaw: YAW[from]});
  return toSensitivity({dpi, yaw: YAW[to], cm360});
}
```

Using it:

```js
const cm = toCm360({dpi: 800, sensitivity: 1.0, yaw: YAW.cs2});
// 800 DPI × 1.0 in CS ≈ 51.9 cm/360

const val = convert({dpi: 800, sensitivity: 1.0, from: 'cs2', to: 'valorant'});
// ≈ 0.314 in Valorant
```

## 5. Where people go wrong

### 5.1 Changing DPI is not the same as changing sensitivity

cm/360 depends only on the product `DPI × sensitivity`. Double the DPI, halve the sensitivity, and cm/360 is unchanged.

They are not perfectly equivalent, though:

- Low DPI with high sensitivity means each count covers a larger angle — **coarser quantisation**
- High DPI with low sensitivity is smoother but more exposed to sensor noise

So 800 × 1.0 and 1600 × 0.5 feel close, not identical.

### 5.2 Mouse acceleration destroys the maths

With acceleration enabled (in the OS or in-game), movement speed changes the rotation per count, so cm/360 is no longer a constant. Turn it off before converting.

### 5.3 FOV does not change cm/360

cm/360 is a turn distance; it is independent of field of view. FOV changes how much the world appears to move for the same mouse movement, not the actual rotation. That is why a wider FOV feels "faster" even though the distance per turn is identical.

### 5.4 Polling rate does not matter either

1000 Hz or 8000 Hz affects sampling density and latency, not the definition of counts per inch.

## 6. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Converted sens feels clearly off | Mouse acceleration enabled | Disable it in OS and game |
| Two tools disagree for the same game | Different yaw versions | Measure 360° in-game and derive |
| Feels "faster" after a DPI change | DPI changed, sensitivity left alone | Recompute cm/360 |
| Same eDPI feels different across games | eDPI is not cross-game | Convert to cm/360 |
| Result is off by an order of magnitude | Inches vs centimetres | Remember the ×2.54 |

## 7. Takeaways

- Compare across games with **cm/360**; eDPI only means something inside one game
- Core formula: `cm/360 = 360 / (DPI × sensitivity × yaw) × 2.54`
- Disable mouse acceleration first, or nothing else is accurate
- FOV and polling rate do not change cm/360

Next, back to images: pixel-art downsampling and median-cut palettes.
