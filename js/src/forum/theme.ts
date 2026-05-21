// `m` is a UMD global provided by Mithril at runtime (Flarum exposes it
// via flarum.reg). @types/mithril declares it as an ambient namespace,
// so we can use it without an explicit import — and avoid bundling
// Mithril twice with the Flarum core bundle.
export const STORAGE_KEY = 'ernestdefoe-theme-toggle.choice';

export const CHOICES = ['dark', 'dark-hc', 'light', 'light-hc', 'system'] as const;
export type Choice = (typeof CHOICES)[number];

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

export function writeChoice(choice: Choice): void {
  try {
    localStorage.setItem(STORAGE_KEY, choice);
  } catch (e) {
    /* ignore */
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
