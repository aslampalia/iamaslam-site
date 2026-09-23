# iamaslam.com — website source

This folder contains the website. You don't need to understand any of it —
it's here so the site can rebuild itself automatically whenever you publish
an essay from the editor.

## How it works

- You write essays at **https://iamaslam.com/admin** (log in, click Essays → New Essay).
- When you hit **Publish**, the site rebuilds itself in about a minute.
- The design, homepage, and old essays are never touched.

## File map (for reference only)

- `src/essays/*.md` — your essays, one file each (created by the editor)
- `src/_includes/` — page templates (the design — don't edit)
- `src/css/main.css`, `src/js/main.js` — styling and behavior (don't edit)
- `src/assets/` — images and favicon
- `src/admin/` — the editor configuration
- `netlify.toml` — tells Netlify how to build the site
- `eleventy.config.js` — the builder setup (don't edit)
