import {BITMAP_BYTES} from './color-map.js';
const DB_NAME = 'color-collector';
const DB_VERSION = 1;
const FORMAT_VERSION = 1;
function requestResult(request) { return new Promise((resolve, reject) => { request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); }); }
export async function openStorage() {
  const request = indexedDB.open(DB_NAME, DB_VERSION);
  request.onupgradeneeded = () => { request.result.createObjectStore('save'); };
  return requestResult(request);
}
export async function loadRecord(db) {
  const record = await requestResult(db.transaction('save', 'readonly').objectStore('save').get('main'));
  if (!record) return {bitmap: new Uint8Array(BITMAP_BYTES), theme: 'dark', language: 'fr', achievements: []};
  if (record.version !== FORMAT_VERSION || !(record.bitmap instanceof ArrayBuffer) || record.bitmap.byteLength !== BITMAP_BYTES) throw new Error('Sauvegarde incompatible ou corrompue');
  return {bitmap: new Uint8Array(record.bitmap), theme: record.theme === 'light' ? 'light' : 'dark', language: ['fr','en','es','pt'].includes(record.language) ? record.language : 'fr', achievements: Array.isArray(record.achievements) ? record.achievements : []};
}
export async function saveBitmap(db, bitmap, theme = 'dark', language = 'fr', achievements = []) {
  const buffer = bitmap.slice().buffer;
  const tx = db.transaction('save', 'readwrite');
  tx.objectStore('save').put({version: FORMAT_VERSION, bitmap: buffer, theme, language, achievements: [...achievements]}, 'main');
  return new Promise((resolve, reject) => { tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error); });
}
