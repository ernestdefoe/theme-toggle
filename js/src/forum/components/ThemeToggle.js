import Component from 'flarum/common/Component';
import Dropdown from 'flarum/common/components/Dropdown';
import Button from 'flarum/common/components/Button';
import app from 'flarum/forum/app';
import {
  CHOICES,
  readChoice,
  writeChoice,
  resolveTheme,
} from '../theme';

const ICONS = {
  'dark':     'fas fa-moon',
  'dark-hc':  'fas fa-moon',
  'light':    'fas fa-sun',
  'light-hc': 'fas fa-sun',
  'system':   'fas fa-circle-half-stroke',
};

// Translation keys can't contain hyphens cleanly; use underscores.
const TR_KEY = (c) => c.replace(/-/g, '_');

export default class ThemeToggle extends Component {
  view() {
    const choice = readChoice();
    const tr = (key) =>
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
              writeChoice(c);
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
