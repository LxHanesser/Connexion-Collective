---
slug: online-tools-04-recompress
title: "The bug that demanded a page refresh: a poorly modelled state machine"
authors: [lxhanesser]
tags: [Engineering, Web tools, Frontend]
date: 2026-10-25T20:15:00+08:00
description: After compressing, changing the quality did nothing and the button was greyed out — a state modelling problem.
---

A user reported: after compressing, they were not happy with the result and wanted to try another quality, but the button was greyed out, so they had to refresh the page.

My first thought was "user error". My second was "no, this is mine".

{/* truncate */}

## The symptoms

- Compression finishes and the item state becomes "done";
- The main button is enabled only when there are **pending** items — now zero, so it is disabled;
- Changing quality or format does not invalidate finished results, and there is no "rerun" entry point;
- The only way out is deleting the image and selecting it again — which feels like a page refresh.

## Root cause

I tied "can I click" to "are there pending items", but a tool page has more than two states. The real model is at least:

`pending → working → done`, plus a dimension for **whether the result matches the current settings**.

I skipped that last dimension, so results could exist while being impossible to recompute.

## The fix

1. **Button label follows state**: with pending items it reads "Start compressing (N)"; once everything is done it becomes "Recompress" and is always clickable;
2. **Sign each result with its parameters**: every result stores the `format:quality:maxEdge` used to produce it, and is marked stale when settings differ;
3. **Show a hint**: when stale results exist, prompt "Settings changed — click Recompress to rerun with current parameters";
4. **Free memory before rerunning**: revoke old `blob:` URLs one by one so repeated compression does not pile up memory.

Measured on one image: default quality 96 KB → quality 40 gives 57 KB → WebP gives 18 KB, with no refresh at any point.

## Lesson

Do not assemble async tool state from booleans (`busy` / `hasResult` / `disabled` each doing its own thing) — contradictory combinations appear quickly. Model the state and "which parameters the result belongs to" explicitly, and a whole class of bugs disappears.
