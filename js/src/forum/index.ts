import app from 'flarum/forum/app';
import { extend, override } from 'flarum/common/extend';
import HeaderSecondary from 'flarum/forum/components/HeaderSecondary';
import type ItemList from 'flarum/common/utils/ItemList';

import ThemeToggle from './components/ThemeToggle';
import { resolveTheme, bindSystemListener, hasStoredChoice, syncOnBoot } from './theme';

// Pre-paint: avoid a flash before Flarum's own boot runs. Reads
// localStorage only — at this stage app.session is undefined; we use
// app.data.session.userId (the bootstrap payload) to decide whether
// a previously-stamped cache should be honoured (see hasStoredChoice).
resolveTheme();

app.initializers.add('ernestdefoe-theme-toggle', () => {
  bindSystemListener();

  // CRITICAL: Flarum 2's Application.boot() runs initializers BEFORE
  // setting `this.session`. Anything that needs `app.session.user`
  // (pulling the server-side colorScheme preference, stamping the
  // cache with the actor's id, clearing a stamped cache on logout)
  // MUST run inside beforeMount — runs after session is set but
  // before the first render, so the toggle's first view() call sees
  // the synced state.
  app.beforeMount(() => {
    syncOnBoot();
    resolveTheme();
  });

  // Flarum's Application.mount() calls initColorScheme() → setColorScheme()
  // *after* initializers, which would clobber the data-theme we set above
  // with the server-side colorScheme preference. Override setColorScheme so
  // a local choice always wins; fall back to Flarum's behaviour otherwise
  // (Flarum's path will apply the admin's forum default — the desired
  // behaviour for a freshly-logged-out actor).
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
