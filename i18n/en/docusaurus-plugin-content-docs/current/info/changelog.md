---
sidebar_position: 2
title: Changelog
---

# Changelog

Every change this site goes through.

## 2026-10-26

**Performance**

- The navbar logo is now WebP: 45 KB down to 5 KB, so every page downloads 40 KB less.
- Added preconnect hints for the image and comment services, so the first image and the comment section show up sooner.
- Reworked how images are cached: replacing an image now renames the file too, so updates appear immediately instead of waiting for a cache to expire.

**Accessibility and indexing**

- The three homepage section titles are now proper `h2` headings. They used to jump straight from `h1` to `h3`, which confused screen readers.
- Decorative icons on the homepage are hidden from screen readers instead of being announced as unnamed graphics.
- The sitemap now includes a last-modified date for every post, so search engines can tell how fresh each page is.

## 2026-10-25

**Content**

- New post: "Giving the blog somewhere to keep its pictures: moving static media to Cloudflare R2". The English edition went live at the same time.

**Images**

- Post images switched to WebP: three images went from 177 KB to 63 KB in total, about 64% smaller with no visible loss.
- The site logo went through a vector cleanup (126 KB to 45 KB), verified with a pixel-by-pixel comparison to make sure nothing changed visually.
- New brand share card: links shared to social platforms now show this site's own preview image instead of the template default.
- Each post can set its own share image, so a shared link shows which article it is.

**Interaction**

- The blog now lists 12 posts per page, which removes the awkward second page holding just two posts.
- If the comment component fails to load, the page now offers a link to the GitHub discussions instead of leaving a blank area.
- Post images are served from a separate media service, loaded independently of the site itself.

**Security**

- Completed the site's security response headers and narrowed the range of third-party resources pages are allowed to load.
