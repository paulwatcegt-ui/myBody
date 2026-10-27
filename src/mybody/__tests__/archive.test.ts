import {zipSync,strToU8,strFromU8} from 'fflate';
import {encodeArchive,decodeArchive} from '../archive';
test('ZIP round-trip retains binary photos and Unicode manifest',()=>{
 const files={'manifest.json':strToU8('{"备注":"早晨"}'),'photos/0.jpg':new Uint8Array([255,216,255,0,1,2])};
 const decoded=decodeArchive(encodeArchive(files));expect(decoded['photos/0.jpg']).toEqual(files['photos/0.jpg']);expect(strFromU8(decoded['manifest.json'])).toContain('早晨');
});
test('truncated archives and archives without integrity information fail',()=>{
 expect(()=>decodeArchive(new Uint8Array([1,2,3]))).toThrow();expect(()=>decodeArchive(zipSync({'manifest.json':strToU8('{}')}))).toThrow();
});
test('silent corruption of stored photo bytes is caught before restore',()=>{
 const files={'manifest.json':strToU8('{}'),'photos/0.jpg':new Uint8Array([255,216,255,13,23,43,67,87])};
 const archive=encodeArchive(files);let changed=false;
 for(let i=0;i<archive.length-8;i++){if(archive.slice(i,i+8).every((v,j)=>v===files['photos/0.jpg'][j])){archive[i+6]^=1;changed=true;break;}}
 expect(changed).toBe(true);expect(()=>decodeArchive(archive)).toThrow(/校验/);
});
test('path traversal and compressed oversized entries are rejected',()=>{
 expect(()=>decodeArchive(zipSync({'../escape.jpg':strToU8('bad'),'manifest.json':strToU8('{}')}))).toThrow();
 const small=zipSync({'manifest.json':strToU8('{}')}); // Corrupted central-directory sizes must not trigger unchecked extraction.
 const altered=small.slice();for(let i=0;i<altered.length-28;i++){if(altered[i]===0x50&&altered[i+1]===0x4b&&altered[i+2]===1&&altered[i+3]===2){altered.fill(255,i+24,i+28);break;}}
 expect(()=>decodeArchive(altered)).toThrow();
});
