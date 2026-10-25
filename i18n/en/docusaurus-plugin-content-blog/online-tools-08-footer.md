---
slug: online-tools-08-footer
title: "Redoing the footer: from two footers to a three-column one"
authors: [lxhanesser]
tags: [Engineering, Frontend]
date: 2026-10-25T21:15:00+08:00
description: One "it doesn't look good" note turned into five measurable problems once I measured it.
---

"The footer looks off — asymmetric on desktop, left-hugging and a bit plain on mobile." Before changing anything I took screenshots and measured, and "doesn't look good" turned out to be five concrete problems.

{/* truncate */}

## Five measured problems

| Problem | Evidence |
|---|---|
| Two footers | the homepage's home-made "About / Quick links / Stack / copyright" block plus the real footer |
| Width not aligned | footer container 1320px, content container 1140px centered |
| Two columns of 660px each | three lines of text per column, lots of empty space to the right |
| Left-aligned on mobile | copyright centered, links left-aligned — two alignments mixed |
| Copyright covered | at 375px the "back to top" button sat on top of it |

There was also a hidden bug: the global `.row .col:hover` transform applied to footer columns, making whole columns jump on hover.

## The plan: three columns

- Left: brand (name, one-line tagline, three pill buttons for Subscribe / Surprise me / GitHub);
- Middle: site navigation;
- Right: more (tools, changelog, terms);
- Bottom: a divider and a single copyright line.

The home-made block was deleted and its information merged into the footer, leaving exactly one footer.

## How it was implemented

The theme's `Footer` component can be swizzled, but that means maintaining a copy across theme upgrades. I chose another path: build the brand area from the `footer.links` config using its `html` field, and rearrange with CSS, leaving theme source untouched.

Breakpoints follow where the content actually wraps: three columns get cramped below 840px, so at 996px it becomes "brand on one row, two nav columns below", and below 420px everything stacks.

## Result

At 1440px the footer container is `left=143 width=1140`, matching the content; at 900px the brand takes its own row with two nav columns side by side; at 375px it is a centered single column with 4.5rem of bottom padding to clear the back-to-top button.

## Lesson

"It doesn't look good" is the hardest requirement because it has no acceptance criteria. Break it into alignments, widths, whitespace, breakpoints, and overlaps — then there is a direction to change and a way to verify.
