// Keep native dependency paths on one drive when Windows uses a subst alias.
// React Native codegen cannot relativize a D: dependency against an M: project.
const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const root=process.env.MYBODY_BUILD_ROOT||process.cwd(),real=process.env.MYBODY_PROJECT_ROOT||fs.realpathSync(root);
const args=process.argv.length>2?process.argv.slice(2):['react-native-config','--platform','android','--json'];
const raw=execFileSync(process.execPath,['--no-warnings','--eval',"require('expo/bin/autolinking')",'expo-modules-autolinking',...args],{cwd:real,encoding:'utf8'});
let value;try{value=JSON.parse(raw);}catch{process.stdout.write(raw);process.exit(0);}
function normalize(v){
 if(typeof v==='string'){
  const forward=v.replace(/\\+/g,'/'),base=real.replace(/\\+/g,'/').replace(/\/$/,'');
  if(forward===base||forward.startsWith(base+'/'))return root.replace(/\\/g,'/').replace(/\/$/,'')+forward.slice(base.length);
  return v;
 }
 if(Array.isArray(v))return v.map(normalize);
 if(v&&typeof v==='object')return Object.fromEntries(Object.entries(v).map(([k,x])=>[k,normalize(x)]));
 return v;
}
process.stdout.write(JSON.stringify(normalize(value)));
