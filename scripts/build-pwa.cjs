const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
async function main(){
const root=path.resolve(__dirname,'..');process.chdir(root);
execFileSync(process.execPath,['node_modules/expo/bin/cli','export','--platform','web','--output-dir','dist-pwa'],{stdio:'inherit',env:{...process.env,CI:'1',EXPO_NO_TELEMETRY:'1'}});
const out=path.join(root,'dist-pwa');
for(const size of [180,192,512]){const {source}=await require('@expo/image-utils').generateImageAsync({projectRoot:root},{src:path.join(root,'assets/icon.png'),width:size,height:size,resizeMode:'contain',backgroundColor:'#F2F2F7'});fs.writeFileSync(path.join(out,size===180?'apple-touch-icon.png':`icon-${size}.png`),source);}
fs.writeFileSync(path.join(out,'manifest.webmanifest'),JSON.stringify({name:'myBody',short_name:'myBody',lang:'zh-CN',start_url:'./',scope:'./',display:'standalone',background_color:'#F2F2F7',theme_color:'#F2F2F7',icons:[192,512].map(size=>({src:`icon-${size}.png`,sizes:`${size}x${size}`,type:'image/png'}))}));
let html=fs.readFileSync(path.join(out,'index.html'),'utf8').replace('<html lang="en">','<html lang="zh-CN">').replace('</head>','<link rel="manifest" href="./manifest.webmanifest"><link rel="apple-touch-icon" href="./apple-touch-icon.png"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="theme-color" content="#F2F2F7"><style>html,body,#root{height:100%;height:100dvh}body{margin:0}input{color-scheme:light dark}#root{max-width:900px;margin:auto}button{font:inherit;padding:12px;border-radius:10px;cursor:pointer}</style></head>');fs.writeFileSync(path.join(out,'index.html'),html);
fs.writeFileSync(path.join(out,'_headers'),'/sw.js\n  Cache-Control: no-cache\n/index.html\n  Cache-Control: no-cache\n/manifest.webmanifest\n  Cache-Control: no-cache\n');
function files(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(path.join(dir,e.name)):[path.join(dir,e.name)]);}
const assets=files(out).filter(f=>!['_headers','sw.js'].includes(path.basename(f))).map(f=>path.relative(out,f).split(path.sep).join('/'));
const version=crypto.createHash('sha256').update(assets.map(f=>fs.readFileSync(path.join(out,f))).reduce((a,b)=>Buffer.concat([a,b]),Buffer.alloc(0))).digest('hex').slice(0,16);
fs.writeFileSync(path.join(out,'sw.js'),`const CACHE='mybody-shell-${version}',ASSETS=${JSON.stringify(['./',...assets.filter(f=>f!=='index.html').map(f=>'./'+f)])};
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS))));
self.addEventListener('message',e=>{if(e.data==='ACTIVATE')self.skipWaiting()});
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('mybody-shell-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET'||new URL(e.request.url).origin!==self.location.origin)return;e.respondWith(caches.open(CACHE).then(async c=>{const hit=await c.match(e.request);if(hit)return hit;if(e.request.mode==='navigate')return (await c.match('./'))||fetch(e.request);return fetch(e.request)}))});
`);
const all=files(out);if(all.length>1000||all.some(f=>fs.statSync(f).size>25*1024*1024))throw new Error('超过 Cloudflare 拖拽上传限制');
console.log(`PWA ${version}: ${all.length} files ready in dist-pwa`);

}
main().catch(e=>{console.error(e);process.exitCode=1;});
