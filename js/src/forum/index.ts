import app from 'flarum/forum/app';
import { extend } from 'flarum/common/extend';
import HeaderSecondary from 'flarum/forum/components/HeaderSecondary';
import type ItemList from 'flarum/common/utils/ItemList';

import ThemeToggle from './components/ThemeToggle';
import { resolveTheme, bindSystemListener } from './theme';

/*
 * Apply the user's saved choice as early as possible so the page does
 * not flash the wrong theme during boot. We run this at module
 * evaluation time (before the initializer fires) because Flarum has
 * already inserted <html data-theme="…"> server-side from the Color
 * Scheme picker — we only overwrite when the user has explicitly
 * toggled.
 */
resolveTheme();

app.initializers.add('ernestdefoe-theme-toggle', () => {
  // Re-apply after Flarum core's own boot logic has run. Core sets
  // <html data-theme="…"> from the user's `colorScheme` preference
  // during initialization, which would otherwise clobber the choice we
  // just applied at module-load time — making the page revert to the
  // server-side default on every refresh.
  resolveTheme();
  bindSystemListener();

  extend(HeaderSecondary.prototype, 'items', function (items: ItemList<unknown>) {
    items.add('theme-toggle', ThemeToggle.component(), 25);
  });
});
