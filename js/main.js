import {startAmbientPixels} from './ambient-pixels.js';
import {t} from './i18n.js';
import {setupImageTool} from './image-tool.js';
import {Achievements} from './achievements.js';
import {setLanguage, getLanguage} from './i18n.js';
import {setupBackup} from './backup.js';
import {ColorManager} from './color-manager.js';
import {CanvasRenderer} from './canvas-renderer.js';
import {openStorage, loadRecord} from './storage.js';
import {Game} from './game.js';
import {CanvasNavigation} from './canvas-navigation.js';
import {ColorTooltip} from './tooltip.js';
import {Notifications} from './notifications.js';
import {Settings} from './settings.js';
import {Trophies} from './trophies.js';
const elements = {
  count: document.querySelector('#count'), percent: document.querySelector('#percent'),
  progress: document.querySelector('#progress-fill'), pause: document.querySelector('#pause'),
  status: document.querySelector('#status')
};
startAmbientPixels(document.querySelector('#ambient-colors'));
try {
  const db = await openStorage();
  const {bitmap, theme, language, achievements: savedAchievements} = await loadRecord(db);
  setLanguage(language);
  const manager = new ColorManager(bitmap);
  const renderer = new CanvasRenderer(document.querySelector('#fresco'));
  const settings = new Settings(document.querySelector('#theme-toggle'), renderer, theme);
  renderer.restore(bitmap);
  const navigation = new CanvasNavigation(document.querySelector('#viewport'), renderer.canvas, document.querySelector('#reset-view'), document.querySelector('#zoom-100'), document.querySelector('#zoom-200'), document.querySelector('#zoom-level'));
  const canvasPanel = document.querySelector('.canvas-panel');
  const fullscreenButton = document.querySelector('#toggle-fullscreen');
  fullscreenButton.addEventListener('click', async () => {
    try {
      if (document.fullscreenElement === canvasPanel) await document.exitFullscreen();
      else await canvasPanel.requestFullscreen();
    } catch (error) { console.error('Fullscreen unavailable:', error); }
  });
  document.addEventListener('fullscreenchange', () => {
    fullscreenButton.dataset.i18n = document.fullscreenElement === canvasPanel ? 'fullscreenExit' : 'fullscreenEnter';
    fullscreenButton.textContent = t(fullscreenButton.dataset.i18n);
    requestAnimationFrame(() => navigation.apply());
  });
  new ColorTooltip(document.querySelector('#viewport'), document.querySelector('#color-tooltip'), manager, navigation);
  const notifications = new Notifications(document.querySelector('#notifications'));
  const achievements = new Achievements(document.querySelector('#achievements-dialog'), manager, savedAchievements);
  new Trophies(document.querySelector('#trophies-dialog'), manager);
  const game = new Game(manager, renderer, db, elements, notifications, () => settings.theme, id => navigation.flash(id), achievements, getLanguage);
  settings.onChange = () => game.saveSettings();
  setupBackup(game, settings);
  setupImageTool(game, settings);
  document.querySelectorAll('[data-language]').forEach(button => button.addEventListener('click', () => {
    setLanguage(button.dataset.language); settings.apply(); game.updateUI();
    achievements.refresh(); document.querySelector('#language-menu').open=false; game.saveSettings();
  }));
  document.querySelector('#open-help').addEventListener('click', () => document.querySelector('#help-dialog').showModal());
  document.querySelector('#close-help').addEventListener('click', () => document.querySelector('#help-dialog').close());
  elements.pause.disabled = manager.remainingCount === 0;
  elements.pause.addEventListener('click', () => game.togglePause());
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') void game.flush(); });
  window.addEventListener('pagehide', () => { void game.flush(); });
  game.start();
} catch (error) {
  console.error(error);
  elements.status.textContent = `Initialisation impossible : ${error.message}`;
}
