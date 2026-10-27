---
slug: mobile-menu-secondary-column
title: "Why the mobile menu hid “Blog” and “Tools”"
authors: [lxhanesser]
tags: [Frontend, Engineering]
date: 2026-10-27T11:10:00+08:00
description: On a phone, opening the hamburger inside the docs section showed only the docs navigation. It turned out not to be a bug but deliberate framework behaviour — and a 36-line fix.
---

The symptom: on a phone, open “Start here” from the homepage, then tap the hamburger — the menu shows only the docs navigation. **Blog and Tools are gone.**

I assumed my own changes had broken the navbar. Reading the framework source showed otherwise: this is Docusaurus’s design.

{/* truncate */}

## The reason is in the source

The mobile sidebar has two columns:

- Column one: navbar items (Start here, Blog, Tools, …)
- Column two: the contextual menu for the current page (docs sidebar / blog post list)

The logic that decides which column opens lives in `navbarSecondaryMenu/display.js`:

```js
// When the sidebar closes, mark secondary as shown so it reopens first
useEffect(() => {
  if (!hasContent) { setShown(false); return; }
  if (!mobileSidebar.shown) { setShown(true); }
}, [mobileSidebar.shown, hasContent]);
```

In other words: **whenever the current page has secondary content, the next open always shows that column first.** On docs and blog pages the first column is pushed off-screen, reachable only via “← Back to main menu”.

## Three options

| Option | Cost |
|---|---|
| Force column one first | The docs sidebar has no other entry point on mobile, so sub-navigation disappears |
| A fixed bottom tab bar | Best feel, but it is a navigation redesign and permanently occupies screen space |
| **Add section links to the top of column two** | Smallest change, keeps the native behaviour intact |

I took the third.

## Implementation

Override `Navbar/MobileSidebar/SecondaryMenu`. The original is 36 lines — a back button plus the contextual content — so we insert one row between them:

```jsx
<>
  <SecondaryMenuBackButton onClick={() => secondaryMenu.hide()} />

  <nav className="mobile-quicknav">
    <Link to="/">Home</Link>
    <Link to="/blog">Blog</Link>
    <Link to="/tools">Tools</Link>
  </nav>

  {secondaryMenu.content}
</>
```

The CSS is thin: a three-column grid, `min-height: 44px`, 8px gaps, and hover styles guarded by `@media (hover: hover)` because `:hover` sticks on touch devices.

## Verification

- All three entries are 44px tall at 375px
- Tapping “Blog” navigates to `/blog` and closes the menu
- The docs navigation stays below the quick links, and the back button remains
- The same row appears on blog pages, where column two is the post list
- Desktop is untouched (the mobile sidebar does not render above 997px)

One nice detail: `Link` is locale-aware, so the English site goes to `/en/blog` without any manual prefix.

## Takeaway

When framework behaviour looks like a bug, fighting it is usually the expensive option. Adding a thin layer on top of its structure is cheap, survives upgrades, and does not damage accessibility.
