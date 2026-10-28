export function chooseFile(accept:string,camera=false):Promise<File|null>{
 return new Promise(resolve=>{const input=document.createElement('input');input.type='file';input.accept=accept;if(camera)input.setAttribute('capture','environment');input.style.display='none';document.body.append(input);const finish=(f:File|null)=>{input.remove();resolve(f);};input.onchange=()=>finish(input.files?.[0]??null);input.addEventListener('cancel',()=>finish(null),{once:true});input.click();});
}
export function offerFile(bytes:BlobPart,name:string,type:string){
 const file=new File([bytes],name,{type});const url=URL.createObjectURL(file);
 const layer=document.createElement('div');layer.setAttribute('role','dialog');layer.setAttribute('aria-label','保存导出文件');layer.style.cssText='position:fixed;inset:0;background:#0009;z-index:2147483647;display:grid;place-items:center;padding:24px;color:#18251c;font:16px system-ui';
 const box=document.createElement('div');box.style.cssText='background:#fff;border-radius:18px;padding:24px;max-width:420px;display:grid;gap:18px;overflow-wrap:anywhere';
 const text=document.createElement('p');text.textContent=`文件已准备：${name}。请选择保存方式，并确认文件已保存到“文件”或其他外部位置。`;
 const link=document.createElement('a');link.textContent='下载文件';link.href=url;link.download=name;link.style.cssText='color:#217A35;padding:12px';
 const close=document.createElement('button');close.textContent='关闭';close.onclick=()=>{layer.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);};
 box.append(text);if(navigator.canShare?.({files:[file]})){const share=document.createElement('button');share.textContent='保存／分享';share.onclick=async()=>{try{await navigator.share({files:[file]});}catch(e){if((e as Error).name!=='AbortError')text.textContent='分享未完成，请重试或下载文件。';}};box.append(share);}box.append(link,close);layer.append(box);document.body.append(layer);close.focus();
}
export async function decodePhoto(bytes:Blob):Promise<HTMLImageElement>{
 const url=URL.createObjectURL(bytes);try{return await new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>image.naturalWidth&&image.naturalHeight?resolve(image):reject(new Error('照片无效'));image.onerror=()=>reject(new Error('无法读取照片，请使用 JPEG 或 PNG 格式。'));image.src=url;});}finally{URL.revokeObjectURL(url);}
}
