export const STORAGE_KEY = 'ernestdefoe-theme-toggle.choice';
const VALID = ['dark', 'light', 'system'];

export function readChoice() {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (VALID.includes(v)) return v;
  } catch (e) { /* private mode */ }
  return 'system';
}

export function writeChoice(choice) {
  try { localStorage.setItem(STORAGE_KEY, choice); } catch (e) { /* ignore */ }
}

export function nextChoice(choice) {
  const i = VALID.indexOf(choice);
  return VALID[(i + 1) % VALID.length];
}

/**
 * Resolve the active theme from the user's saved choice and apply it
 * to <html data-theme="…">. For 'system', mirror the OS preference;
 * if no choice is saved we leave whatever Flarum's Appearance →
 * Color Scheme picker put there.
 */
export function resolveTheme() {
  const root = document.documentElement;
  const choice = readChoice();
  let saved = null;
  try { saved = localStorage.getItem(STORAGE_KEY); } catch (e) { /* ignore */ }

  if (!saved) return;

  if (choice === 'system') {
    const prefersDark =
      window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
  } else {
    root.setAttribute('data-theme', choice);
  }
}

let mediaListenerBound = false;

export function bindSystemListener() {
  if (mediaListenerBound || !window.matchMedia) return;
  mediaListenerBound = true;
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  const handler = () => {
    if (readChoice() === 'system') {
      resolveTheme();
      if (typeof m !== 'undefined' && m.redraw) m.redraw();
    }
  };
  if (mq.addEventListener) mq.addEventListener('change', handler);
  else if (mq.addListener) mq.addListener(handler);
}
