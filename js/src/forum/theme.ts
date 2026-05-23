// `m` is a UMD global provided by Mithril at runtime (Flarum exposes it
// via flarum.reg). @types/mithril declares it as an ambient namespace,
// so we can use it without an explicit import — and avoid bundling
// Mithril twice with the Flarum core bundle.
import app from 'flarum/forum/app';

export const STORAGE_KEY = 'ernestdefoe-theme-toggle.choice';

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

export function readChoice(): Choice {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (isChoice(v)) return v;
  } catch (e) {
    /* private mode */
  }
  return 'system';
}

export function hasStoredChoice(): boolean {
  try {
    return isChoice(localStorage.getItem(STORAGE_KEY));
  } catch (e) {
    return false;
  }
}

export function writeChoice(choice: Choice): void {
  try {
    localStorage.setItem(STORAGE_KEY, choice);
  } catch (e) {
    /* ignore */
  }
}

/**
 * Persist a user-initiated toggle change. Writes localStorage immediately
 * (so resolveTheme / pre-paint see it without a round-trip) and, when a
 * user is logged in, mirrors the choice to their server-side
 * `colorScheme` preference so it survives logout/login and follows them
 * across browsers and devices.
 */
export function persistChoice(choice: Choice): void {
  writeChoice(choice);

  const user = app.session?.user;
  if (!user) return;

  const scheme = choiceToScheme(choice);
  if (user.preferences()?.colorScheme === scheme) return;

  // Fire-and-forget. A network failure leaves the local choice in place
  // and the next toggle will retry; we deliberately don't surface an
  // alert for what is a low-stakes UI preference.
  user.savePreferences({ colorScheme: scheme }).catch(() => {
    /* ignore */
  });
}

/**
 * On boot, when a user is logged in, take their server-side
 * `colorScheme` preference as the source of truth and write it into
 * localStorage. Without this, a user who picks a theme on one browser
 * (or after clearing site data) would see the toggle UI stuck on
 * whatever stale value localStorage held, even though their saved
 * preference says otherwise.
 */
export function syncFromServerPreference(): void {
  const user = app.session?.user;
  if (!user) return;

  const serverChoice = schemeToChoice(user.preferences()?.colorScheme);
  if (!serverChoice) return;

  if (readChoice() !== serverChoice || !hasStoredChoice()) {
    writeChoice(serverChoice);
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
 * to <html data-theme="…">. If no choice is saved we leave whatever
 * Flarum's Appearance → Color Scheme picker put there.
 */
export function resolveTheme(): void {
  const root = document.documentElement;
  let saved: string | null = null;
  try {
    saved = localStorage.getItem(STORAGE_KEY);
  } catch (e) {
    /* ignore */
  }
  if (!saved) return;

  const choice = readChoice();
  root.setAttribute('data-theme', choice === 'system' ? systemTheme() : choice);
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
