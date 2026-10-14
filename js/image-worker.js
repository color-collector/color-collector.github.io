const TOTAL=1<<24;
let bitmap, palette, tree, left, right, axis;
function has(id){return (bitmap[id>>>3]&(1<<(id&7)))!==0;}
function coord(id,k){return k===0?id>>>16:k===1?(id>>>8)&255:id&255;}
function build(lo,hi,depth){
  if(lo>=hi)return -1;
  const k=depth%3,mid=(lo+hi)>>>1;
  // Median via in-place quickselect; avoids sorting/copying every subtree.
  let a=lo,b=hi-1;
  while(a<b){
    const pivot=coord(palette[(a+b)>>>1],k);let i=a,j=b;
    while(i<=j){while(coord(palette[i],k)<pivot)i++;while(coord(palette[j],k)>pivot)j--;if(i<=j){const v=palette[i];palette[i]=palette[j];palette[j]=v;i++;j--;}}
    if(mid<=j)b=j;else if(mid>=i)a=i;else break;
  }
  axis[mid]=k;left[mid]=build(lo,mid,depth+1);right[mid]=build(mid+1,hi,depth+1);
  return mid;
}
let root=-1;
function nearest(id){
  const r=id>>>16,g=(id>>>8)&255,b=id&255;
  let best=-1,dist=Infinity;
  function visit(node){
    if(node<0)return;
    const c=palette[node],dr=r-(c>>>16),dg=g-((c>>>8)&255),db=b-(c&255),d=dr*dr+dg*dg+db*db;
    if(d<dist){dist=d;best=c;if(d===0)return;}
    const delta=axis[node]===0?dr:axis[node]===1?dg:db;
    visit(delta<=0?left[node]:right[node]);
    if(delta*delta<dist)visit(delta<=0?right[node]:left[node]);
  }
  visit(root);return best;
}
self.onmessage=async e=>{
  try{
    const {bytes,width,height,mode,mask,background}=e.data;
    bitmap=new Uint8Array(mask);
    const data=new Uint8ClampedArray(bytes);
    if(mode==='nearest'){
      let count=0;for(let i=0;i<bitmap.length;i++){let x=bitmap[i];while(x){count++;x&=x-1;}}
      if(!count)throw new Error('NO_COLORS');
      palette=new Uint32Array(count);let n=0;
      for(let id=0;id<TOTAL;id++)if(has(id))palette[n++]=id;
      left=new Int32Array(count);right=new Int32Array(count);axis=new Uint8Array(count);
      root=build(0,count,0);
    }
    const cache=new Map(),bg=background==='dark'?0:255;
    for(let i=0;i<data.length;i+=4){
      const a=data[i+3];
      if(a===0)continue;
      const id=(data[i]<<16)|(data[i+1]<<8)|data[i+2];
      let result;
      if(mode==='strict')result=has(id)?id:-1;
      else {result=cache.get(id);if(result===undefined){result=nearest(id);if(cache.size<250000)cache.set(id,result);}}
      if(result<0){data[i]=bg;data[i+1]=bg;data[i+2]=bg;}
      else {data[i]=result>>>16;data[i+1]=(result>>>8)&255;data[i+2]=result&255;}
      // Preserve alpha channel.
      if(i%(4*50000)===0)await new Promise(resolve=>setTimeout(resolve,0));
    }
    self.postMessage({bytes:data.buffer,width,height},[data.buffer]);
  }catch(error){self.postMessage({error:error.message});}
};
