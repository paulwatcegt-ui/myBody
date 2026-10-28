import {strToU8,strFromU8} from 'fflate';
import {withAutomaticBMI} from './calculations';
import {encodeArchive,decodeArchive} from './archive';
import {Photo,Pose,uid,csv} from './domain';
import {transact,storePhoto,removePhoto,restore} from './repository.web';
import {BACKUP_VERSION,MAX_ARCHIVE_BYTES,validateManifest} from './backupFormat';
import {chooseFile,offerFile,decodePhoto} from './browserFiles';
export async function capturePhoto(camera:boolean,pose:Pose,takenAt:string,note:string):Promise<boolean>{
 const input=await chooseFile('image/*',camera);if(!input)return false;if(input.size>12*1024*1024)throw new Error('单张照片请控制在 12 MB 以内');
 const image=await decodePhoto(input);const canvas=document.createElement('canvas');const scale=Math.min(1,2560/Math.max(image.naturalWidth,image.naturalHeight));canvas.width=Math.round(image.naturalWidth*scale);canvas.height=Math.round(image.naturalHeight*scale);const ctx=canvas.getContext('2d');if(!ctx)throw new Error('当前浏览器无法处理照片');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);
 const jpeg=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('照片转换失败')),'image/jpeg',.8));
 const id=uid();await storePhoto({id,uri:`idb:${id}`,pose,taken_at:takenAt,note},await jpeg.arrayBuffer());return true;
}
export async function deletePhoto(photo:Photo){await removePhoto(photo.id);}
export async function exportCsv(){const {snapshot}=await transact();offerFile('\uFEFF'+csv({...snapshot,readings:withAutomaticBMI(snapshot.readings,snapshot.profile)}),`myBody-${Date.now()}.csv`,'text/csv;charset=utf-8');}
export async function exportNotices(){offerFile(JSON.stringify(require('../../THIRD_PARTY_NOTICES.json'),null,2),'myBody-third-party-notices.json','application/json');}
export async function exportBackup(){
 const {snapshot,images}=await transact();const files:Record<string,Uint8Array>={};let total=0;
 const photos=snapshot.photos.map((p,i)=>{const bytes=images[p.id];if(!bytes)throw new Error('照片文件缺失，无法完成备份');total+=bytes.byteLength;if(total>MAX_ARCHIVE_BYTES-4*1024*1024)throw new Error('完整备份当前支持约 60 MB 照片');const uri=`photos/${i}.jpg`;files[uri]=new Uint8Array(bytes);return {...p,uri};});
 const manifest=validateManifest({app:'myBody',version:BACKUP_VERSION,exported_at:new Date().toISOString(),snapshot:{...snapshot,photos}});files['manifest.json']=strToU8(JSON.stringify(manifest));if(files['manifest.json'].length>16*1024*1024)throw new Error('记录清单超过 16 MB 上限');const bytes=encodeArchive(files);offerFile(bytes.slice().buffer,`myBody-backup-${Date.now()}.zip`,'application/zip');
}
export async function importBackup():Promise<boolean>{
 const input=await chooseFile('.zip,application/zip,application/octet-stream');if(!input)return false;if(input.size>MAX_ARCHIVE_BYTES+1024*1024)throw new Error('备份超过 64 MB 上限');
 const files=decodeArchive(new Uint8Array(await input.arrayBuffer()));const manifest=validateManifest(JSON.parse(strFromU8(files['manifest.json'])));const images:Record<string,ArrayBuffer>={};
 for(const p of manifest.snapshot.photos){const bytes=files[p.uri];if(!bytes?.length)throw new Error('备份照片不完整，原有数据未更改');const buffer=bytes.slice().buffer as ArrayBuffer;await decodePhoto(new Blob([buffer]));images[p.id]=buffer;p.uri=`idb:${p.id}`;}
 await restore(manifest.snapshot,images);return true;
}
