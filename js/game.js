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
    this.lastTick = null;
    this.elapsedMs = 0;
    this.catchUpTimer = null;
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
  // Count elapsed time only while this page is alive and acquisition is active.
  // A throttled background timer does not discard the seconds it missed.
  accountTime() {
    const now = performance.now();
    if (this.lastTick !== null && !this.paused && !this.imageOpen && this.timer !== null) {
      this.elapsedMs += Math.max(0, now - this.lastTick);
    }
    this.lastTick = now;
  }
  tick() {
    if (this.timer === null) return;
    this.accountTime();
    if (this.paused || this.imageOpen || this.manager.count === TOTAL) return;

    // Process large catch-ups in chunks to keep the interface responsive.
    const draws = Math.min(Math.floor(this.elapsedMs / 1000), 500);
    if (!draws) return;
    let lastId = null;
    const newAchievements = [];
    for (let i = 0; i < draws; i++) {
      const id = this.manager.acquire();
      if (id === null) break;
      this.elapsedMs -= 1000;
      lastId = id;
      newAchievements.push(...this.achievements.acquire(id));
      this.renderer.drawColor(id);
    }
    if (lastId !== null) {
      for (const achievement of newAchievements) this.notifications.showAchievement(achievement);
      // One visual notification and sparkle per batch, not hundreds at once.
      this.flash(lastId);
      this.notifications.show(lastId);
      this.dirty = true;
      this.updateUI();
      void this.flush();
    }
    if (this.manager.count === TOTAL) { this.stop(); return; }
    if (this.elapsedMs >= 1000 && this.catchUpTimer === null) {
      this.catchUpTimer = setTimeout(() => {
        this.catchUpTimer = null;
        this.tick();
      }, 0);
    }
  }
  start() {
    if (this.manager.count === TOTAL || this.timer !== null) return;
    this.lastTick = performance.now();
    this.elapsedMs = 0;
    this.timer = setInterval(() => this.tick(), 1000);
    this.updateUI();
  }
  stop() {
    if (this.timer !== null) clearInterval(this.timer);
    if (this.catchUpTimer !== null) clearTimeout(this.catchUpTimer);
    this.timer = null;
    this.catchUpTimer = null;
    this.lastTick = null;
    this.elapsedMs = 0;
  }
  togglePause() {
    this.accountTime();
    this.paused = !this.paused;
    if (!this.paused) this.tick();
    this.updateUI();
  }
  setImageOpen(open) {
    this.accountTime();
    this.imageOpen = open;
    if (!open) this.tick();
  }
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
