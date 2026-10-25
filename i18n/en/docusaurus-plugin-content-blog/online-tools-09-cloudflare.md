---
slug: online-tools-09-cloudflare
title: "A static site on Cloudflare Pages: details that are easy to miss"
authors: [lxhanesser]
tags: [Engineering, Web tools]
date: 2026-10-25T21:30:00+08:00
description: From WASM MIME types to cache headers, static hosting has its own engineering details.
---

The site is deployed on Cloudflare Pages, and the build command is just `npm run build`. The longer I use it, the clearer it is that static hosting is not "upload and forget" — a few details directly affect the result.

{/* truncate */}

## 1. Why no Pages Functions

Functions solve plenty of problems (dynamic injection, auth), but they turn a pure static project into a project with a backend: a runtime, cold starts, and more code paths to maintain.

My rule of thumb: **if it can be solved at build time or in the browser, never add a function.** The footer day counter runs in the browser, the search index is generated at build time, image compression uses WASM — not a single function was written.

## 2. WASM MIME types and self-hosting

WASM files live in `static/wasm/` and are served as static assets. Browsers check the MIME type when using `instantiateStreaming`; Pages handles `.wasm` correctly, and if an environment does not, Emscripten falls back to loading via ArrayBuffer.

The key point is **do not use a CDN**: a third-party CDN adds a domain, a failure point, and another trust relationship.

## 3. Cache strategy follows whether the filename has a fingerprint

There are only two cache rules in `_headers`:

- `/assets/*`: one year, `immutable`, because those filenames contain a content hash;
- `/img/*`: one week, since images rarely change.

HTML gets no long cache — Pages' default behaviour ensures a new deploy is visible immediately.

The security headers `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, and `Permissions-Policy` stay in place.

## 4. Distinguish build warnings that matter

After adding jSquash, the build gained a "circular dependency between chunks" warning. It looks alarming, but it only affects hash reuse between chunks, not the runtime. My approach: confirm the output works, note it, and do not restructure the architecture just to silence it.

## 5. Confirming a deploy actually happened

Do not check the dashboard — check the output: note the `main.[hash].js` filename after building, then request the live page a minute after pushing. A changed hash means the new version is live. Last time it took a little over a minute from push to the CDN serving the new bundle.

## Lesson

The complexity of static hosting is not in the server but in "build output" and "caching". Get file fingerprints, cache headers, and size limits right, and let the platform handle the rest.
