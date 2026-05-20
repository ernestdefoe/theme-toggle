# Theme Toggle

Adds a day/night/system toggle button to the Flarum 2 header. Works on any theme that respects Flarum 2's native `<html data-theme="…">` signal (which is most of them, including the default theme).

## What it does

- Adds a small icon button to `HeaderSecondary` next to search/notifications.
- Clicking cycles through three states: **dark → light → system → dark**.
- The choice is saved to `localStorage` and re-applied on every page load.
- In **system** mode the theme follows `prefers-color-scheme` and updates live when the OS theme changes.
- If the user has never clicked the button, Flarum's Appearance → Color Scheme setting is left untouched.

## Install

```bash
composer require ernestdefoe/theme-toggle
php flarum cache:clear
```

Then enable **Theme Toggle** from the admin panel's Extensions page.

## Build (development)

```bash
cd js
npm install
npm run build       # production
npm run dev         # watch
```

## How it works

Flarum 2 ships with a server-side `<html data-theme="dark">` / `data-theme="light"` attribute driven by the admin's Color Scheme picker. Themes define their dark tokens as the default and their light tokens under `[data-theme^='light']` (or vice versa). This extension just flips that attribute client-side and persists the user's choice — no theme-specific CSS, so it composes with any well-behaved Flarum 2 theme.

## License

MIT
