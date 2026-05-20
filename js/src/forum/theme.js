export const STORAGE_KEY = 'ernestdefoe-theme-toggle.choice';

export const CHOICES = ['dark', 'dark-hc', 'light', 'light-hc', 'system'];

export function readChoice() {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (CHOICES.includes(v)) return v;
  } catch (e) { /* private mode */ }
  return 'system';
}

export function writeChoice(choice) {
  try { localStorage.setItem(STORAGE_KEY, choice); } catch (e) { /* ignore */ }
}

function systemTheme() {
  const mm = window.matchMedia;
  const dark = mm && mm('(prefers-color-scheme: dark)').matches;
  // Flarum 2 ships `*-hc` variants that extend the regular palette via
  // `[data-theme^='light']` / `[data-theme^='dark']`, so honouring
  // `prefers-contrast: more` here gives a11y users HC for free.
  const hc = mm && mm('(prefers-contrast: more)').matches;
  return (dark ? 'dark' : 'light') + (hc ? '-hc' : '');
}

/**
 * Resolve the active theme from the user's saved choice and apply it
 * to <html data-theme="…">. If no choice is saved we leave whatever
 * Flarum's Appearance → Color Scheme picker put there.
 */
export function resolveTheme() {
  const root = document.documentElement;
  let saved = null;
  try { saved = localStorage.getItem(STORAGE_KEY); } catch (e) { /* ignore */ }
  if (!saved) return;

  const choice = readChoice();
  root.setAttribute('data-theme', choice === 'system' ? systemTheme() : choice);
}

let mediaListenerBound = false;

export function bindSystemListener() {
  if (mediaListenerBound || !window.matchMedia) return;
  mediaListenerBound = true;

  const handler = () => {
    if (readChoice() === 'system') {
      resolveTheme();
      if (typeof m !== 'undefined' && m.redraw) m.redraw();
    }
  };

  ['(prefers-color-scheme: dark)', '(prefers-contrast: more)'].forEach((q) => {
    const mq = window.matchMedia(q);
    if (mq.addEventListener) mq.addEventListener('change', handler);
    else if (mq.addListener) mq.addListener(handler);
  });
}
