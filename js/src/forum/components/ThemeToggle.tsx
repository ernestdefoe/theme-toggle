import Component from 'flarum/common/Component';
import Dropdown from 'flarum/common/components/Dropdown';
import Button from 'flarum/common/components/Button';
import app from 'flarum/forum/app';

// `m` is a UMD global at runtime (provided by Mithril via Flarum's reg);
// @types/mithril supplies the ambient namespace, so no explicit import.
import { CHOICES, type Choice, readChoice, persistChoice, resolveTheme } from '../theme';

const ICONS: Record<Choice, string> = {
  'dark':     'fas fa-moon',
  'dark-hc':  'fas fa-moon',
  'light':    'fas fa-sun',
  'light-hc': 'fas fa-sun',
  'system':   'fas fa-circle-half-stroke',
};

// Translation keys can't contain hyphens cleanly; use underscores.
const TR_KEY = (c: Choice): string => c.replace(/-/g, '_');

export default class ThemeToggle extends Component {
  view() {
    const choice = readChoice();
    const tr = (key: string) =>
      app.translator.trans(`ernestdefoe-theme-toggle.forum.toggle.${key}`);

    return (
      <Dropdown
        buttonClassName={`Button Button--icon ThemeToggle ThemeToggle--${choice}`}
        menuClassName="Dropdown-menu ThemeToggle-menu"
        icon={ICONS[choice]}
        caretIcon={null}
        // `label` populates the button's <span.Button-labelText> so the
        // mobile slide-out drawer can render the toggle as a labeled row
        // ("[icon] Theme") next to the other menu items. The label is
        // hidden via CSS on the desktop secondary header where the
        // toggle should stay icon-only.
        label={tr('label')}
        accessibleToggleLabel={tr('label')}
        title={tr(`option_${TR_KEY(choice)}`)}
      >
        {CHOICES.map((c) => (
          <Button
            key={c}
            className="ThemeToggle-option"
            icon={c === choice ? 'fas fa-check' : ICONS[c]}
            active={c === choice}
            onclick={() => {
              persistChoice(c);
              resolveTheme();
              m.redraw();
            }}
          >
            {tr(`option_${TR_KEY(c)}`)}
          </Button>
        ))}
      </Dropdown>
    );
  }
}
