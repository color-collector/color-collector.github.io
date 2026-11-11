import {SIDE, colorPosition, colorIdAt} from './color-map.js';
import {achievementName, achievementDescription} from './i18n.js';
export const DEFINITIONS = [
  ...[256,2048,8192,65536,100000,999999].map(n => ({id:`milestone-${n}`,type:'milestone',target:n})),
  ...Array.from({length:9}, (_,i) => ({id:`group-${i+2}`, type:'group', target:i+2})),
  ...[2,3,4].map(n => ({id:`touch-${n}`,type:'touch',target:n})),
  {id:'palindrome-hex',type:'palindrome'},
  ...[['000000','colorTitleBlack'],['FFFFFF','colorTitleWhite'],['ABCDEF','colorTitleABCDEF'],['012345','colorTitle012345'],['777777','colorTitle777777']].map(([hex,titleKey]) => ({id:`color-${hex}`,type:'color',hex:'#'+hex,titleKey}))
];
export class Achievements {
  constructor(dialog, manager, saved = []) {
    this.dialog=dialog; this.manager=manager;
    this.unlocked=new Set(saved.filter(id => DEFINITIONS.some(d => d.id===id)));
    this.grid=dialog.querySelector('#achievement-grid');
    for (const d of DEFINITIONS) if (d.type === 'milestone' && manager.count >= d.target) this.unlocked.add(d.id);
    document.querySelector('#open-achievements').addEventListener('click',()=>{this.refresh();dialog.showModal();});
    dialog.querySelector('.close-dialog').addEventListener('click',()=>dialog.close());
  }
  neighbors(id) {
    const {x,y}=colorPosition(id),out=[];
    if(x>0)out.push(colorIdAt(x-1,y));if(x<SIDE-1)out.push(colorIdAt(x+1,y));
    if(y>0)out.push(colorIdAt(x,y-1));if(y<SIDE-1)out.push(colorIdAt(x,y+1));
    return out;
  }
  acquire(id) {
    const touching=this.neighbors(id).filter(n=>this.manager.has(n));
    const changed=[];
    const unlock=key=>{if(!this.unlocked.has(key)){this.unlocked.add(key);changed.push(key);}};
    const colorAchievement = DEFINITIONS.find(d => d.type === 'color' && Number.parseInt(d.hex.slice(1),16) === id);
    if (colorAchievement) unlock(colorAchievement.id);
    const hex = id.toString(16).padStart(6, '0');
    if (hex === [...hex].reverse().join('')) unlock('palindrome-hex');
    for (const d of DEFINITIONS) if (d.type === 'milestone' && this.manager.count >= d.target) unlock(d.id);
    if(touching.length>=2)for(let n=2;n<=touching.length;n++)unlock(`touch-${n}`);
    // Limited BFS: once 10 pixels are found, larger components cannot unlock a new group achievement.
    const visited=new Set([id]),queue=[id];
    for(let i=0;i<queue.length && queue.length<11;i++) {
      for(const n of this.neighbors(queue[i])) {
        if(!visited.has(n)&&this.manager.has(n)){visited.add(n);queue.push(n);if(queue.length>=11)break;}
      }
    }
    // All group thresholds reached by this connected component are unlocked.
    if(queue.length>=2 && queue.length<=10)unlock(`group-${queue.length}`);
    return changed.map(key => DEFINITIONS.find(d => d.id === key));
  }
  // Rebuild spatial achievements against the current color-to-pixel mapping.
  // Only add missing achievements: existing unlocks are permanent.
  async reconcileSpatial() {
    const newlyUnlocked = [];
    const unlock = id => {
      if (!this.unlocked.has(id)) {
        this.unlocked.add(id);
        newlyUnlocked.push(DEFINITIONS.find(d => d.id === id));
      }
    };
    const targets = [...DEFINITIONS.filter(d => d.type === 'group' || d.type === 'touch')];
    if (targets.every(d => this.unlocked.has(d.id))) return newlyUnlocked;

    // A component with N pixels implies that all group sizes 2..min(N,10)
    // have been reached at some point in the collection history.
    // Use a capped flood-fill; large components never need a full traversal.
    const seen = new Uint8Array(this.manager.bitmap.length * 8 >>> 3);
    const visited = id => (seen[id >>> 3] & (1 << (id & 7))) !== 0;
    const mark = id => { seen[id >>> 3] |= 1 << (id & 7); };
    let processed = 0;
    for (let id = 0; id < this.manager.bitmap.length * 8; id++) {
      if (!this.manager.has(id)) continue;
      const adjacent = this.neighbors(id).filter(n => this.manager.has(n));
      for (let n = 2; n <= adjacent.length; n++) unlock(`touch-${n}`);
      if (!visited(id)) {
        const queue = [id];
        mark(id);
        for (let cursor = 0; cursor < queue.length && queue.length < 10; cursor++) {
          for (const neighbor of this.neighbors(queue[cursor])) {
            if (this.manager.has(neighbor) && !visited(neighbor)) {
              mark(neighbor);
              queue.push(neighbor);
              if (queue.length >= 10) break;
            }
          }
        }
        for (let n = 2; n <= Math.min(queue.length, 10); n++) unlock(`group-${n}`);
      }
      if (++processed % 50000 === 0) {
        if (targets.every(d => this.unlocked.has(d.id))) break;
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }
    return newlyUnlocked;
  }
  refresh() {
    this.grid.replaceChildren();
    for(const d of DEFINITIONS) {
      const item=document.createElement('div');item.className='achievement-item';
      const unlocked=this.unlocked.has(d.id);
      const title=document.createElement('strong'); title.textContent=achievementName(d);
      item.append(title);
      if (unlocked) {
        const description=document.createElement('span'); description.textContent=achievementDescription(d);
        item.append(description);
      }
      item.classList.toggle('unlocked',unlocked);this.grid.append(item);
    }
    this.dialog.querySelector('#achievement-count').textContent=`${this.unlocked.size} / ${DEFINITIONS.length}`;
  }
}
