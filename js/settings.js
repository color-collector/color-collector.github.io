import {t} from './i18n.js';
export class Settings {
  constructor(button, renderer, theme = 'dark') {
    this.button = button; this.renderer = renderer;
    this.theme = theme === 'light' ? 'light' : 'dark';
    this.apply();
    button.addEventListener('click', () => {
      this.theme = this.theme === 'dark' ? 'light' : 'dark';
      this.apply();
      this.onChange?.(this.theme);
    });
  }
  apply() {
    document.documentElement.dataset.theme = this.theme;
    this.renderer.setTheme(this.theme);
    const logo = document.querySelector('#brand-logo');
    if (logo) {
      const file = this.theme === 'dark' ? 'logo.png' : 'logo-alt.png';
      const url = new URL(`../${file}`, import.meta.url).href;
      if (logo.src !== url) logo.src = url;
    }
    this.button.textContent = window.ccTranslate?.(this.theme === 'dark' ? 'themeLight' : 'themeDark') ?? (t(this.theme === 'dark' ? 'themeLight' : 'themeDark'));
    this.button.setAttribute('aria-label', this.button.textContent);
  }
}
