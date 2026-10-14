import fr from '../lang/fr.js';
import en from '../lang/en.js';
import es from '../lang/es.js';
import pt from '../lang/pt.js';
const languages = {fr, en, es, pt};
let language = 'fr';
export const getLanguage = () => language;
export const t = (key, vars = {}) => {
  const template = languages[language][key] ?? languages.fr[key] ?? key;
  return template.replace(/\{(\w+)\}/g, (_, name) => String(vars[name] ?? ''));
};
export function achievementName(d) { return t(d.type === 'palindrome' ? 'palindromeTitle' : d.type === 'color' ? d.titleKey : `${d.type}Title${d.target}`, {n:d.target}); }
export function achievementDescription(d) { return t(d.type === 'palindrome' ? 'palindromeDescription' : d.type === 'color' ? 'colorDescription' : `${d.type}Description${d.target}`, {n:d.target,hex:d.hex}); }
export function setLanguage(value) {
  language = Object.hasOwn(languages, value) ? value : 'fr';
  document.documentElement.lang = language;
  document.querySelectorAll('[data-i18n]').forEach(el => el.textContent = t(el.dataset.i18n));
  document.querySelector('#language-label').textContent = ({fr:'🇫🇷 Français',en:'🇬🇧 English',es:'🇪🇸 Español',pt:'🇵🇹 Português'})[language];
  document.querySelector('.header p').textContent = t('tagline');
  document.querySelector('#theme-toggle').textContent = t(document.documentElement.dataset.theme === 'dark' ? 'themeLight' : 'themeDark');
}
