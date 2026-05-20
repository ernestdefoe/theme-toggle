import Component from 'flarum/common/Component';
import Icon from 'flarum/common/components/Icon';
import app from 'flarum/forum/app';
import {
  STORAGE_KEY,
  readChoice,
  writeChoice,
  resolveTheme,
  nextChoice,
} from '../theme';

const ICONS = {
  dark:   'fas fa-moon',
  light:  'fas fa-sun',
  system: 'fas fa-circle-half-stroke',
};

export default class ThemeToggle extends Component {
  view() {
    const choice = readChoice();
    const tr = (key) =>
      app.translator.trans(`ernestdefoe-theme-toggle.forum.toggle.${key}`);

    return (
      <button
        type="button"
        className="Button Button--icon ThemeToggle"
        title={tr(`title_${choice}`)}
        aria-label={tr(`title_${choice}`)}
        onclick={() => {
          const next = nextChoice(choice);
          writeChoice(next);
          resolveTheme();
          m.redraw();
        }}
      >
        <Icon name={ICONS[choice]} className="Button-icon" />
      </button>
    );
  }
}
