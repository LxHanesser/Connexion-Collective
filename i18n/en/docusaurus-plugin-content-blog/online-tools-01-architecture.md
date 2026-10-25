---
slug: online-tools-01-architecture
title: "Adding a tools section to a static blog: decide the boundaries first"
authors: [lxhanesser]
tags: [Engineering, Web tools]
date: 2026-10-25T19:30:00+08:00
description: For a purely static blog, the hard part of adding tools is not writing features but deciding what must not be done.
---

This site is hosted on Cloudflare Pages with nothing but build output — no server. Adding an "online tools" section starts with boundaries, not with a tech stack.

{/* truncate */}

## Three lines we must not cross

1. **No backend.** No Pages Functions, no Workers, no database. Tools compute either at build time or in the visitor's browser.
2. **No file uploads.** Images and text stay in memory; the page never sends an upload request. This is a privacy promise, and it also removes a large part of the attack surface.
3. **Do not slow down the main site.** Tools are a low-frequency entry point; the homepage and article pages should not download a single extra kilobyte for them.

Once those are fixed, the technical choices almost make themselves: browser-native capabilities plus static assets.

## How it is structured

- One route per tool: `/tools/image-compress`, `/tools/image-crop`, and so on. Docusaurus splits each page into its own bundle, so you only download the code for the page you visit.
- Heavy logic lives in `src/lib/` and is pulled in with `await import()` when the user actually acts.
- WASM encoders live in `static/wasm/`, self-hosted, never on a CDN.
- The tools index `/tools` only contains cards and links; it weighs 2 KB.

## The measured loading cost

Cold loads with caching disabled: the homepage pulls 570 KB of JS and requests 0 WASM; the tool page adds only its own 10 KB; the 22 KB encoder library and 246 KB mozjpeg only appear after clicking "Start compressing". In other words, the tools contribute 0 to the homepage.

## A counter-intuitive lesson

Writing features before deciding boundaries usually leads to rework. If "process locally" had not been fixed from the start, it would be tempting to add "upload to a server, it is more reliable" — and the whole security line collapses. **Writing down what must not be done is more useful than picking a framework first.**
