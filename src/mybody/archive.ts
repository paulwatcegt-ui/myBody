import {zipSync,unzipSync,strToU8,strFromU8} from 'fflate';
import {MAX_ARCHIVE_BYTES} from './backupFormat';
const table=Array.from({length:256},(_,n)=>{for(let k=0;k<8;k++)n=n&1?0xEDB88320^(n>>>1):n>>>1;return n>>>0;});
function checksum(bytes:Uint8Array):string {let crc=0xFFFFFFFF;for(const b of bytes)crc=table[(crc^b)&255]^(crc>>>8);return ((crc^0xFFFFFFFF)>>>0).toString(16).padStart(8,'0');}
export function encodeArchive(files:Record<string,Uint8Array>):Uint8Array {
 const integrity=Object.fromEntries(Object.entries(files).map(([name,bytes])=>[name,checksum(bytes)]));
 const entries={...files,'integrity.json':strToU8(JSON.stringify(integrity))};
 if(Object.values(entries).reduce((sum,bytes)=>sum+bytes.length,0)>MAX_ARCHIVE_BYTES)throw new Error('备份内容超过 64 MB 上限');
 return zipSync(entries,{level:0});
}
export function decodeArchive(bytes:Uint8Array):Record<string,Uint8Array> {
 if(bytes.length>MAX_ARCHIVE_BYTES+1024*1024)throw new Error('备份超过 64 MB 上限');
 let total=0,invalid=false;const seen=new Set<string>();
 let files:Record<string,Uint8Array>;
 try {
  files=unzipSync(bytes,{filter:entry=>{
   total+=entry.originalSize;const allowed=['manifest.json','integrity.json'].includes(entry.name)||/^photos\/[a-zA-Z0-9_-]+\.jpg$/.test(entry.name);
   if(!allowed||seen.has(entry.name)||seen.size>2002||total>MAX_ARCHIVE_BYTES){invalid=true;return false;}
   seen.add(entry.name);return true;
  }});
 }catch{throw new Error('ZIP 备份损坏，原有数据未更改');}
 if(invalid||!files['manifest.json']||!files['integrity.json']||files['manifest.json'].length>16*1024*1024||files['integrity.json'].length>256*1024)throw new Error('备份文件内容无效或过大');
 let integrity:unknown;try{integrity=JSON.parse(strFromU8(files['integrity.json']));}catch{throw new Error('备份校验信息损坏');}
 if(!integrity||typeof integrity!=='object'||Array.isArray(integrity))throw new Error('备份校验信息无效');
 const expected=integrity as Record<string,unknown>;
 const names=Object.keys(files).filter(n=>n!=='integrity.json');
 if(Object.keys(expected).length!==names.length||names.some(name=>expected[name]!==checksum(files[name])))throw new Error('备份完整性校验失败，原有数据未更改');
 return files;
}
