const fs=require('node:fs'),path=require('node:path'),{zipSync}=require('fflate'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const exclude=new Set(['.git','.tooling','.verification','node_modules','delivery','android','ios','.expo','dist']);
const files={};
function walk(dir,prefix=''){
 for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
  if(exclude.has(entry.name)||entry.isSymbolicLink())continue;
  const relative=prefix+entry.name,full=path.join(dir,entry.name);
  if(entry.isDirectory())walk(full,relative+'/');else if(entry.isFile())files[relative]=new Uint8Array(fs.readFileSync(full));
 }
}
walk(root);fs.mkdirSync(path.join(root,'delivery'),{recursive:true});
const target=path.join(root,'delivery/myBody-0.5.0-source.zip');fs.writeFileSync(target,zipSync(files,{level:6}));
const sums=fs.readdirSync(path.join(root,'delivery')).filter(n=>/\.(apk|zip)$/.test(n)).map(n=>`${crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'delivery',n))).digest('hex')}  ${n}`).join('\n')+'\n';
fs.writeFileSync(path.join(root,'delivery/SHA256SUMS.txt'),sums);console.log(`Source archive: ${Object.keys(files).length} files`);
