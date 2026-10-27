---
sidebar_position: 2
title: Changelog
---

# Changelog

Every change this site goes through.

## 2026-10-27

**Footer**

- The footer now carries a row of clickable security badges: SSL Labs A+, Security Headers A, HSTS, DNSSEC, and “Hosted on Cloudflare”. Each one opens the corresponding live third-party report.
- They are local HTML/CSS plus a same-origin SVG — **no requests to any third party**, and no visitor IP handed to an outside service.

**Mobile**

- On docs and blog pages the mobile menu opens straight into that section’s own navigation. Three quick entries — Home, Blog, Tools — now sit above it, so switching sections no longer requires tapping “back to main menu” first.

**Blog**

- List pagination now shows page numbers (1, 2, …) with “Page X of Y”, and the arrows grey out at the ends.
- The previous/next post links at the bottom of an article are now cards with the publication date and a “Post N of M” position.

**Cleanup**

- Removed the “Edit this page” / “Edit this post” links from docs and blog pages — that is an authoring entry point, and visitors who click it only reach GitHub’s editor.

## 2026-10-26

**Performance**

- The navbar logo is now WebP: 45 KB down to 5 KB, so every page downloads 40 KB less.
- Added preconnect hints for the image and comment services, so the first image and the comment section show up sooner.
- Reworked how images are cached: replacing an image now renames the file too, so updates appear immediately instead of waiting for a cache to expire.

**Accessibility and indexing**

- The three homepage section titles are now proper `h2` headings. They used to jump straight from `h1` to `h3`, which confused screen readers.
- Decorative icons on the homepage are hidden from screen readers instead of being announced as unnamed graphics.
- The sitemap now includes a last-modified date for every post, so search engines can tell how fresh each page is.

**Tools**

- The tools section is split into **Everyday tools** (images, PDF, SVG, EXIF, developer utilities) and **Game tools** (the Minecraft coordinate converter and datapack generator).
- Eight new tools: image to ICO, image to Base64, pixel-art converter, SVG optimiser, EXIF viewer/remover, PDF merge/split, Minecraft coordinate converter, and a datapack generator. All run locally; nothing is uploaded.
- Four new CS2 tools: crosshair command generator with a live preview, sensitivity converter (cm/360 across four games), viewmodel generator, and an autoexec.cfg generator.
- Every tool page now has a switcher at the top for jumping between tools. On phones it becomes the system's own dropdown, so nothing scrolls sideways.
- The tools list has a search box — type "PDF" or "coordinates" to filter.
- The navbar tools menu now goes by category, so it no longer grows with every new tool.
- Fixed a visual glitch where tool buttons kept their hover colour after being tapped on touch devices.
- Fixed the tools menu in the navbar: all three entries were previously marked as the current page at the same time.

**Writing**

- Five new posts cover this batch: hand-written ICO and ZIP encoders, the boundaries of SVG optimisation, pixel-art palettes, PDFs in the browser, and a mobile overflow hunt. English editions ship alongside.

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
