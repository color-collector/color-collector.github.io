import {SIDE, TOTAL, colorPosition} from './color-map.js';
export class CanvasRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', {alpha: false});
    if (!this.ctx) throw new Error('Canvas 2D indisponible');
    this.ctx.imageSmoothingEnabled = false;
    this.theme = 'dark';
    this.bitmap = null;
    this.clear();
  }
  clear() {
    this.ctx.fillStyle = this.theme === 'dark' ? '#000000' : '#FFFFFF';
    this.ctx.fillRect(0, 0, SIDE, SIDE);
  }
  setTheme(theme) {
    if (this.theme === theme) return;
    this.theme = theme;
    this.clear();
    if (this.bitmap) this.restore(this.bitmap);
  }
  drawColor(id) {
    const {x, y} = colorPosition(id);
    this.ctx.fillStyle = `#${id.toString(16).padStart(6, '0')}`;
    this.ctx.fillRect(x, y, 1, 1);
  }
  restore(bitmap) {
    this.bitmap = bitmap;
    for (let byte = 0; byte < bitmap.length; byte++) {
      let bits = bitmap[byte];
      if (!bits) continue;
      for (let bit = 0; bit < 8; bit++) if (bits & (1 << bit)) {
        const id = (byte << 3) + bit;
        if (id < TOTAL) this.drawColor(id);
      }
    }
  }
}
