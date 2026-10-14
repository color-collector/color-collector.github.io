import {t, achievementName, achievementDescription} from './i18n.js';
import {colorHex} from './color-map.js';
import {CSS_COLORS_BY_ID} from '../data/css-colors.js';
const STANDARD_DURATION = 3000;
const EXIT_DURATION = 280;
export class Notifications {
  constructor(container) { this.container = container; this.standard = container.querySelector('#standard-notifications'); this.persistent = container.querySelector('#persistent-notifications'); }
  positions(stack) {
    return new Map([...stack.children].map(el => [el, el.getBoundingClientRect().top]));
  }
  shift(stack, previous) {
    for (const element of stack.children) {
      if (!previous.has(element)) continue;
      const delta = previous.get(element) - element.getBoundingClientRect().top;
      if (Math.abs(delta) > .5) element.animate(
        [{transform:`translateY(${delta}px)`}, {transform:'translateY(0)'}],
        {duration:360, easing:'ease-out'}
      );
    }
  }
  insert(stack, item, standard = false) {
    const previous = this.positions(stack);
    stack.append(item);
    if (standard) {
      while (stack.children.length > 3) stack.firstElementChild.remove();
    }
    this.shift(stack, previous);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (item.isConnected) item.classList.add('visible');
    }));
  }
  show(id) {
    const hex = colorHex(id), aliases = CSS_COLORS_BY_ID.get(id);
    const item = document.createElement('div'); item.className = 'color-toast';
    if (aliases) item.classList.add('named');
    const swatch = document.createElement('span'); swatch.className = 'toast-swatch'; swatch.style.background = hex;
    const label = document.createElement('span'); label.className = 'toast-label';
    if (aliases) {
      const name = document.createElement('strong'); name.textContent = aliases.join(' · ');
      const code = document.createElement('small'); code.textContent = hex;
      label.append(name, code);
    } else label.textContent = hex;
    item.append(swatch, label);
    if (aliases) {
      const close = document.createElement('button');
      close.type = 'button'; close.className = 'toast-close'; close.textContent = '×';
      close.setAttribute('aria-label', t('specialClose'));
      close.addEventListener('click', () => this.dismiss(item));
      item.append(close);
    }
    this.insert(aliases ? this.persistent : this.standard, item, !aliases);
    if (!aliases) setTimeout(() => this.dismiss(item), STANDARD_DURATION - EXIT_DURATION);
  }
  showAchievement(definition) {
    const item = document.createElement('div'); item.className = 'color-toast achievement-toast';
    const symbol = document.createElement('span'); symbol.className = 'achievement-toast-symbol'; symbol.textContent = '★';
    const label = document.createElement('span'); label.className = 'toast-label';
    const heading = document.createElement('strong'); heading.textContent = `${t('achievementNotice')} · ${achievementName(definition)}`;
    const description = document.createElement('small'); description.textContent = achievementDescription(definition);
    label.append(heading, description);
    const close = document.createElement('button'); close.type = 'button'; close.className = 'toast-close';
    close.textContent = '×'; close.setAttribute('aria-label', t('achievementClose'));
    close.addEventListener('click', () => this.dismiss(item));
    item.append(symbol, label, close); this.insert(this.persistent, item);
  }
  limitVisible() {
    while (this.standard.children.length > 3) this.standard.firstElementChild.remove();
  }
  dismiss(item) {
    if (!item.isConnected || item.classList.contains('closing')) return;
    item.classList.add('closing'); item.classList.remove('visible');
    setTimeout(() => {
      if (!item.isConnected) return;
      const stack = item.parentElement;
      const previous = this.positions(stack);
      item.remove();
      this.shift(stack, previous);
    }, EXIT_DURATION);
  }
}
