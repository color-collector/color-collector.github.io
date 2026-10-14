import {TOTAL, BITMAP_BYTES} from './color-map.js';

export class ColorManager {
  constructor(bitmap = new Uint8Array(BITMAP_BYTES)) {
    if (!(bitmap instanceof Uint8Array) || bitmap.length !== BITMAP_BYTES) throw new Error('Bitmap invalide');
    this.bitmap = bitmap;
    this.remaining = new Uint32Array(TOTAL);
    this.count = 0;
    let length = 0;
    for (let id = 0; id < TOTAL; id++) {
      if (this.has(id)) this.count++;
      else this.remaining[length++] = id;
    }
    this.remainingCount = length;
  }
  has(id) { return (this.bitmap[id >>> 3] & (1 << (id & 7))) !== 0; }
  randomIndex(max) {
    const limit = Math.floor(4294967296 / max) * max;
    const sample = new Uint32Array(1);
    do { crypto.getRandomValues(sample); } while (sample[0] >= limit);
    return sample[0] % max;
  }
  acquire() {
    if (!this.remainingCount) return null;
    const index = this.randomIndex(this.remainingCount);
    const id = this.remaining[index];
    this.remaining[index] = this.remaining[--this.remainingCount];
    this.bitmap[id >>> 3] |= 1 << (id & 7);
    this.count++;
    return id;
  }
}
