import {Metric,Reading,Photo,Profile,Snapshot,PRESETS,validateReading,isTextReading} from './domain';
import {validateMetric} from './validation';
import {validateProfile} from './calculations';
export {validateMetric} from './validation';
type Stored = {snapshot:Snapshot; images:Record<string,ArrayBuffer>};
let connection:IDBDatabase|undefined;
let opening:Promise<IDBDatabase>|undefined;
const urls=new Map<string,{bytes:ArrayBuffer;url:string}>();
async function database():Promise<IDBDatabase>{
 if(connection)return connection;
 if(!opening)opening=new Promise<IDBDatabase>((resolve,reject)=>{
  const request=indexedDB.open('mybody-pwa',1);
  request.onupgradeneeded=()=>request.result.createObjectStore('data');
  request.onerror=()=>reject(new Error('无法打开本机存储，请退出隐私浏览或释放空间后重试。'));
  request.onblocked=()=>reject(new Error('请关闭其他 myBody 页面后重新加载。'));
  request.onsuccess=()=>{connection=request.result;connection.onversionchange=()=>{connection?.close();connection=undefined;opening=undefined;};resolve(connection);};
 }).catch(e=>{opening=undefined;throw e;});
 return opening;
}
const fresh=():Stored=>({snapshot:{metrics:structuredClone(PRESETS),readings:[],photos:[],profile:{name:'',height:'',birthday:''}},images:{}});
// Read and mutate synchronously inside one IDB transaction. Resolve only on commit.
export async function transact(change?:(value:Stored)=>void):Promise<Stored>{
 const db=await database();
 return new Promise((resolve,reject)=>{
  const tx=db.transaction('data',change?'readwrite':'readonly'),store=tx.objectStore('data');let value:Stored;let failure:unknown;
  const request=store.get('current');
  request.onsuccess=()=>{try{value=request.result;if(!value){if(!change)throw new Error('本机数据尚未初始化');value=fresh();}if(change){change(value);store.put(value,'current');}}catch(e){failure=e;tx.abort();}};
  tx.oncomplete=()=>resolve(value);
  tx.onabort=()=>reject(failure??new Error(tx.error?.name==='QuotaExceededError'?'本机空间不足，数据未保存，请先导出备份。':'存储操作失败，原有数据未更改。'));
  tx.onerror=()=>{};
 });
}
export async function initialize(){await transact(v=>{for(const m of PRESETS)if(!v.snapshot.metrics.some(x=>x.id===m.id))v.snapshot.metrics.push(structuredClone(m));});}
export async function readSnapshot():Promise<Snapshot>{
 const {snapshot,images}=await transact();
 for(const [id,item]of urls)if(!snapshot.photos.some(p=>p.id===id)){URL.revokeObjectURL(item.url);urls.delete(id);}
 snapshot.photos=snapshot.photos.map(p=>{const bytes=images[p.id];if(!bytes)throw new Error('照片数据缺失，请从完整备份恢复。');let item=urls.get(p.id);if(item){URL.revokeObjectURL(item.url);}item={bytes,url:URL.createObjectURL(new Blob([bytes],{type:'image/jpeg'}))};urls.set(p.id,item);return {...p,uri:item.url};});
 snapshot.metrics.sort((a,b)=>a.sort_order-b.sort_order||a.id.localeCompare(b.id));
 snapshot.readings.sort((a,b)=>a.measured_at.localeCompare(b.measured_at)||a.id.localeCompare(b.id));
 snapshot.photos.sort((a,b)=>b.taken_at.localeCompare(a.taken_at)||a.id.localeCompare(b.id));return snapshot;
}
export async function saveBatch(rows:Reading[]){
 if(!rows.length)throw new Error('请至少填写一项指标');rows.forEach(validateReading);
 await transact(v=>{for(const r of rows){if(r.derived_from)throw new Error('自动计算的指标请修改来源记录');const m=v.snapshot.metrics.find(m=>m.id===r.metric_id);if(!m)throw new Error('指标已不存在，请重新选择');if((m.value_type==='text')!==isTextReading(r))throw new Error('记录内容与指标类型不一致');const i=v.snapshot.readings.findIndex(x=>x.id===r.id);if(i<0)v.snapshot.readings.push(r);else v.snapshot.readings[i]=r;}});
}
export async function removeReading(id:string){await transact(v=>{v.snapshot.readings=v.snapshot.readings.filter(r=>r.id!==id);});}
export async function saveMetric(m:Metric){validateMetric(m);await transact(v=>{const i=v.snapshot.metrics.findIndex(x=>x.id===m.id),old=v.snapshot.metrics[i];if(old&&(old.value_type??'number')!==(m.value_type??'number')&&v.snapshot.readings.some(r=>r.metric_id===m.id))throw new Error('已有记录的指标不能切换数值／文本类型，请新建指标');if(i<0)v.snapshot.metrics.push(m);else v.snapshot.metrics[i]=m;});}
export async function moveFavorite(id:string,direction:-1|1){await transact(v=>{const all=v.snapshot.metrics.filter(m=>m.favorite&&m.active).sort((a,b)=>a.sort_order-b.sort_order||a.id.localeCompare(b.id));const i=all.findIndex(m=>m.id===id),n=i+direction;if(i<0||n<0||n>=all.length)return;[all[i],all[n]]=[all[n],all[i]];all.forEach((m,i)=>m.sort_order=i);});}
export async function saveProfile(profile:Profile){validateProfile(profile);await transact(v=>{v.snapshot.profile=profile;});}
export async function saveThemePreference(theme:NonNullable<Profile['theme']>){await transact(v=>{const p={...v.snapshot.profile,theme};validateProfile(p);v.snapshot.profile=p;});}
export async function storePhoto(photo:Photo,bytes:ArrayBuffer){await transact(v=>{v.snapshot.photos.push({...photo,uri:`idb:${photo.id}`});v.images[photo.id]=bytes;});}
export async function removePhoto(id:string){await transact(v=>{v.snapshot.photos=v.snapshot.photos.filter(p=>p.id!==id);delete v.images[id];});}
export async function restore(snapshot:Snapshot,images:Record<string,ArrayBuffer>){await transact(v=>{v.snapshot=snapshot;v.images=images;for(const m of PRESETS)if(!snapshot.metrics.some(x=>x.id===m.id))snapshot.metrics.push(structuredClone(m));});}
