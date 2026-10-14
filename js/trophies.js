import {getLanguage} from './i18n.js';
import {CSS_COLORS} from '../data/css-colors.js';
export class Trophies {
  constructor(dialog, manager) {
    this.dialog = dialog; this.manager = manager;
    this.count = dialog.querySelector('#trophy-count');
    this.percent = dialog.querySelector('#trophy-percent');
    this.grid = dialog.querySelector('#trophy-grid');
    this.entries = CSS_COLORS.map(([name, hex]) => {
      const id = Number.parseInt(hex.slice(1), 16);
      const item = document.createElement('div'); item.className = 'trophy';
      const swatch = document.createElement('span'); swatch.className = 'trophy-swatch';
      const text = document.createElement('span'); text.className = 'trophy-text';
      item.append(swatch, text); this.grid.append(item);
      return {id, name, hex, item, swatch, text, revealed: null};
    });
    document.querySelector('#open-trophies').addEventListener('click', () => { this.refresh(); this.dialog.showModal(); });
    dialog.querySelector('.close-dialog').addEventListener('click', () => dialog.close());
  }
  refresh() {
    let found = 0;
    for (const entry of this.entries) {
      const acquired = this.manager.has(entry.id);
      if (acquired) found++;
      if (entry.revealed === acquired) continue;
      entry.revealed = acquired;
      entry.item.classList.toggle('unlocked', acquired);
      entry.swatch.style.background = acquired ? entry.hex : '';
      entry.swatch.textContent = acquired ? '' : '?';
      entry.text.replaceChildren();
      if (acquired) {
        const name = document.createElement('strong'); name.textContent = entry.name;
        const hex = document.createElement('small'); hex.textContent = entry.hex;
        entry.text.append(name, hex);
        entry.item.setAttribute('aria-label', `${entry.name} ${entry.hex}`);
      } else {
        entry.item.setAttribute('aria-label', 'Trophée non obtenu');
      }
    }
    this.count.textContent = `${found} / ${this.entries.length}`;
    this.percent.textContent = `${(found / this.entries.length * 100).toFixed(2).replace('.',getLanguage()==='fr'?',':'.')} %`;
  }
}
