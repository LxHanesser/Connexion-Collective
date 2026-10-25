---
slug: online-tools-06-security
title: "Where the attack surface of a pure front-end tool really is"
authors: [lxhanesser]
tags: [Engineering, Web tools, Security]
date: 2026-10-25T20:45:00+08:00
description: No backend means no privilege escalation or injection — but risk does not disappear, it moves.
---

"No uploads, no backend, therefore secure" is only half true. Removing the server does eliminate a large part of the attack surface, but the risk moves to two places: **the visitor's browser** and **the dependency chain**.

{/* truncate */}

## Risks that genuinely do not exist

With no server, these are off the table: SQL injection, privilege escalation, SSRF, an upload endpoint being abused, a database being dumped. A tool only touches files the visitor selected, and results go back to that visitor's own browser.

## The four things actually worth defending

**1. Supply chain.** Third-party packages execute at build time and can read the repo and modify output. Countermeasures: pin exact versions, commit the lockfile, prefer zero- or few-dependency libraries, and inspect `postinstall` scripts. For the QR code tool I eventually picked the zero-dependency `qrcode-generator` over `qrcode`, which drags in `pngjs` and `yargs`.

**2. Decoder vulnerabilities.** A malicious image can trigger memory errors in a WASM decoder. The blast radius is the tab that opened it — no server means no other users are affected. Countermeasure: follow upstream releases, do not hand-patch binaries.

**3. Resource exhaustion.** One enormous image can freeze a phone tab. Countermeasures: 25 MB per file, a 40-megapixel ceiling, 20 files per batch, concurrency limited to 2, and automatic downscaling beyond the limit.

**4. XSS.** File names, QR content, and user input are all untrusted. Countermeasures: always `textContent` or Canvas drawing, never HTML concatenation; revoke `blob:` URLs when done.

## Proving "nothing is uploaded"

Not by claiming it, but by capturing traffic: run the whole compression flow in a headless browser and record the host of every request. The result was only the local static server and `blob:` addresses, with no external requests, and the WASM indeed came from our own `/wasm/`.

## A side benefit

Because there are only static files, there is almost nothing exploitable to configure on Cloudflare Pages: no environment variables, no functions, no runtime version to babysit. The attack surface shrinks to "build output plus a browser".

## Lesson

Security is not a single dimension called "has a backend or not". What pure front-end projects most often neglect is the dependency chain and input handling — hold those to backend standards.
