import {t} from './i18n.js';
import {colorHex} from './color-map.js';
export class ColorTooltip {
  constructor(viewport, tooltip, manager, navigation) {
    this.viewport=viewport;this.tooltip=tooltip;this.manager=manager;this.navigation=navigation;
    viewport.addEventListener('pointermove', e => {
      if (e.pointerType==='touch' || navigation.pointers.size) { this.hide();return; }
      this.show(e);
    });
    viewport.addEventListener('pointerleave',()=>this.hide());
    viewport.addEventListener('pointerdown',e=>{if(e.pointerType==='touch') this.hide();});
    viewport.addEventListener('pointerup',e=>{if(e.pointerType==='touch'&&!navigation.dragged)this.show(e);});
  }
  show(e) {
    const p=this.navigation.point(e),id=this.navigation.colorAt(p.x,p.y);
    if(id===null){this.hide();return;}
    const acquired=this.manager.has(id),hex=colorHex(id);
    this.tooltip.querySelector('.tooltip-swatch').style.background=acquired?hex:'#555b69';
    const code=this.tooltip.querySelector('.tooltip-code');code.textContent=hex;code.classList.toggle('unknown',!acquired);
    this.tooltip.querySelector('.tooltip-state').textContent=t(acquired?'tooltipObtained':'tooltipUnknown');
    this.tooltip.hidden=false;
    const rect=this.tooltip.getBoundingClientRect();
    this.tooltip.style.left=`${Math.max(8,Math.min(window.innerWidth-rect.width-8,e.clientX+16))}px`;
    this.tooltip.style.top=`${Math.max(8,Math.min(window.innerHeight-rect.height-8,e.clientY+16))}px`;
  }
  hide(){this.tooltip.hidden=true;}
}
