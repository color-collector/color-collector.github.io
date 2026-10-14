import {t} from './i18n.js';
const MAX_PIXELS=5000000,MAX_BYTES=10*1024*1024;
export function setupImageTool(game,settings){
  const dialog=document.querySelector('#image-dialog');
  const input=document.querySelector('#image-file');
  const mode=document.querySelector('#image-mode');
  const button=document.querySelector('#image-process');
  const download=document.querySelector('#image-download');
  const canvas=document.querySelector('#image-output');
  const message=document.querySelector('#image-message');
  let worker=null,active=false;
  document.querySelector('#open-image').addEventListener('click',()=>{game.imageOpen=true;dialog.showModal();});
  function close(){if(worker){worker.terminate();worker=null;}active=false;game.imageOpen=false;dialog.close();}
  document.querySelector('#close-image').addEventListener('click',close);
  dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
  dialog.addEventListener('close',()=>{if(game.imageOpen)close();});
  input.addEventListener('change',()=>{download.disabled=true;message.textContent='';});
  mode.addEventListener('change',()=>{download.disabled=true;});
  button.addEventListener('click',async()=>{
    if(active)return;
    const file=input.files?.[0];if(!file){message.textContent=t('imageEmpty');return;}
    if(file.size>MAX_BYTES){message.textContent=t('imageLimits');return;}
    active=true;button.disabled=true;download.disabled=true;message.textContent=t('imageProcessing');
    let bitmap=null;
    try{
      const image=await createImageBitmap(file);
      try{
        if(image.width*image.height>MAX_PIXELS||!image.width||!image.height)throw new Error(t('imageLimits'));
        const source=document.createElement('canvas');source.width=image.width;source.height=image.height;
        const ctx=source.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0);
        const pixels=ctx.getImageData(0,0,image.width,image.height);
        bitmap=game.manager.bitmap.slice().buffer;
        worker=new Worker(new URL('./image-worker.js',import.meta.url),{type:'module'});
        const result=await new Promise((resolve,reject)=>{
          worker.onmessage=e=>e.data.error?reject(new Error(e.data.error)):resolve(e.data);
          worker.onerror=e=>reject(new Error(e.message));
          worker.postMessage({bytes:pixels.data.buffer,mask:bitmap,width:image.width,height:image.height,mode:mode.value,background:settings.theme},[pixels.data.buffer,bitmap]);
        });
        if(!dialog.open)return;
        canvas.width=result.width;canvas.height=result.height;
        canvas.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(result.bytes),result.width,result.height),0,0);
        download.disabled=false;message.textContent=t('imageReady');
      }finally{image.close();}
    }catch(error){message.textContent=error.message==='NO_COLORS'?t('imageNoColors'):error.message||t('imageError');console.error(error);}
    finally{worker?.terminate();worker=null;active=false;button.disabled=false;}
  });
  download.addEventListener('click',()=>canvas.toBlob(blob=>{
    if(!blob)return;
    const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='color-collector-image.png';a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);
  },'image/png'));
}
