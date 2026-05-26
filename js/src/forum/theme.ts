// `m` is a UMD global provided by Mithril at runtime (Flarum exposes it
// via flarum.reg). @types/mithril declares it as an ambient namespace,
// so we can use it without an explicit import — and avoid bundling
// Mithril twice with the Flarum core bundle.
import app from 'flarum/forum/app';

export const STORAGE_KEY = 'ernestdefoe-theme-toggle.choice';
// Stamp identifying which logged-in user wrote STORAGE_KEY. Used to
// (a) recognise on the next boot that the cached choice belongs to a
// previous logged-in session, so we can drop it when the actor is
// gone (logout) or different (account switch), and (b) leave a
// guest's own picks alone — guests never carry a stamp.
export const OWNER_KEY = 'ernestdefoe-theme-toggle.owner-id';

export const CHOICES = ['dark', 'dark-hc', 'light', 'light-hc', 'system'] as const;
export type Choice = (typeof CHOICES)[number];

// Flarum core stores the user's preference as one of `auto | light | dark |
// light-hc | dark-hc`. Our `system` choice maps to Flarum's `auto`; the
// others are identical.
function choiceToScheme(choice: Choice): string {
  return choice === 'system' ? 'auto' : choice;
}

function schemeToChoice(scheme: unknown): Choice | null {
  if (scheme === 'auto') return 'system';
  if (typeof scheme === 'string' && (CHOICES as readonly string[]).includes(scheme)) {
    return scheme as Choice;
  }
  return null;
}

function isChoice(v: unknown): v is Choice {
  return typeof v === 'string' && (CHOICES as readonly string[]).includes(v);
}

function lsGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch (e) {
    /* private mode */
    return null;
  }
}

function lsSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    /* ignore */
  }
}

function lsRemove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (e) {
    /* ignore */
  }
}

function storedChoice(): Choice | null {
  const v = lsGet(STORAGE_KEY);
  return isChoice(v) ? v : null;
}

function storedOwner(): string | null {
  return lsGet(OWNER_KEY);
}

/**
 * The user-id we expect to be signed in, read from the bootstrap
 * payload (`app.data.session.userId`). Available at module-load time,
 * before `app.session` itself is constructed — important because
 * Flarum's Application.boot() runs initializers BEFORE setting
 * `this.session`. Returns null for guests.
 */
function bootUserId(): string | null {
  try {
    const id = (app as unknown as { data?: { session?: { userId?: number | null } } }).data?.session?.userId;
    return id != null && id !== 0 ? String(id) : null;
  } catch (e) {
    return null;
  }
}

export function readChoice(): Choice {
  return storedChoice() ?? 'system';
}

/**
 * Does localStorage hold a choice we're allowed to apply right now?
 *
 * For a logged-in user: yes, when the stamp matches them (or the
 * cache is unstamped — happens for guests who just logged in).
 *
 * For a guest: only when the entry has NO owner stamp. A stamped
 * entry means a previous logged-in session wrote it; honouring it
 * would defeat the "logout reverts to admin default" guarantee.
 */
export function hasStoredChoice(): boolean {
  if (storedChoice() === null) return false;
  const stamp = storedOwner();
  const actorId = bootUserId();
  if (actorId === null) {
    // Guest: only honour unstamped (guest-authored) entries.
    return stamp === null;
  }
  // Logged in: honour the entry when it's ours or hasn't been stamped
  // yet (guest-to-login transition; stamp gets written on next sync).
  return stamp === null || stamp === actorId;
}

export function writeChoice(choice: Choice): void {
  lsSet(STORAGE_KEY, choice);
}

/**
 * Persist a user-initiated toggle change. Writes localStorage
 * immediately (so resolveTheme / pre-paint see it without a
 * round-trip) and, when a user is logged in, mirrors the choice to
 * their server-side `colorScheme` preference so it survives
 * logout/login and follows them across browsers and devices. Stamps
 * the cache with the actor's id so subsequent logouts / account
 * switches can drop it cleanly.
 */
export function persistChoice(choice: Choice): void {
  writeChoice(choice);

  const user = app.session?.user;
  if (!user) {
    // Guest pick — make sure no stale owner stamp lingers from a
    // previous session on this browser.
    lsRemove(OWNER_KEY);
    return;
  }

  lsSet(OWNER_KEY, String(user.id()));

  const scheme = choiceToScheme(choice);
  if (user.preferences()?.colorScheme === scheme) return;

  // Fire-and-forget. A network failure leaves the local choice in
  // place and the next toggle will retry; we deliberately don't
  // surface an alert for what is a low-stakes UI preference.
  user.savePreferences({ colorScheme: scheme }).catch(() => {
    /* ignore */
  });
}

/**
 * Reconcile localStorage with the live session. Called from
 * `app.beforeMount()` so that — critically — `app.session` IS set by
 * the time we run. (Flarum 2's Application.boot() runs initializers
 * BEFORE constructing `this.session`, so the same logic inside the
 * initializer would see `app.session === undefined` and silently
 * skip the sync; that was the original "button doesn't reflect
 * chosen mode after login" bug.)
 *
 * Three branches:
 *
 *  - **Logged-in actor matches the stamp** (or there's no stamp):
 *    pull the server-side `colorScheme` preference into localStorage
 *    as the cache for the next page's pre-paint, and stamp ownership.
 *
 *  - **Logged-in actor doesn't match the stamp** (account switch):
 *    drop the stale cache then sync from the new actor's preference.
 *
 *  - **No actor (guest), stamp present** (just logged out): clear
 *    both the cache and any data-theme our pre-paint applied, so
 *    Flarum's own setColorScheme can paint the admin's forum default.
 */
export function syncOnBoot(): void {
  const user = app.session?.user;

  if (!user) {
    if (storedOwner() !== null) {
      lsRemove(STORAGE_KEY);
      lsRemove(OWNER_KEY);
      document.documentElement.removeAttribute('data-theme');
    }
    return;
  }

  const actorId = String(user.id());
  const stamp = storedOwner();

  if (stamp !== null && stamp !== actorId) {
    lsRemove(STORAGE_KEY);
    lsRemove(OWNER_KEY);
  }

  const serverChoice = schemeToChoice(user.preferences()?.colorScheme);
  if (serverChoice) {
    writeChoice(serverChoice);
    lsSet(OWNER_KEY, actorId);
  } else if (storedChoice() !== null && storedOwner() === null) {
    // Guest carried a pick into login but server has no preference
    // yet — stamp the existing pick as theirs so a later logout
    // recognises it as a logged-in choice.
    lsSet(OWNER_KEY, actorId);
  }
}

function systemTheme(): string {
  const mm = window.matchMedia;
  const dark = !!mm && mm('(prefers-color-scheme: dark)').matches;
  // Flarum 2 ships `*-hc` variants that extend the regular palette via
  // `[data-theme^='light']` / `[data-theme^='dark']`, so honouring
  // `prefers-contrast: more` here gives a11y users HC for free.
  const hc = !!mm && mm('(prefers-contrast: more)').matches;
  return (dark ? 'dark' : 'light') + (hc ? '-hc' : '');
}

/**
 * Resolve the active theme from the user's saved choice and apply it
 * to <html data-theme="…">. When there's no choice we own, strip
 * data-theme entirely so Flarum's setColorScheme (called during
 * mount) can paint the admin's forum default.
 */
export function resolveTheme(): void {
  const root = document.documentElement;
  if (!hasStoredChoice()) {
    root.removeAttribute('data-theme');
    return;
  }
  const choice = readChoice();
  root.setAttribute('data-theme', choice === 'system' ? systemTheme() : choice);
}

/**
 * Called from the `setColorScheme` override in index.ts. The incoming
 * `scheme` is whatever Flarum (or any external caller) wants to apply.
 *
 * Two authoritative paths we want to honour live:
 *
 *  1. **Built-in Settings page Appearance picker.** It calls
 *     `user.savePreferences({colorScheme}).then(() => app.setColorScheme(mode.id))`
 *     (see vendor/flarum/core SettingsPage.tsx). Without acceptance,
 *     our `hasStoredChoice()` shortcut would keep applying the OLD
 *     cached value and the picker would require a refresh to land.
 *
 *  2. **Boot/mount when `allowUserColorScheme` is true.** Flarum's
 *     `initColorScheme()` calls `setColorScheme(user.preferences().colorScheme)`.
 *     Same shape as case (1) — we sync our cache so a brand-new
 *     browser with no prior cache writes the preference in for the
 *     next pre-paint.
 *
 * The trigger that distinguishes both from "admin-forced default" or
 * the watch-system-pref re-init is: **the incoming `scheme` matches
 * the user's current `colorScheme` preference**. When it doesn't, we
 * fall through to the existing cached-choice-wins behaviour so an
 * admin who forces a forum-wide theme doesn't get overridden by our
 * code (the actual user-vs-admin policy decision still belongs to
 * Flarum core's `allowUserColorScheme` gate).
 *
 * Returns true when the call was handled (override should return);
 * false when the override should fall through to the original
 * `setColorScheme`.
 */
export function acceptSchemeChange(scheme: unknown): boolean {
  const incoming = schemeToChoice(scheme);
  if (incoming === null) return false;

  const user = app.session?.user;
  const userPref = user ? schemeToChoice(user.preferences()?.colorScheme) : null;

  if (user && userPref !== null && incoming === userPref) {
    writeChoice(incoming);
    lsSet(OWNER_KEY, String(user.id()));
    resolveTheme();
    if (typeof m !== 'undefined') m.redraw();
    return true;
  }

  if (hasStoredChoice()) {
    resolveTheme();
    return true;
  }

  return false;
}

let mediaListenerBound = false;

export function bindSystemListener(): void {
  if (mediaListenerBound || !window.matchMedia) return;
  mediaListenerBound = true;

  const handler = (): void => {
    if (readChoice() === 'system') {
      resolveTheme();
      m.redraw();
    }
  };

  ['(prefers-color-scheme: dark)', '(prefers-contrast: more)'].forEach((q) => {
    const mq = window.matchMedia(q);
    if (mq.addEventListener) {
      mq.addEventListener('change', handler);
    } else if ((mq as MediaQueryList & { addListener?: (cb: () => void) => void }).addListener) {
      // Safari < 14 fallback.
      (mq as MediaQueryList & { addListener: (cb: () => void) => void }).addListener(handler);
    }
  });
}
