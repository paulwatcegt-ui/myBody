const fs=require('node:fs'),path=require('node:path');
const lock=JSON.parse(fs.readFileSync('package-lock.json','utf8')),notices=[];
for(const [relative,p] of Object.entries(lock.packages)){
 if(!relative||p.dev)continue;
 const file=path.join(relative,'package.json');if(!fs.existsSync(file))continue;
 const meta=JSON.parse(fs.readFileSync(file,'utf8'));
 const licenseFile=['LICENSE','LICENSE.md','LICENSE.txt','license','license.md','COPYING'].map(n=>path.join(relative,n)).find(f=>fs.existsSync(f)&&fs.statSync(f).isFile());
 notices.push({name:meta.name,version:meta.version,license:meta.license??p.license??'见软件包原始声明',copyrightAndLicense:licenseFile?fs.readFileSync(licenseFile,'utf8'):null});
}
const unique=[...new Map(notices.map(n=>[n.name+'@'+n.version,n])).values()].sort((a,b)=>a.name.localeCompare(b.name));
fs.writeFileSync('THIRD_PARTY_NOTICES.json',JSON.stringify(unique,null,2)+'\n');
console.log(`Included ${unique.length} third-party notices`);
