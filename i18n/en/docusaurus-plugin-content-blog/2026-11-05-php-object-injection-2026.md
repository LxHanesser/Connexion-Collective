---
slug: php-object-injection-2026
title: "PHP object injection never went away: two WordPress plugin CVEs"
authors: [lxhanesser]
tags: [Security, Engineering]
date: 2026-11-05T21:00:00+08:00
description: Two WordPress plugin object-injection flaws landed in NVD this October, the worst at CVSS 8.8. Deserialisation is not a Java-only problem — PHP's unserialize plus magic methods can still turn a content submission into remote code execution. Here is how it works, who can reach it, and what actually helps.
---

Two quiet entries in October's NVD: `CVE-2026-97284` (Icegram ≤ 3.1.31, CVSS 8.8) and `CVE-2026-94390` (Hide Shipping Method for WooCommerce ≤ 1.5.4, CVSS 7.2). Both are PHP object injection.

Every time one of these drops, someone in the comments says PHP deserialisation is ancient history. Yet the WordPress plugin ecosystem keeps making the same mistake: handing a user-supplied string to `unserialize()` and hoping every class that might be instantiated is harmless.

This post is not about how to exploit it. It is about why it keeps happening and what a site owner can actually do.

{/* truncate */}

<img src="/img/blog/php-object-injection/fig1-chain-en.svg" alt="PHP object injection chain: user input reaches unserialize, triggers magic methods, forms a gadget chain and performs a dangerous operation" width="1000" height="300" loading="lazy" />

## What is actually being injected

PHP's `serialize()` turns an object into a string; `unserialize()` turns it back. The problem is the second half: when the string is attacker-controlled, the attacker chooses *which class* gets instantiated — and PHP automatically calls magic methods such as `__wakeup()` and `__destruct()` during that process.

A single class usually cannot do much on its own. But install enough plugins and their classes can be chained: class A's destructor calls a method on class B, which calls a file-write on class C. That is a POP chain — property-oriented programming.

So the severity of an object-injection bug is not a property of the bug. It is a property of the classes present on the target site. The same payload may only cause a warning on a lean site and full RCE on a site with thirty plugins.

## Why WordPress plugins are a hotspot

Three things stack up:

1. **Many entry points.** Posts, comments, profiles, order notes — anywhere a string is stored can become a deserialisation sink.
2. **The permission model.** Contributors can write drafts; Editors can publish and change settings. Plenty of plugins treat data from a Contributor as trusted.
3. **Slow patching.** The author releases, users update, hosts cache — any stalled link in that chain extends the exposure window.

Both CVEs require Contributor or Editor privileges, so neither is an unauthenticated RCE in isolation. But in practice, leaked credentials, weak passwords and credential-stuffing against editor accounts are routine. The bar is lower than the CVSS vector suggests.

## Defence is not "install a WAF"

Object-injection payloads are serialised strings, often wrapped in base64, gzip or a custom encoding. Writing WAF rules that catch them without breaking normal traffic is hard, and the rules age badly.

Three things work better:

**First, do not call `unserialize()` on user input.** New code should use `json_decode()`, which never instantiates objects. This is the only complete fix.

**Second, if you must, disable class instantiation.** Since PHP 7, `unserialize($data, ['allowed_classes' => false])` restores arrays and scalars only, creating no objects at all. A surprising amount of old code still does not know this flag exists.

**Third, install fewer plugins.** Every plugin adds classes that can be pulled into a gadget chain. A site with one plugin and a site with thirty face very different risk from the same CVE.

Two engineering habits on top:

- Enforce 2FA on editor accounts, allocate Contributor accounts only when needed, and delete them when the work ends.
- Watch the PHP error log for a sudden rise in `unserialize()` warnings and 500s. Successful object injection usually leaves traces before it lands.

## A personal note

PHP object injection and Java deserialisation are the same class of bug: the language offers "turn a string back into an object", and the framework gives objects too many automatic hooks. As long as both exist, the vulnerability will keep coming back in cycles.

For a personal site, the realistic strategy is not to study every payload. It is to **shrink the attack surface**: fewer plugins, faster updates, tighter permissions. Those three do more than any pile of WAF rules.
