---
slug: footer-security-badges
title: "The security badges in the footer: why I skipped third-party seals"
authors: [lxhanesser]
tags: [Engineering, Frontend]
date: 2026-10-27T09:40:00+08:00
description: Third-party “security seals” are a generic image anyone can paste. I wrote my own badges and linked them to verifiable reports — and hit two CSS traps on the way.
---

The interesting question about adding security badges is not which one looks best, but whether to use a third-party “seal” or build your own.

I chose the latter, and the reason is **verifiability**.

{/* truncate */}

## The problem with seals

A typical seal widget is three lines of HTML:

```html
<div id="cc-myssl-id">
  <a href="https://myssl.com/your-domain?from=mysslid">
    <img src="https://static.myssl.com/res/images/myssl-id3.png">
  </a>
</div>
```

It looks official, but **the image is generic**: the same PNG for everyone, with no proof that the domain belongs to you. The only real information is behind the link — the live report it opens.

The costs are concrete:

| Cost | What it means |
|---|---|
| One third-party request per page | Visitor IPs are exposed to an outside service |
| A CSP relaxation | The image host has to be allow-listed |
| Availability risk | If their CDN hiccups, you show a broken image |

For a site aiming at zero external requests, none of that is worth it.

## Self-hosted badges, linked to reports

The alternative is plain HTML/CSS pills, each pointing at an authoritative report:

| Badge | Where it verifies |
|---|---|
| SSL Labs A+ | Qualys SSL Labs live test |
| Headers A | securityheaders.com |
| HSTS | hstspreload.org (which also shows whether the domain is preloaded) |
| DNSSEC | Verisign’s DNSSEC Analyzer |

Every number can be checked on the spot by a third party, instead of resting on an image anyone can paste.

## Rule: never claim what you have not verified

A few things had to be stated honestly:

1. **SSL Labs really is A+** — all four edge endpoints. So the badge says A+.
2. **Security Headers is A, not A+** — so it says A. The grade is capped by a warning about `'unsafe-inline'` in the CSP, which cannot be removed (the edge injects a per-request inline script; blocking it can break the challenge flow). That is an architectural limit, not a misconfiguration.
3. **HSTS says HSTS, not Preload.** The response header carries the `preload` directive, but the domain is **not** on the browser preload list. Claiming “HSTS Preload” would be false.
4. DNSSEC only got a tick after two public resolvers both returned `AD=true`.

## Two traps

**Trap one: a light footer plus white borders equals invisible.**

I wrote `rgba(255,255,255,0.22)` borders out of habit, assuming a dark footer. The real background is `rgb(248,250,252)` — the badges were nearly invisible. They now have separate palettes for light and dark themes.

**Trap two: the theme’s `.footer a` rule uses `!important`.**

The badge text kept rendering in the theme green. The cause was a rule in the site CSS:

```css
.footer a { color: #2e8555 !important; }
```

`!important` beats specificity, so the only fix is a more specific selector such as `.footer .footer-badge`.

## The little orange cloud

An “Hosted on Cloudflare” badge sounds easy until you look at the logo: the official mark is the cloud plus the wordmark, far too wide for a pill.

So I loaded the official SVG in a browser, used `getBBox()` on each path, and found the cloud is three of the four paths spanning `x 54.9–103.1 / y 3.6–25.4`. Those three paths became an 808-byte SVG whose `viewBox` is cropped to the cloud itself.

- The paths are untouched (cropped, not redrawn), which satisfies the “do not modify the mark” rule
- It is a same-origin file, so no external request
- The white path reads as a highlight against the dark footer

Legally this is **nominative use**: the mark identifies which service the site runs on, it does not imply partnership or endorsement, and clicking it goes back to their site.

## Mobile

Five badges wrap into 2+2+1 on a phone, leaving the last one stranded. A two-column `grid` plus `grid-column: 1 / -1` on the hosting badge gives a tidy 2×2 with a full-width row underneath.

Heights are 32px on desktop and 44px on phones, so they are actually tappable.
