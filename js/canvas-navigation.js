import {SIDE} from './color-map.js';
export class CanvasNavigation {
  constructor(viewport, canvas, resetButton, fullButton, zoom200Button, zoomLabel) {
    this.viewport = viewport; this.canvas = canvas; this.scale = 1; this.x = 0; this.y = 0;
    this.zoomLabel = zoomLabel; this.indicators = [...viewport.querySelectorAll('.pan-edge')]; this.flashes = new Set();
    fullButton.addEventListener('click', () => this.zoomToPercent(100));
    zoom200Button.addEventListener('click', () => this.zoomToPercent(200));
    this.pointers = new Map(); this.dragged = false; this.pinch = null;
    this.apply();
    viewport.addEventListener('wheel', e => { e.preventDefault(); const p = this.point(e); this.zoom(Math.exp(-e.deltaY * .0015), p.x, p.y); }, {passive:false});
    viewport.addEventListener('pointerdown', e => this.down(e));
    viewport.addEventListener('pointermove', e => this.move(e));
    for (const event of ['pointerup','pointercancel','lostpointercapture']) viewport.addEventListener(event, e => this.up(e));
    viewport.addEventListener('dblclick', e => { const p = this.point(e); this.zoom(2, p.x, p.y); });
    resetButton.addEventListener('click', () => this.reset());
    new ResizeObserver(() => this.apply()).observe(viewport);
  }
  point(e) { const r = this.viewport.getBoundingClientRect(); return {x:e.clientX-r.left,y:e.clientY-r.top}; }
  bounds() { return {w:this.viewport.clientWidth,h:this.viewport.clientHeight}; }
  apply() {
    const {w,h} = this.bounds(); const size = Math.min(w,h);
    this.base = size / SIDE;
    const drawn = size * this.scale;
    const clamp = (offset, available) => drawn <= available ? (available-drawn)/2 : Math.max(available-drawn,Math.min(0,offset));
    this.x = clamp(this.x,w); this.y = clamp(this.y,h);
    this.canvas.style.width = `${drawn}px`; this.canvas.style.height = `${drawn}px`;
    this.canvas.style.transform = `translate3d(${this.x}px,${this.y}px,0)`;
    this.zoomLabel.textContent = `${Math.round(this.base * this.scale * 100)} %`;
    this.zoomLabel.setAttribute('aria-label', `Zoom actuel : ${Math.round(this.base * this.scale * 100)} pour cent`);
    const epsilon = 1;
    const canPan = {
      left: this.x < -epsilon, right: this.x + drawn > w + epsilon,
      top: this.y < -epsilon, bottom: this.y + drawn > h + epsilon
    };
    for (const indicator of this.indicators) indicator.hidden = !canPan[indicator.dataset.edge];
    for (const flash of this.flashes) this.placeFlash(flash);
  }
  zoom(factor,px,py) {
    const old = this.scale; this.scale = Math.min(256,Math.max(1,old*factor));
    const ratio = this.scale/old; this.x = px-(px-this.x)*ratio; this.y = py-(py-this.y)*ratio; this.apply();
  }
  reset() { this.scale=1;this.x=0;this.y=0;this.apply(); }
  zoomToPercent(percent) { const {w,h}=this.bounds(); this.zoom((percent/100/this.base)/this.scale,w/2,h/2); }
  placeFlash(flash) {
    const unit = this.base * this.scale;
    const x = flash.id % SIDE, y = Math.floor(flash.id / SIDE);
    flash.element.style.left = `${this.x + (x + .5) * unit}px`;
    flash.element.style.top = `${this.y + (y + .5) * unit}px`;
    const {w,h} = this.bounds();
    flash.element.hidden = this.x + (x+.5)*unit < 0 || this.x + (x+.5)*unit > w || this.y + (y+.5)*unit < 0 || this.y + (y+.5)*unit > h;
  }
  flash(id) {
    const element = document.createElement('span'); element.className = 'pixel-flash';
    element.setAttribute('aria-hidden', 'true');
    const flash = {id,element}; this.flashes.add(flash);
    this.viewport.append(element); this.placeFlash(flash);
    element.addEventListener('animationend', () => { element.remove(); this.flashes.delete(flash); }, {once:true});
  }
  colorAt(px,py) {
    const unit=this.base*this.scale; const x=Math.floor((px-this.x)/unit),y=Math.floor((py-this.y)/unit);
    return x>=0&&y>=0&&x<SIDE&&y<SIDE ? (y*SIDE+x) : null;
  }
  down(e) {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    this.viewport.setPointerCapture(e.pointerId); this.pointers.set(e.pointerId,this.point(e)); this.dragged=false;
    if (this.pointers.size===2) this.pinch=this.pinchInfo();
  }
  pinchInfo() {
    const [a,b]=[...this.pointers.values()];
    return {distance:Math.hypot(a.x-b.x,a.y-b.y),x:(a.x+b.x)/2,y:(a.y+b.y)/2};
  }
  move(e) {
    if (!this.pointers.has(e.pointerId)) return;
    const old=this.pointers.get(e.pointerId), now=this.point(e); this.pointers.set(e.pointerId,now);
    if (this.pointers.size===2) {
      const next=this.pinchInfo();
      if (this.pinch && this.pinch.distance>0) {
        this.x+=next.x-this.pinch.x;this.y+=next.y-this.pinch.y;
        this.zoom(next.distance/this.pinch.distance,next.x,next.y);
      }
      this.pinch=next;this.dragged=true;
    } else {
      if (Math.abs(now.x-old.x)+Math.abs(now.y-old.y)>0) {
        this.x+=now.x-old.x;this.y+=now.y-old.y;this.apply();this.dragged=true;
      }
    }
  }
  up(e) { this.pointers.delete(e.pointerId);this.pinch=null; }
}
