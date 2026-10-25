---
slug: online-tools-07-mobile-audit
title: "A mobile check-up with a headless browser"
authors: [lxhanesser]
tags: [Engineering, Frontend, Performance]
date: 2026-10-25T21:00:00+08:00
description: Screenshots lie; scrollWidth does not. A repeatable way to audit mobile layout.
---

The scariest part of mobile support is "looks fine to me". I started with my eyes and screenshots, and missed several problems that only appear at real device widths. Then I switched to measuring with a headless browser — and found that screenshots themselves can lie.

{/* truncate */}

## Attempt one: iframe plus virtual time — failed

The idea was simple: a diagnostic page loading the site in a 375px-wide iframe, reading its `scrollWidth`. The screenshot always got stuck at "measuring..." — the iframe's async loading never finished before capture, and `--virtual-time-budget` did not save it.

## Switching to CDP

Instead, connect directly to the DevTools protocol: launch headless Edge with `--remote-debugging-port`, connect from Node over WebSocket, set `Emulation.setDeviceMetricsOverride` to 375×812 with `deviceScaleFactor=2` and `mobile=true`, then run a check via `Runtime.evaluate`.

```js
const de = document.documentElement;
const overflow = de.scrollWidth > de.clientWidth;
```

That number is trustworthy: as long as `scrollWidth` equals the viewport width, there is no horizontal scrolling.

## What one check-up found

Measuring six pages at 375px surfaced these problems:

- the homepage's three-column info block was still three columns on phones (`col--4` does not stack by itself);
- the hero title was fixed at 3.5rem, far too large on narrow screens;
- the marquee was an empty green strip on mobile;
- footer titles were white text on a light background, nearly invisible;
- the copyright line was covered by the "back to top" button.

After fixing, re-measured: six pages × 375/320, every one with `scrollWidth == clientWidth`.

## A "fake bug" found along the way

Screenshots taken with `--window-size=375` looked cropped, and I briefly thought the layout had exploded. In fact headless windows have a minimum width, and the screenshot was cropped to 375 — the page itself never overflowed. **Screenshots lie; numbers do not.**

## Lesson

Mobile checks can and should be scripted:

1. Set the viewport to real device sizes (375, 320);
2. Assert `scrollWidth == clientWidth` for every key route;
3. Record which elements overflow, to locate the culprit;
4. Keep the script in the repo so it can be rerun after every change.

Compared to "take a look on my phone", this is repeatable, regression-friendly, and does not depend on having a device at hand.
