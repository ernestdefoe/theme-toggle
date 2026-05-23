import app from 'flarum/forum/app';
import { extend, override } from 'flarum/common/extend';
import HeaderSecondary from 'flarum/forum/components/HeaderSecondary';
import type ItemList from 'flarum/common/utils/ItemList';

import ThemeToggle from './components/ThemeToggle';
import { resolveTheme, bindSystemListener, hasStoredChoice, syncFromServerPreference } from './theme';

// Pre-paint: avoid a flash before Flarum's own boot runs.
resolveTheme();

app.initializers.add('ernestdefoe-theme-toggle', () => {
  // Bring localStorage in line with the logged-in user's saved
  // `colorScheme` preference so the toggle reflects what they last
  // chose, even on a fresh browser or after the local cache was
  // cleared. Runs before the override below, so `hasStoredChoice()`
  // sees the freshly-synced value during Flarum's mount.
  syncFromServerPreference();
  resolveTheme();

  bindSystemListener();

  // Flarum's Application.mount() calls initColorScheme() → setColorScheme()
  // *after* initializers, which would clobber the data-theme we set above
  // with the server-side colorScheme preference. Override setColorScheme so
  // a local choice always wins; fall back to Flarum's behaviour otherwise.
  override(app, 'setColorScheme', function (original, scheme) {
    if (hasStoredChoice()) {
      resolveTheme();
      return;
    }
    return original(scheme);
  });

  extend(HeaderSecondary.prototype, 'items', function (items: ItemList<unknown>) {
    items.add('theme-toggle', ThemeToggle.component(), 25);
  });
});