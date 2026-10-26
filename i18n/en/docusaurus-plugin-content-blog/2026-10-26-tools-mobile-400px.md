---
slug: tools-mobile-400px
title: "The 400px ghost: hunting a mobile overflow bug"
authors: [lxhanesser]
tags: [Frontend, Performance]
date: 2026-10-26T21:45:00+08:00
description: On a 320px phone the page was 80px too wide. The culprit was flex min-content — and my own test scripts lied to me twice along the way.
---

Before shipping the new tools I ran a mobile pass. Eight of nine pages showed zero overflow; the datapack generator was 80px too wide at 320px.

The annoying part: **you cannot see this on a desktop browser**.

{/* truncate */}

## Step one: turn "overflow" into a number

```js
document.documentElement.scrollWidth - document.documentElement.clientWidth
```

A 320 viewport produced a `scrollWidth` of 400 — 80px, not an optical illusion.

## Step two: find what is wider than the viewport

Walk every element and look for a `right` edge past the viewport. The first suspect was the navbar's sidebar backdrop:

```
DIV.navbar-sidebar__backdrop   w=400
```

Nearly fooled me. It is `position: fixed`, so it **does not take part in document flow and cannot create scrollbars** — it just happened to be 400px wide and matched my filter.

Excluding fixed elements revealed the real shape of the problem: `<main>` was 400px wide while its parent was 320.

## Step three: bisect

If `<main>` is being stretched, find what stretches it. Crude but effective: **hide each child in turn and see whether `scrollWidth` drops back to 320**.

```js
for (const kid of node.children) {
  kid.style.display = 'none';
  const fixedNow = document.documentElement.scrollWidth <= vw;
  kid.style.display = '';
  if (fixedNow) return kid;   // found it
}
```

First level hit: the file-list `<ul>`. Inside, every `<li>` was 400px wide — because of one monospace path:

```
data/my_pack/function/main.mcfunction
```

## Root cause: the default min-width

This is a classic flex-layout trap:

- A flex item's `min-width` defaults to `auto`, meaning it will not shrink below its **min-content**
- For `white-space: nowrap` text, min-content is the full line width
- So a 37-character monospace path pushed the entire chain to 400px

I assumed `min-width: 0` on the containers would fix it. It did not: `min-width: 0` allows **shrinking**, but a flex container still consults its children's content size when computing its own minimum.

**The actual fix is to let the content wrap**:

```css
.itemName {
  white-space: normal;
  word-break: break-all;
}
```

`break-all` allows breaks between any characters — a path has no spaces, so normal wrapping finds no break opportunity. After that, 320 and 375 both went to zero.

## The touch target found in the same pass

The same sweep measured tappable heights and found the copy buttons in result lists were only 32px tall.

Project rules require at least 44×44. The bug was scope: `min-height` had been set for `<a>` in that row but not for `<button>`:

```css
.itemActions button { min-width: 44px; min-height: 44px; }
```

## The embarrassing part: my test scripts lied twice

I drove the browser through CDP scripts to simulate user actions, and got two false results — neither of which was the app's fault:

**First**: I selected the page-range field with `input[type=text]`. That field has no `type` attribute (text is the default), and CSS attribute selectors **do not match elements missing the attribute** — so it grabbed the navbar search box instead. I typed the page range into site search.

**Second**: earlier in the project I decided whether an iframe was blocked by listening for `iframe.onload`. A blocked iframe **also fires onload** (with an error document), which led to exactly the opposite conclusion.

The lesson is plain: **test scripts are code and they are wrong sometimes**. When a result disagrees with expectations, suspect the test before the thing under test.

## A breakpoint trade-off

The tool switcher at the top of each tool page turns into a horizontally scrolling strip on narrow screens. Fourteen tools already need two swipes; more would be unusable.

So it now splits by breakpoint:

- ≥768px: horizontal chips, one tap to any tool
- ≤767px: a native `<select>` with optgroups — no horizontal scrolling, one-handed, still fine at fifty tools

Native controls have a quiet advantage on mobile: **the OS handles touch, scrolling and accessibility for you**, which is more reliable than a hand-rolled dropdown.

## Takeaway

Mobile bugs have two properties: **invisible on desktop**, and **not judgeable by eye**. So convert them into numbers — how many pixels of overflow, how tall is the target — then bisect.

And verify your verifier.
