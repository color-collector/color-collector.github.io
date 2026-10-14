import {TOTAL} from './color-map.js';
import {t} from './i18n.js';
import {saveBitmap} from './storage.js';
export class Game {
  constructor(manager, renderer, db, elements, notifications, getTheme, flash, achievements, getLanguage) {
    this.notifications = notifications; this.achievements = achievements; this.getLanguage = getLanguage;
    this.flash = flash;
    this.getTheme = getTheme;
    this.manager = manager;
    this.renderer = renderer;
    this.db = db;
    this.elements = elements;
    this.paused = false;
    this.imageOpen = false;
    this.timer = null;
    this.dirty = false;
    this.saving = false;
    this.updateUI();
  }
  updateUI() {
    this.elements.count.textContent = this.manager.count.toLocaleString(this.getLanguage() === 'en' ? 'en-US' : 'fr-FR');
    this.elements.percent.textContent = `${(this.manager.count / TOTAL * 100).toFixed(2).replace('.', this.getLanguage() === 'fr' ? ',' : '.')} %`;
    this.elements.progress.style.width = `${this.manager.count / TOTAL * 100}%`;
    this.elements.pause.textContent = t(this.paused ? 'resume' : 'pause');
    this.elements.status.textContent = this.manager.count === TOTAL ? t('complete') : ''; 
  }
  tick() {
    if (this.paused || this.imageOpen) return;
    const id = this.manager.acquire();
    if (id === null) { this.stop(); this.updateUI(); return; }
    const unlocked = this.achievements.acquire(id);
    for (const achievement of unlocked) this.notifications.showAchievement(achievement);
    this.renderer.drawColor(id);
    this.flash(id);
    this.notifications.show(id);
    this.dirty = true;
    this.updateUI();
    if (this.manager.count === TOTAL) this.stop();
    void this.flush();
  }
  start() { if (this.manager.count === TOTAL) return; this.timer = setInterval(() => this.tick(), 1000); this.updateUI(); }
  stop() { if (this.timer !== null) clearInterval(this.timer); this.timer = null; }
  togglePause() { this.paused = !this.paused; this.updateUI(); }
  saveSettings() { this.dirty = true; void this.flush(); }
  async waitForSave() {
    while (this.saving) await new Promise(resolve => setTimeout(resolve, 20));
  }
  async flush() {
    if (this.saving || !this.dirty) return;
    this.saving = true;
    try {
      while (this.dirty) {
        this.dirty = false;
        await saveBitmap(this.db, this.manager.bitmap, this.getTheme(), this.getLanguage(), this.achievements.unlocked);
      }
    } catch (error) {
      this.dirty = true;
      this.elements.status.textContent = 'Erreur de sauvegarde';
      console.error(error);
    } finally { this.saving = false; }
  }
}
