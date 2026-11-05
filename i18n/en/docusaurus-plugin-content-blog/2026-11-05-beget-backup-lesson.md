---
slug: beget-backup-lesson
title: "When the backups die with the host: lessons from Beget"
authors: [lxhanesser]
tags: [Security, Infrastructure]
date: 2026-11-05T22:00:00+08:00
description: "On 3 November, Russian host Beget disclosed a destructive attack — the attacker reached the management plane, ran wipe scripts, and cloud data disappeared along with part of the backups. Having backups is not the same as being able to restore; this incident puts a hole in the usual 3-2-1 advice."
---

On 3 November, Russian hosting provider Beget published a notice confirming a destructive attack. According to the notice and several Russian technical outlets, the attacker obtained access to the management plane, ran wipe scripts, and caused the loss of some cloud data — **including part of the backups**.

That is more thorough than ransomware. Ransomware at least keeps the data and waits for payment. A wipe script does not offer a negotiation.

{/* truncate */}

<img src="/img/blog/beget-backup/fig1-layers-en.svg" alt="Destructive attack path: once the management plane falls, production data and same-account backups are deleted together; an offline immutable copy is the last line" width="1000" height="300" loading="lazy" />

## The most important link in the chain

From public information, the path looks roughly like this:

```
management credentials → bulk operations → delete production data → backups affected
```

The fatal part is not that data was deleted. It is that **the backups lived in the same trust domain as the management plane**. If the backup account, backup storage, backup console and production share one set of credentials, a single compromise destroys both the data and the way back.

This is a common hole in "3-2-1" implementations: three copies, two media, one off-site — sounds complete, but all three copies are deleted with the same permissions. In practice you had one copy.

## How backups should be designed

The industry has largely moved to **3-2-1-1-0**:

| Number | Meaning |
|---|---|
| 3 | at least three copies |
| 2 | two different media |
| 1 | one copy off-site |
| 1 | one copy offline or immutable |
| 0 | zero errors in restore drills |

The hardest and most important is the "1": **offline or immutable**.

In practice:

- Turn on **versioning** and **object lock** (WORM) on object storage; deletion requires a separate, rarely used permission.
- Write backups with an **independent account** that shares no SSO and no recovery email with production.
- Periodically export critical backups **offline** (tape, cold storage, a physical disk kept disconnected).
- Give the backup console's admin account its own 2FA, never reused from production.

## Restore drills matter more than the backup itself

Many teams have backups and have never restored one under real failure. When it matters, they discover:

- the backup is complete, but the restore script depends on a service that was also deleted;
- the backup is encrypted, but the key lived on the same deleted machine;
- the backup restores, but it takes 40 hours and the business cannot wait.

So the "0" is not a slogan. Run a full **backup-to-working-service** drill every quarter, and record RTO and RPO. A backup that fails a drill is not a backup.

## What this means for a personal site

A personal site is simpler than a hosting provider, but the logic is the same:

1. Keep code and posts in git, with more than one remote (GitHub + local + a mirror).
2. Put media in object storage with versioning, and keep an important subset locally.
3. Never keep the only backup under the same account as the site — one stolen account takes everything.
4. Verify regularly: pick a file at random and restore it, just to prove it works.

## Closing

Details of the Beget incident are still coming out, but the lesson is already clear: **backup safety is not about the number of copies. It is about whether delete permissions are isolated.**

If one account can delete both production and backups, the number of copies does not matter.
