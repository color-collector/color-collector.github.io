import {t, getLanguage} from './i18n.js';
import {BITMAP_BYTES, TOTAL} from './color-map.js';
import {saveBitmap} from './storage.js';
const HEADER_SIZE = 16, DIGEST_SIZE = 32, FILE_SIZE = HEADER_SIZE + BITMAP_BYTES + DIGEST_SIZE;
const VERSION2_SIZE = FILE_SIZE + 4096;
const POPCOUNT = new Uint8Array(256);
for (let i = 1; i < 256; i++) POPCOUNT[i] = POPCOUNT[i >>> 1] + (i & 1);
function countBits(bitmap) { let count = 0; for (const value of bitmap) count += POPCOUNT[value]; return count; }
function sameBytes(a,b) { return a.length === b.length && a.every((value,i) => value === b[i]); }
async function digest(data) { return new Uint8Array(await crypto.subtle.digest('SHA-256', data)); }
export async function exportSave(bitmap, theme, count, language = 'fr', achievements = []) {
  const bytes = new Uint8Array(VERSION2_SIZE), view = new DataView(bytes.buffer);
  bytes.set([67,67,79,76],0); view.setUint16(4,2,true); bytes[6] = theme === 'light' ? 1 : 0;
  view.setUint32(8,count,true); bytes.set(bitmap,HEADER_SIZE);
  const extra = new TextEncoder().encode(JSON.stringify({language,achievements:[...achievements]}));
  if(extra.length>4096)throw new Error('Trop de succès pour le format de sauvegarde');
  bytes.set(extra,HEADER_SIZE+BITMAP_BYTES);
  bytes.set(await digest(bytes.subarray(0,VERSION2_SIZE-DIGEST_SIZE)),VERSION2_SIZE-DIGEST_SIZE);
  const url = URL.createObjectURL(new Blob([bytes],{type:'application/octet-stream'}));
  const link = document.createElement('a'); link.href = url; link.download = `color-collector-${new Date().toISOString().slice(0,10)}.ccol`;
  document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url),60000);
}
export async function parseSave(file) {
  if (file.size !== FILE_SIZE && file.size !== VERSION2_SIZE) throw new Error('Taille du fichier incorrecte.');
  const bytes = new Uint8Array(await file.arrayBuffer()), view = new DataView(bytes.buffer);
  if (!sameBytes(bytes.subarray(0,4),new Uint8Array([67,67,79,76]))) throw new Error('Signature de sauvegarde invalide.');
  const version=view.getUint16(4,true);
  if (version !== (file.size===FILE_SIZE?1:2)) throw new Error('Version de sauvegarde non prise en charge.');
  if (bytes[6] > 1 || bytes[7] !== 0 || view.getUint32(12,true) !== 0) throw new Error('En-tête invalide.');
  const expected = await digest(bytes.subarray(0,bytes.length-DIGEST_SIZE));
  if (!sameBytes(expected,bytes.subarray(bytes.length-DIGEST_SIZE))) throw new Error('Intégrité du fichier non vérifiée.');
  const count = view.getUint32(8,true), bitmap = bytes.slice(HEADER_SIZE,HEADER_SIZE+BITMAP_BYTES);
  if (count > TOTAL || countBits(bitmap) !== count) throw new Error('Compteur de couleurs incohérent.');
  let language='fr',achievements=[];
  if(version===2){
    const extra=bytes.subarray(HEADER_SIZE+BITMAP_BYTES,bytes.length-DIGEST_SIZE);
    const end=extra.indexOf(0);const data=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(end<0?extra:extra.subarray(0,end)));
    if(!data || !['fr','en','es','pt'].includes(data.language) || !Array.isArray(data.achievements) || data.achievements.some(x=>typeof x!=='string'||!/^[-a-zA-Z0-9]{1,80}$/.test(x)) || new Set(data.achievements).size!==data.achievements.length)throw new Error('Données de succès invalides');
    if(end<0 || extra.subarray(end).some(value=>value!==0))throw new Error('Données additionnelles invalides');
    language=data.language;achievements=data.achievements;
  }
  return {bitmap,theme:bytes[6] === 1 ? 'light' : 'dark',count,language,achievements};
}
export function setupBackup(game, settings) {
  const message = document.querySelector('#backup-message');
  const input = document.querySelector('#import-file');
  const report = error => { console.error(error); message.textContent = error.message || String(error); };
  document.querySelector('#export-save').addEventListener('click',async () => {
    try { await game.flush(); await exportSave(game.manager.bitmap,settings.theme,game.manager.count,game.getLanguage(),game.achievements.unlocked); message.textContent = getLanguage()==='fr'?'Sauvegarde exportée.':'Save exported.'; }
    catch(error) { report(error); }
  });
  document.querySelector('#import-save').addEventListener('click',() => input.click());
  input.addEventListener('change',async () => {
    const file = input.files?.[0]; input.value = ''; if (!file) return;
    try {
      const data = await parseSave(file);
      if (!confirm(getLanguage()==='fr'?`Remplacer votre progression par ${data.count.toLocaleString('fr-FR')} couleurs obtenues ?`:`Replace your progress with ${data.count.toLocaleString('en-US')} collected colors?`)) return;
      game.stop(); await game.waitForSave();
      await saveBitmap(game.db,data.bitmap,data.theme,data.language,data.achievements); location.reload();
    } catch(error) { report(error); if (!game.timer && game.manager.remainingCount && !game.paused) game.start(); }
  });
  document.querySelector('#reset-save').addEventListener('click',async () => {
    if (!confirm(getLanguage()==='fr'?'Réinitialiser toutes les couleurs obtenues ? Cette action est irréversible.':'Reset all collected colors? This cannot be undone.')) return;
    if (!confirm(getLanguage()==='fr'?'Dernière confirmation : supprimer la progression et recommencer ?':'Final confirmation: delete your progress and start over?')) return;
    try {
      game.stop(); await game.waitForSave();
      await saveBitmap(game.db,new Uint8Array(BITMAP_BYTES),settings.theme,game.getLanguage(),[]); location.reload();
    } catch(error) { report(error); if (!game.timer && game.manager.remainingCount && !game.paused) game.start(); }
  });
}
