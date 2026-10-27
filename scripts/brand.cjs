// Original geometric myBody icon, generated from vector primitives; no external artwork.
const fs=require('node:fs'),zlib=require('node:zlib');
const table=Array.from({length:256},(_,n)=>{for(let k=0;k<8;k++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
function crc(b){let c=0xffffffff;for(const v of b)c=table[(c^v)&255]^(c>>>8);return(c^0xffffffff)>>>0;}
function chunk(name,data){const n=Buffer.from(name),len=Buffer.alloc(4),sum=Buffer.alloc(4);len.writeUInt32BE(data.length);sum.writeUInt32BE(crc(Buffer.concat([n,data])));return Buffer.concat([len,n,data,sum]);}
const W=1024,raw=Buffer.alloc((W*4+1)*W);
const segments=[[280,650,414,514],[414,514,520,620],[520,620,742,398]];
function distance(x,y,x1,y1,x2,y2){const t=Math.max(0,Math.min(1,((x-x1)*(x2-x1)+(y-y1)*(y2-y1))/((x2-x1)**2+(y2-y1)**2)));return Math.hypot(x-x1-t*(x2-x1),y-y1-t*(y2-y1));}
for(let y=0;y<W;y++)for(let x=0;x<W;x++){
 const p=y*(W*4+1)+1+x*4;
 let color=[22,135,114,255];
 if(Math.hypot(x-505,y-310)<66)color=[231,244,235,255];
 if(segments.some(a=>distance(x,y,...a)<32))color=[245,250,245,255];
 if(Math.hypot(x-742,y-398)<45)color=[238,187,106,255];
 raw.set(color,p);
}
const header=Buffer.alloc(13);header.writeUInt32BE(W);header.writeUInt32BE(W,4);header[8]=8;header[9]=6;
const png=Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',zlib.deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]);
for(const name of ['icon.png','adaptive-icon.png','splash-icon.png','favicon.png'])fs.writeFileSync(`assets/${name}`,png);
