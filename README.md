# Theme Toggle

Adds a theme picker to the Flarum 2 header. Works on any theme that respects Flarum 2's native `<html data-theme="…">` signal (which is most of them, including the default theme).

## What it does

- Adds a small icon button to `HeaderSecondary` next to search/notifications.
- Clicking opens a dropdown with five options: **Dark**, **Dark (high contrast)**, **Light**, **Light (high contrast)**, **System**.
- The choice is saved to `localStorage` and re-applied on every page load.
- In **System** mode the theme follows `prefers-color-scheme` and `prefers-contrast: more`, and updates live when the OS settings change — so an accessibility user with high-contrast turned on gets the `*-hc` variant automatically.
- If the user has never picked an option, Flarum's Appearance → Color Scheme setting is left untouched.

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

Flarum 2 ships four `data-theme` values: `light`, `light-hc`, `dark`, and `dark-hc`. Themes define their dark tokens as the default and their light tokens under `[data-theme^='light']`, with a high-contrast layer under `[data-theme^='light-hc']` / `[data-theme^='dark-hc']`. Because the selectors use `^=` (prefix match), setting `data-theme="light-hc"` activates *both* the regular light palette and its HC overrides via the CSS cascade. This extension just flips that attribute client-side and persists the user's choice — no theme-specific CSS, so it composes with any well-behaved Flarum 2 theme.

## License

MIT
